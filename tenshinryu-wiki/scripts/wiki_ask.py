"""Wiki Q&A proxy — RAG over search-index.json via Gemini Flash.

Run locally:
  doppler run --project dojopop --config prd_zorie -- \\
    env WIKI_SEARCH_INDEX=dist/assets/search-index.json \\
    uv run --project tenshinryu-wiki uvicorn scripts.wiki_ask:app --reload --port 8088

Production: sidecar in tenshinryu-wiki/docker-compose.yml (nginx → /api/ask).
"""

from __future__ import annotations

import json
import os
import re
import time
import unicodedata
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

APP = FastAPI(title="Tenshinryu Wiki Ask", version="0.1.0")

SEARCH_INDEX_PATH = Path(
    os.getenv("WIKI_SEARCH_INDEX", "/data/search-index.json")
)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# Ordered fallback chain: tried in sequence when a model returns 429 (quota)
# or 404 (retired/unsupported). 2.5 models have their own fresh free-tier
# quota buckets; the 2.0 models are kept last as legacy fallbacks.
_DEFAULT_MODEL_CHAIN = (
    "gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash-lite,gemini-2.0-flash"
)
# GEMINI_MODEL (single) still honored for backward-compat; prepended to the chain.
_primary_model = os.getenv("GEMINI_MODEL", "").strip()
_model_chain_raw = os.getenv("GEMINI_MODELS", _DEFAULT_MODEL_CHAIN)
GEMINI_MODELS: list[str] = []
for _m in ([_primary_model] if _primary_model else []) + _model_chain_raw.split(","):
    _m = _m.strip()
    if _m and _m not in GEMINI_MODELS:
        GEMINI_MODELS.append(_m)


def _gemini_url(model: str) -> str:
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
TOP_K = int(os.getenv("WIKI_ASK_TOP_K", "5"))
RATE_LIMIT = int(os.getenv("WIKI_ASK_RATE_LIMIT", "15"))  # per IP per hour
RATE_WINDOW_SEC = 3600

_index_cache: list[dict[str, Any]] | None = None
_index_mtime: float = 0.0
_rate: dict[str, deque[float]] = defaultdict(deque)

DISCLAIMER = {
    "en": "Study aid only — always train under a qualified instructor.",
    "ja": "学習補助です。必ず指導者のもとで稽古してください。",
    "es": "Solo ayuda de estudio — entrena siempre con un instructor cualificado.",
    "el": "Βοήθεια μελέτης μόνο — προπονηθείτε πάντα με εξειδικευμένο εκπαιδευτή.",
    "fr": "Aide à l'étude uniquement — entraînez-vous toujours avec un instructeur qualifié.",
    "de": "Nur Lernhilfe — trainieren Sie immer unter qualifizierter Anleitung.",
    "it": "Solo supporto allo studio — allenati sempre con un istruttore qualificato.",
}


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    lang: str = Field(default="en", pattern=r"^[a-z]{2}$")


class Citation(BaseModel):
    title: str
    url: str


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    disclaimer: str


def normalize(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text)
    stripped = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return stripped.lower()


def score_item(item: dict[str, Any], query: str) -> float:
    terms = [t for t in normalize(query).split() if t]
    if not terms:
        return 0.0
    title = normalize(item.get("title", ""))
    body = normalize(item.get("text", ""))
    relevance = 0.0
    matched = False
    for term in terms:
        if term in title:
            relevance += 100
            matched = True
        if term in body:
            relevance += 10
            matched = True
    if not matched:
        return 0.0
    return relevance + float(item.get("boost", 0)) * 0.01


def load_index() -> list[dict[str, Any]]:
    global _index_cache, _index_mtime
    if not SEARCH_INDEX_PATH.is_file():
        return []
    mtime = SEARCH_INDEX_PATH.stat().st_mtime
    if _index_cache is not None and mtime == _index_mtime:
        return _index_cache
    _index_cache = json.loads(SEARCH_INDEX_PATH.read_text(encoding="utf-8"))
    _index_mtime = mtime
    return _index_cache


def retrieve_chunks(question: str, lang: str, top_k: int = TOP_K) -> list[dict[str, Any]]:
    index = load_index()
    scored: list[tuple[float, dict[str, Any]]] = []
    for item in index:
        if item.get("lang") != lang or item.get("section") == "sources":
            continue
        s = score_item(item, question)
        if s > 0:
            scored.append((s, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:top_k]]


