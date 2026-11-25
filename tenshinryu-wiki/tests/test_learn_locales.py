"""Structure and link checks for the Japanese-aligned foundations translations.

Run after scripts/build-site.py:
    python -m unittest discover -s tests -p 'test_learn_locales.py'
"""
import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"
DIST = ROOT / "dist"
LOCALES = ("de", "el", "es", "fr", "it", "pt")
QUIZ = re.compile(r'<script[^>]+class="learn-quiz-data"[^>]*>(.*?)</script>', re.S)


class Links(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.hrefs = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("a", "link") and attrs.get("href"):
            self.hrefs.append(attrs["href"])


class FoundationsLocales(unittest.TestCase):
    def test_pages_questions_and_answers_match_japanese(self):
        originals = sorted((WIKI / "ja/learn/foundations").glob("step-*.md"))
        self.assertEqual(len(originals), 21)
        for lang in LOCALES:
            folder = WIKI / lang / "learn/foundations"
            self.assertEqual(len(list(folder.glob("*.md"))), 22)
            self.assertTrue(folder.with_suffix(".md").is_file())
            count = 0
            for source in originals:
                with self.subTest(lang=lang, step=source.stem):
                    source_questions = json.loads(QUIZ.search(source.read_text())[1])["questions"]
                    text = (folder / source.name).read_text()
                    self.assertIn("lang: " + lang, text)
                    self.assertIn('data-track="foundations-' + lang + '"', text)
                    self.assertNotIn('data-track="foundations-ja"', text)
                    self.assertNotIn("ZXQ", text)
                    self.assertNotIn("PT000TP", text)
                    self.assertNotIn("\u2014", text)
                    translated = json.loads(QUIZ.search(text)[1])["questions"]
                    self.assertEqual(len(translated), len(source_questions))
                    for ja, target in zip(source_questions, translated):
                        self.assertEqual(target["answer"], ja["answer"])
                        self.assertEqual(len(target["choices"]), 4)
                        self.assertEqual(len(set(target["choices"])), 4)
                        self.assertTrue(target["q"].strip())
                        self.assertTrue(target["ref"].strip())
                    count += len(translated)
            self.assertEqual(count, 79)

    def test_generated_links_and_quiz_json(self):
        self.assertTrue(DIST.is_dir(), "Build the site first")
        for lang in ("en", "ja", *LOCALES):
            files = list((DIST / lang / "learn/foundations").glob("*.html"))
            files.append(DIST / lang / "learn/foundations.html")
            for page in files:
                with self.subTest(page=page):
                    text = page.read_text()
                    quiz = QUIZ.search(text)
                    if quiz:
                        json.loads(quiz[1])
                    for href in Links(text).hrefs:
                        if not href.startswith("/"):
                            continue
                        if "/learn/" not in href and "/sources/" not in href:
                            continue
                        target = DIST / href.split("#")[0].lstrip("/")
                        if href.endswith("/"):
                            target /= "index.html"
                        elif not target.suffix:
                            target = target.with_suffix(".html")
                        self.assertTrue(target.is_file(), f"{page}: {href}")



class DenNoIchiILocales(unittest.TestCase):
    """European study translations of the Den no Ichi-i track, derived from the English edition."""

    def test_pages_questions_and_answers_match_english(self):
        originals = sorted((WIKI / "en/learn/den-no-ichi-i").glob("step-*.md"))
        self.assertEqual(len(originals), 14)
        for lang in LOCALES:
            folder = WIKI / lang / "learn/den-no-ichi-i"
            self.assertEqual(len(list(folder.glob("*.md"))), 15)
            self.assertTrue(folder.with_suffix(".md").is_file())
            for source in originals:
                with self.subTest(lang=lang, step=source.stem):
                    source_questions = json.loads(QUIZ.search(source.read_text())[1])["questions"]
                    text = (folder / source.name).read_text()
                    self.assertIn("lang: " + lang, text)
                    self.assertIn('data-track="den-no-ichi-i-' + lang + '"', text)
                    self.assertNotIn("\u2014", text)
                    translated = json.loads(QUIZ.search(text)[1])["questions"]
                    self.assertEqual(len(translated), len(source_questions))
                    for en, target in zip(source_questions, translated):
                        self.assertEqual(target["answer"], en["answer"])
                        self.assertEqual(len(target["choices"]), 4)
                        self.assertEqual(len(set(target["choices"])), 4)
                        self.assertTrue(target["q"].strip())
                        self.assertTrue(target["ref"].strip())

    def test_language_switcher_pairs_the_track(self):
        self.assertTrue(DIST.is_dir(), "Build the site first")
        for lang in ("en", *LOCALES):
            for other in ("en", *LOCALES):
                if other == lang:
                    continue
                page = DIST / lang / "learn/den-no-ichi-i/step-06-tsuka-uchi.html"
                self.assertIn(f"/{other}/learn/den-no-ichi-i/step-06-tsuka-uchi", page.read_text())


class DenNoIchiIJapanese(unittest.TestCase):
    """Japanese original text and track: the Japanese is the prime source for the book."""

    def test_book_pages_match_english_structure(self):
        en = sorted((WIKI / "en/sources/den-no-ichi-i").glob("ch-*.md"))
        ja = sorted((WIKI / "ja/sources/den-no-ichi-i").glob("ch-*.md"))
        self.assertEqual([p.name for p in en], [p.name for p in ja])
        for page in ja:
            text = page.read_text(encoding="utf-8")
            self.assertIn("lang: ja", text)
            self.assertIn("pair: en/sources/den-no-ichi-i/" + page.stem, text)
            self.assertGreater(len(text), 400)

    def test_extraction_numbers_are_not_reversed(self):
        # Two-digit numbers set horizontally in vertical text come out reversed in the PDF text layer.
        text = (WIKI / "ja/sources/den-no-ichi-i/ch-19-afterword.md").read_text(encoding="utf-8")
        self.assertIn("47％", text)
        self.assertNotIn("74％", text)

    def test_track_has_14_steps_with_matching_answer_indexes(self):
        originals = sorted((WIKI / "en/learn/den-no-ichi-i").glob("step-*.md"))
        folder = WIKI / "ja/learn/den-no-ichi-i"
        self.assertEqual(len(list(folder.glob("*.md"))), 15)
        for source in originals:
            with self.subTest(step=source.stem):
                text = (folder / source.name).read_text(encoding="utf-8")
                self.assertIn('data-track="den-no-ichi-i-ja"', text)
                questions = json.loads(QUIZ.search(text)[1])["questions"]
                self.assertEqual(len(questions), 3)
                for q in questions:
                    self.assertEqual(len(q["choices"]), 4)
                    self.assertEqual(len(set(q["choices"])), 4)
                    self.assertTrue(q["q"].strip() and q["ref"].strip())

    def test_switcher_pairs_japanese_book_and_track(self):
        self.assertTrue(DIST.is_dir(), "Build the site first")
        page = DIST / "en/learn/den-no-ichi-i/step-06-tsuka-uchi.html"
        self.assertIn("/ja/learn/den-no-ichi-i/step-06-tsuka-uchi", page.read_text())
        page = DIST / "en/sources/den-no-ichi-i/ch-07-tsuka-uchi.html"
        self.assertIn("/ja/sources/den-no-ichi-i/ch-07-tsuka-uchi", page.read_text())


if __name__ == "__main__":
    unittest.main()
