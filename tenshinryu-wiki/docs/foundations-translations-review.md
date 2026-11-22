# Foundations study translations: review notes

## Scope

The German (`de`), Greek (`el`), Spanish (`es`), French (`fr`) and Italian (`it`) courses follow the Japanese foundations course:

- 21 steps per language, in the Japanese order.
- All 79 questions per language, with the Japanese answer positions preserved.
- A course index, 21 step pages and a completion page per language: 115 new pages, 395 translated questions.
- Localized reading guides, questions, choices, explanations, navigation and interactive status messages.

These are study translations and reading guides, not translations of the full book. The Japanese book text and the school's official English translation are linked and explicitly identified. Neither original course's Markdown has been changed.

## Source hierarchy

1. `wiki/ja/learn/foundations/` controls the structure, question coverage and answers.
2. The corresponding chapters of `wiki/ja/sources/shogakushu-2025/`, from the preface through chapter 22, are the primary book source.
3. The school's English `Foundations and Principles, Volume 1`, under `wiki/en/sources/kuwami-foundations-principles-vol1/`, supplies a terminology cross-reference and additional reading links.

The English book and course group several chapters differently. The language switch maps to the corresponding subject, rather than manufacturing an English URL with the Japanese step number. In particular, the English final step covers material split across Japanese steps 20 and 21.

The reading guides attribute historical and terminological claims to the book. They do not turn the school's account into a claim of independent historical verification, and they do not provide practical technical instruction.

## Points for school and language review

These are draft study translations. They have not received native-speaking subject review or approval from a school instructor. That review is recommended before publication, particularly for the specialist wording in steps 2, 8, 16 and 19.

- **Preface date:** the Japanese preface says 17 May, Reiwa 6 (2024). The existing English quiz says Reiwa 7 (2025). The new courses follow Japanese and make the difference visible; the English course has not been silently corrected.
- **Two Tokizawa names:** the official English book romanizes both 時沢弥兵衛 and 時沢弥平 as Tokizawa Yahei. The Japanese characters are retained to distinguish the family ancestor from the school founder.
- **Ten and ten:** 天 in the school's name refers, in the source's explanation, to shogunal and imperial authority. The distinct technical term ten is written 転. Both characters remain visible; 転 is not translated as the number ten.
- **Technical terms:** Shike, Den-i, Hyōhō, Sōden Inka, Jitsuden, Dattōhō, Setsunintō, Katsujinken and other specialist terms retain Japanese romanization. Explanatory glosses are not substitutes for an instructor's interpretation.
- **Hyōhō Hyakushu:** the verse in step 19 has a prose study gloss, explicitly not an official poetic translation.
- **Historical severity:** the account of Katsujinken, loyalty and household honor is preserved as a historical account, including aspects the source calls cruel by modern standards. It is not framed as present-day conduct guidance.

No new full-book translations are included. Any such edition should be a separate editorial project with school review.

## Verification

Run:

```sh
python scripts/build-site.py
python -m unittest discover -s tests -p 'test_learn_locales.py'
```

The static tests check page counts, all 79 questions per locale, answer-index parity with Japanese, four distinct choices per question, embedded quiz JSON, per-language progress keys, and actual destinations for the course and source links, including language switches.

Browser checks were also run for every translated step: incorrect answers, pass/unlock, completion gating, retake, reset, independent progress keys, and phone-width layout. Existing English and Japanese first-step checks were exercised as regression checks. Native-language and instructor review remain editorial work, not something the automated tests establish.
