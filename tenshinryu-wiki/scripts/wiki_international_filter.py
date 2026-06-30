"""Shared rules for skipping low-value international.tenshinryu.net wiki sources."""

from __future__ import annotations

import re

# Curated source summaries worth keeping in wiki/*/sources/
INTERNATIONAL_KEEP_SOURCES = frozenset(
    {
        "international-tenshinryu-net-home",
        "international-tenshinryu-net-history",
    }
)

# Site chrome / nav menu lines scraped into takeaways
NAV_MENU_LINES = frozenset(
    {
        "Tsukamaki-Shi Yagura",
        "History",
        "Masters",
        "Foreign residents in Japan",
        "Foreign DOJO",
        "Invitation Guide",
        "Admission Guide",
        "Notes",
        "Donate",
        "Contact info",
        "JAPAN DOJO",
        "Seminar",
        "Seminar/Work result",
        "Seminar Schedule",
        "FAQ",
        "カテゴリー",
        "タグ",
        "検索",
        "CLOSE",
        "HOME",
        "Movie",
    }
)

BOILERPLATE_RE = re.compile(
    r"^(?:HOME|CLOSE|キーワード|カテゴリー|タグ|検索|Prev|Next|Private:|"
    r"Introduction of technique|Thought|Tenshinryu Knowledge|"
    r"Japanese Culture|Martial Arts Culture|Movie|NEWS|Seminar|"
    r"A Guide to Learning|TENSHINRYU ONLINE|What Is Tenshinryu).*$",
    re.I,
)

WEB_SKIP_FRAGMENTS = (
    "online-study-with-takizawa",
    "for-creators",
    "ten-years-since-trademark",
    "online-lessons-in-english",
    "tenshinryu-e-dojo",
    "leccion-online",
    "tenshinryu-online-monthly",
    "30-minutes-practice",
    "-keikokai",
    "-branch",
    "australia-seminar",
    "spain-branch",
    "italy-branch",
    "russia-keikokai",
    "france-keikokai",
    "mexico-keikokai",
    "germany-keikokai",
    "greek-keikokai",
    "austria-keikokai",
    "movie",
    "event",
    "news",
    "seminar",
    "invitation-guide",
    "admission-guide",
    "donate",
    "contact-info",
    "faq",
    "foreign-dojo",
    "foreign-residents",
    "japan-dojo",
    "seminar-schedule",
    "seminar-work-result",
    # Online / virtual-dojo announcements, trailers, schedules
    "tenshinryu-vd",
    "jsttenshinryu-vd",
    "online-practic",
    "online-training",
    "tenshinryu-online",
    "virtual-dojo",
    "tommrows-virtual-dojo",
    "tomorrows-virtual-dojo",
    "weekly-schedule",
    "you-tube-tenshinryu-membership",
    "official-youtube",
    "official-fan-goods",
    "combat-maid",
    "merry-christmas",
    "hello-world",
    "ghost-of-tsushima",
    "fire-at-notre-dame",
    "embu-en-fiaco",
    "niji-no-hashikake",
    "birds-eye-point",
    "explanation-of-the-shape-of-the-hand",
    "takizawa-senseis-lecture",
    "takizawa-dofu",
    "online-drinking-party",
    "cultural-lecture-by-sensei",
    "sing-tao-daily",
    "arakawa-ganryu",
    "announcement-ef-bd-9e",
    "feb-25-tenshinryu",
    "headquarters-practice",
    "hyoho-italy",
    "first-dvd-has-been",
    "normal-version-of-tenshinryu",
    "shibukan-ninpo",
    "australia-samurai-dojo",
    "shinjyuku-practice",
    "trailer-e3-80-91",
    "rensai-pv",
)

# raw/web slug fragment → entity path (content lives on entity page, not sources/)
WEB_ENTITY_FRAGMENTS = frozenset(
    {
        "fusa-otoshi",
        "fukuro-jinai",
        "nedachi",
        "tekoa",
        "kesa",
        "keiko-osame",
        "about-the-sageo",
        "how-to-wear-tabi",
        "regarding-movement-inside-the-dojo",
        "the-technique-of-respect",
        "a-scene-of-sewing",
        "traditional-costume-photo-album",
        "onko-chishin",
        "datsuryoku",
        "hold-pride-that-is-not-arrogance",
        "to-make-a-mistake-and-not-correct-it",
        "a-discussion-on-apologies",
        "a-concern-is-that-students-are-not-improving",
        "lets-be-careful-our-words-build-our-character",
        "doubts-about-changes-in-tradition",
        "a-message-to-all-tenshin-ryu-practitioners",
        "the-culture-of-kataforms-in-japan",
        "nature-worship-and-the-spirit-of-respect",
        "misunderstandings-and-problems-of-japanese-traditional-martial-arts",
        "1795",
        "1937-2",
        "koran-to",
        "chochin-barai",
        "zanuke",
        "tousen-niraminuki",
        "bakuchiken",
    }
)


def match_entity_fragment(stem: str) -> str | None:
    for frag in WEB_ENTITY_FRAGMENTS:
        if frag in stem:
            return frag
    return None


def nav_ratio_in_takeaways(text: str) -> float:
    m = re.search(r"## (?:Key takeaways|要点)\n\n(.*?)(?:\n\n## |\Z)", text, re.S)
    if not m:
        return 1.0
    takeaways = m.group(1)
    lines = [ln.lstrip("- ").strip() for ln in takeaways.splitlines() if ln.strip().startswith("-")]
    if not lines:
        return 1.0
    nav = 0
    for ln in lines:
        base = ln.split("│")[0].strip().strip('"').strip("'").strip("“").strip("”")
        if BOILERPLATE_RE.match(base) or base in NAV_MENU_LINES:
            nav += 1
        elif len(base) < 30 and not any(c.isdigit() for c in base):
            nav += 1
    return nav / len(lines)


def international_source_removal_reason(stem: str, page_text: str | None = None) -> str | None:
    """Return removal reason, or None if the wiki source page should be kept."""
    if stem in INTERNATIONAL_KEEP_SOURCES:
        return None
    if not stem.startswith("international-tenshinryu-net-"):
        return None
    for frag in WEB_SKIP_FRAGMENTS:
        if frag in stem:
            return f"skip_fragment:{frag}"
    entity = match_entity_fragment(stem)
    if entity:
        return f"entity_mapped:{entity}"
    # Numeric WP post IDs for online-lesson stubs (e.g. international-tenshinryu-net-601)
    suffix = stem.removeprefix("international-tenshinryu-net-")
    if suffix.isdigit():
        return "numeric_online_lesson_stub"
    if page_text is not None and nav_ratio_in_takeaways(page_text) >= 0.5:
        return "nav_heavy_takeaways"
    return None


def should_skip_international_wiki_source(stem: str, page_text: str | None = None) -> bool:
    return international_source_removal_reason(stem, page_text) is not None
