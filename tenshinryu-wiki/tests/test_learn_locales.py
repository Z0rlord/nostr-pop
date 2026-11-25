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
LOCALES = ("de", "el", "es", "fr", "it")
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

if __name__ == "__main__":
    unittest.main()