def check_rate_limit(client_ip: str) -> None:
    now = time.time()
    bucket = _rate[client_ip]
    while bucket and now - bucket[0] > RATE_WINDOW_SEC:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
    bucket.append(now)


def build_prompt(question: str, lang: str, chunks: list[dict[str, Any]]) -> str:
    lang_names = {
        "en": "English",
        "ja": "Japanese",
        "es": "Spanish",
        "el": "Greek",
        "fr": "French",
        "de": "German",
        "it": "Italian",
    }
    answer_lang = lang_names.get(lang, "English")
    if not chunks:
        excerpt_block = "(No matching wiki excerpts found.)"
    else:
        lines = []
        for i, c in enumerate(chunks, 1):
            lines.append(
                f"{i}. [{c['title']}]({c['url']}): {c.get('text', '')}"
            )
        excerpt_block = "\n".join(lines)

    return f"""You are a study assistant for the Tenshinryu Hyoho (天心流兵法) wiki.

Rules:
- Answer ONLY from the wiki excerpts below. Do not invent techniques or history.
- Write the answer in {answer_lang}.
- Keep answers concise (2–5 sentences for simple questions).
- When you use a fact, cite the wiki page title in parentheses, e.g. (Start Here).
- If excerpts are insufficient, say what is missing and suggest which wiki section to read.
- End with one short reminder to verify with a qualified instructor.

Wiki excerpts:
{excerpt_block}

Student question: {question.strip()}

Answer:"""


async def call_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Ask service not configured (missing GEMINI_API_KEY).",
        )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.25,
            "maxOutputTokens": 600,
        },
    }

    # Status codes worth trying the next model on:
    #   429 = quota exceeded, 404 = model retired/unsupported,
    #   500/503 = transient server error / high demand.
    _RETRYABLE = {429, 404, 500, 503}
    quota_hit = False
    transient_hit = False
    last_error = ""
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in GEMINI_MODELS:
            try:
                res = await client.post(
                    _gemini_url(model),
                    params={"key": GEMINI_API_KEY},
                    json=payload,
                )
            except httpx.RequestError as exc:
                transient_hit = True
                last_error = f"{model}: request error {exc!r}"[:200]
                continue
            if res.status_code == 200:
                data = res.json()
                try:
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
                except (KeyError, IndexError) as exc:
                    raise HTTPException(
                        status_code=502, detail="Unexpected Gemini response"
                    ) from exc
            if res.status_code in _RETRYABLE:
                if res.status_code == 429:
                    quota_hit = True
                elif res.status_code in (500, 503):
                    transient_hit = True
                last_error = f"{model}: HTTP {res.status_code}"
                continue
            # Non-retryable status (e.g. 400/401/403) — surface immediately.
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API error ({model} {res.status_code}): {res.text[:200]}",
            )

    # Exhausted the whole chain.
    if quota_hit and not transient_hit:
        raise HTTPException(
            status_code=503,
            detail="Ask service temporarily unavailable (API quota exceeded on all models). Try again later.",
        )
    if quota_hit or transient_hit:
        raise HTTPException(
            status_code=503,
            detail="Ask service temporarily busy (all models rate-limited or overloaded). Try again in a moment.",
        )
    raise HTTPException(
        status_code=502,
        detail=f"Ask service unavailable (no usable model: {last_error}).",
    )


@APP.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "index_path": str(SEARCH_INDEX_PATH),
        "index_loaded": SEARCH_INDEX_PATH.is_file(),
        "models": GEMINI_MODELS,
        "gemini_configured": bool(GEMINI_API_KEY),
    }


@APP.post("/api/ask", response_model=AskResponse)
async def ask(body: AskRequest, request: Request) -> AskResponse:
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    client_ip = client_ip.split(",")[0].strip()
    check_rate_limit(client_ip)

    question = re.sub(r"\s+", " ", body.question.strip())
    chunks = retrieve_chunks(question, body.lang)
    prompt = build_prompt(question, body.lang, chunks)
    answer = await call_gemini(prompt)

    citations = [
        Citation(title=c["title"], url=c["url"])
        for c in chunks
    ]
    disclaimer = DISCLAIMER.get(body.lang, DISCLAIMER["en"])
    return AskResponse(answer=answer, citations=citations, disclaimer=disclaimer)


app = APP
