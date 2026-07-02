---
slug: synthesis
lang: en
title: "Synthesis"
pair: ja/synthesis
tags: ['synthesis']
sources:
updated: 2026-07-02
---
# Synthesis

How the major hubs of this wiki fit together — a cross-topic map for readers, instructors, and future ingest.

## Core curriculum — 12 seihō & miden kurai

[[techniques/tachiai-12-kata]] is the advanced **battojutsu** standing-draw curriculum: twelve **seihō** (勢法) taught as paired standing forms. Each seiho page links to kata photos from Drive-synced assets under `raw/assets/tachiai-12-kata/`.

| # | Seihō | Notes |
|---|-------|-------|
| 1 | [[techniques/tachiai-12-kata/omokage\|Omokage 面陰]] | Hidden name *Sansetsuken*; defensive **boto** type |
| 2 | [[techniques/tachiai-12-kata/nukiai\|Nukiai 抜合]] | Mutual draw; historically taught first |
| 3 | [[techniques/tachiai-12-kata/nukidome\|Nukidome 抜留]] | Also **Bakuchiken** (驀地剣) |
| 4 | [[techniques/tachiai-12-kata/makihazushi\|Makihazushi / Makiotoshi 巻外・巻落]] | Hidden name *Tsukikage*; **boto** kesagake defense |
| 5 | [[techniques/tachiai-12-kata/yokemigaeshi\|Yokemigaeshi / Nigemigaeshi 避身返・逃身返]] | Hidden name *Nawatedachi*; rice-path scenario |
| 6 | [[techniques/tachiai-12-kata/sodegaeshi\|Sodegaeshi 袖返]] | Hidden name *Nowakedachi*; self-defense + assassination |
| 7 | [[techniques/tachiai-12-kata/shihogiri\|Shihogiri 四方切]] | Hidden names *Shigaramidachi*, *Kesamidare*; four enemies |
| 8 | [[techniques/tachiai-12-kata/gyakuto\|Gyakuto 逆刀]] | Hidden names *Tsukaotoshimogaridachi*, *Gyakubatsugaeshi*; close range / hilt grab |
| 9 | [[techniques/tachiai-12-kata/marukibashi\|Marukibashi 丸木橋]] | Hidden names *Inyoisso*, *Hazamagaeshi*; suspension bridge |
| 10 | [[techniques/tachiai-12-kata/ninotachigaeshi\|Ninotachigaeshi 二ノ太刀返]] | Hidden names *Motsuredachi*, *Tachiaikiridomenokoto*; shin attack → head feint |
| 11 | [[techniques/tachiai-12-kata/karamegaeshi\|Karamegaeshi 絡返]] | Hidden names *Fudokaramedachi*, *Koshiguruma*; horizontal cut |
| 12 | [[techniques/tachiai-12-kata/kesagake-no-koto\|Kesagake-no-koto 袈裟懸ノ事]] | Hidden name *Raiun*; attack + defense |

Common finishing uses [[concepts/miden-kurai-no-koto|miden kurai]] — especially **Kumoi**, **Sekiun**, and **Seigan** stances documented across [[concepts/kurai/ten-no-kurai|35 individual kurai pages]] (Ten / Shin / Chi tiers + Sanmi bodies).

Standalone technique intros (video articles) complement the book curriculum:

- [[techniques/fusa-otoshi]] — close-range draw
- [[techniques/chochin-barai]] — draw without catching a lantern
- [[techniques/zanuke]] — strike from behind without showing the blade
- [[techniques/tousen-niraminuki]] — large-sword feint draw
- [[techniques/bakuchiken]] → [[techniques/tachiai-12-kata/nukidome]]

Concept pages: [[concepts/seiho]], [[concepts/tachiai]], [[concepts/kurai/fundamentals]].

## Pedagogy & instructor path

[[guides/teaching-beginners]] — Kuwami Masakumo's short guide for group and individual beginner instruction.

[[guides/instructor-3rd-grade]] — four-volume **3rd-grade instructor** certification text:

| Vol | Page | Topic |
|-----|------|-------|
| I | [[guides/instructor-3rd-grade/vol-1-conditions]] | Conditions for instructors |
| II | [[guides/instructor-3rd-grade/vol-2-training-flow]] | Training flow |
| III | [[guides/instructor-3rd-grade/vol-3-principles]] | Principles |
| IV | [[guides/instructor-3rd-grade/vol-4-beginners]] | Teaching beginners (expanded) |

Philosophy essays reinforce this path: [[philosophy/onko-chishin]] (温故知新 — learn the school's recipe before improvising), [[philosophy/spirit-of-chugi]] (忠義 — chūgi and Hagakure, Kuwami Shike), [[philosophy/student-improvement]], [[philosophy/correcting-mistakes]]. Consistent with [[dojo/shinanjo-tradition]] — transmission halls (*shinanjo* 指南所) over mere group drill.

## Lineage & organization

```
[[history/overview]] → [[history/instructors]] → Shike line
```

| Generation | Person | Page |
|------------|--------|------|
| 8th | Ishii Seizo | [[history/instructors]] |
| 9th | Nakamura Tenshin (天心 bugō) | [[people/nakamura-tenshin]] |
| 10th | Kuwami Masakumo | [[people/kuwami-masakumo]] |
| 11th | Ide Ryusetsu | [[people/ide-ryusetsu]] |

Modern **Kanto** practice: [[dojo/overview]] — Honbu and seven branch pages. International transmission via Tenshinryu ONLINE / KIWAMI runs parallel to dojo tradition (see [[overview]]).

## Reiho & culture

[[reiho/_index]] — sageo, kesa, tabi, tekō, keiko osame, dojo movement, technique of respect, traditional costume.

[[articles/p-29]] — **bugō** (武号) naming culture; explains Nakamura Tenshin's martial name and Kuwami's surname adoption.

[[philosophy/]] — thought essays from international.tenshinryu.net and instructor community (datsuryoku, kata culture, [[philosophy/spirit-of-chugi|chūgi / Hagakure]], nature worship, tradition vs change, …).

## External resources

Official channels outside this wiki:

- [Tenshinryu ONLINE / KIWAMI](https://tenshinryu.xyz) — scheduled online keiko and member curriculum
- [Tenshinryu YouTube](https://www.youtube.com/@tenshinryu/featured) — public lessons, technique demos, and event streams
- [international.tenshinryu.net](https://international.tenshinryu.net/) — federation branches and announcements
- [[community/tenshinryu-hyoho-facebook|Tenshinryu Hyoho Official Community (Facebook)]] — private members forum

## Sources & maintenance

- Raw clips: `raw/web/` (286 pages) + `raw/books/` (12 Kata, Miden, instructor text)
- Each ingested page cites `sources:` frontmatter → [[sources|Sources]] catalog
- After bulk edits: `uv run python scripts/lint-wiki-lang.py` then `scripts/build-site.py`

日本語: [../ja/synthesis.md](../ja/synthesis.md)
