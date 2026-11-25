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

try:  # flat layout in the container, package layout when run from the repo
    from wiki_progress import router as _progress_router
except ImportError:  # pragma: no cover
    from scripts.wiki_progress import router as _progress_router
APP.include_router(_progress_router)

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


STOPWORDS_EN = set(
    "a an the is are was were be been being what which who whom whose when "
    "where why how do does did doing can could should would will shall may "
    "might must i me my you your he his she her it its we our they their of "
    "in on at to for with by from as and or but if then than so not no this "
    "that these those there here about into over under between mean means "
    "meaning explain tell please does do".split()
)

CJK_RE = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")


def stem_en(term: str) -> str:
    """Very light English stemming so 'holding' also matches 'hold'."""
    if CJK_RE.search(term):
        return term
    if term.endswith("ies") and len(term) > 4:
        return term[:-3] + "y"
    for suf in ("ing", "es", "ed", "s"):
        if term.endswith(suf) and len(term) > len(suf) + 2:
            return term[: -len(suf)]
    return term


def query_terms(question: str) -> tuple[list[str], list[str]]:
    """Split a question into content terms plus CJK bigrams.

    English questions carry stopwords that drown real matches; Japanese
    questions have no spaces, so whitespace tokens fail entirely. Bigrams
    over the CJK characters give Japanese (and mixed) queries something
    that can actually match page text.
    """
    norm = normalize(question)
    terms: list[str] = []
    for tok in norm.split():
        tok = tok.strip(".,!?;:()[]\"'")
        if not tok:
            continue
        if CJK_RE.search(tok):
            terms.append(tok)
        elif tok not in STOPWORDS_EN and len(tok) > 1:
            terms.append(tok)
            stem = stem_en(tok)
            if stem != tok and stem not in terms:
                terms.append(stem)
    cjk = "".join(CJK_RE.findall(norm))
    bigrams = [cjk[i : i + 2] for i in range(len(cjk) - 1)]
    if cjk and not bigrams:
        terms.append(cjk)  # single CJK character query
    return terms, bigrams


def score_item(item: dict[str, Any], terms: list[str], bigrams: list[str]) -> float:
    if not terms and not bigrams:
        return 0.0
    title = normalize(item.get("title", ""))
    body = normalize(item.get("text", ""))
    relevance = 0.0
    matched = False
    for term in terms:
        if term in title:
            relevance += 100
            matched = True
        elif term in body:
            relevance += 10
            matched = True
    bigram_score = 0.0
    for bg in bigrams:
        if bg in title:
            bigram_score += 30
            matched = True
        elif bg in body:
            bigram_score += 3
            matched = True
    relevance += min(bigram_score, 150.0)
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


KODEN_NOTE = {
    "en": "Confidential teaching (koden). Name the page and its general subject only; direct the student to their instructor for the content.",
    "ja": "門外不出の伝授内容です。ページ名と概要のみ案内し、内容は指導者に確認するよう促してください。",
    "es": "Enseñanza confidencial (koden). Nombra solo la página y su tema general; remite al estudiante a su instructor.",
    "el": "Εμπιστευτική διδασκαλία (koden). Αναφέρετε μόνο τη σελίδα και το γενικό θέμα· παραπέμψτε τον μαθητή στον δάσκαλό του.",
    "fr": "Enseignement confidentiel (koden). Nommez uniquement la page et son sujet général ; renvoyez l'élève vers son instructeur.",
    "de": "Vertrauliche Lehre (Koden). Nennen Sie nur die Seite und ihr allgemeines Thema; verweisen Sie den Schüler an seinen Lehrer.",
    "it": "Insegnamento riservato (koden). Nomina solo la pagina e il suo argomento generale; rimanda lo studente al suo istruttore.",
}

CORRECTION_RE = re.compile(
    r"(am i (doing|holding|standing|sitting)|is my \w+ (correct|right|ok)|"
    r"correct (my|me)|check my (form|posture|grip|stance)|"
    r"fix my (form|posture|grip|stance)|"
    r"できていますか|合っていますか|正しいですか|直してください|見てください)",
    re.IGNORECASE,
)

CORRECTION_LINE = {
    "en": "I can't judge form or correct technique — please confirm with your instructor.",
    "ja": "型や技の正誤を判断することはできません。必ず指導者に確認してください。",
    "es": "No puedo juzgar la forma ni corregir la técnica; confírmalo con tu instructor.",
    "el": "Δεν μπορώ να κρίνω τη φόρμα ή να διορθώσω τεχνική· επιβεβαιώστε με τον δάσκαλό σας.",
    "fr": "Je ne peux ni juger la forme ni corriger la technique — confirmez avec votre instructeur.",
    "de": "Ich kann Form oder Technik nicht beurteilen — bitte bestätigen Sie dies mit Ihrem Lehrer.",
    "it": "Non posso valutare la forma né correggere la tecnica: conferma con il tuo istruttore.",
}


def retrieve_chunks(question: str, lang: str, top_k: int = TOP_K) -> list[dict[str, Any]]:
    index = load_index()
    terms, bigrams = query_terms(question)
    scored: list[tuple[float, dict[str, Any]]] = []
    for item in index:
        if item.get("lang") != lang:
            continue
        if item.get("section") == "sources" and not item.get("book"):
            continue
        s = score_item(item, terms, bigrams)
        if item.get("section") == "articles":
            s -= 40.0  # blog posts lose to curated pages and book chapters
        if s > 0:
            scored.append((s, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    results: list[dict[str, Any]] = []
    for _, item in scored[:top_k]:
        if item.get("koden"):
            item = dict(item)
            item["text"] = KODEN_NOTE.get(lang, KODEN_NOTE["en"])
        results.append(item)
    return results


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
- Never quote more than 25 words verbatim from any single source; paraphrase and cite instead.
- If the student asks whether they are doing something correctly, or asks you to judge or correct their form, posture, grip, or technique, do not evaluate or correct them: point to the relevant passage and tell them to confirm with their instructor.
- Excerpts marked as confidential teaching (koden) must only be named, never explained; direct the student to their instructor.
- When an excerpt comes from one of the school books, name the book and chapter so the student knows what to read.
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

    if CORRECTION_RE.search(question):
        answer = answer + "\n\n" + CORRECTION_LINE.get(body.lang, CORRECTION_LINE["en"])

    seen_urls: set[str] = set()
    citations: list[Citation] = []
    for c in chunks:
        if c["url"] in seen_urls:
            continue
        seen_urls.add(c["url"])
        citations.append(Citation(title=c["title"].split(" · ")[0], url=c["url"]))
    disclaimer = DISCLAIMER.get(body.lang, DISCLAIMER["en"])
    return AskResponse(answer=answer, citations=citations, disclaimer=disclaimer)


app = APP
