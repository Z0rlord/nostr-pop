#!/usr/bin/env python3
"""Write translated hub pages for fr, de, it (skipped by scaffold-locale.py)."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"
ES = WIKI / "es"

# Section header replacements when adapting es/index.md
INDEX_TR = {
    "fr": {
        "## Panorama general": "## Vue d'ensemble",
        "| Página | Resumen |": "| Page | Résumé |",
        "## Historia y linaje": "## Histoire et lignée",
        "## Artes": "## Arts",
        "## Técnicas": "## Techniques",
        "## Conceptos": "## Concepts",
        "## Personas": "## Personnes",
        "## Dōjō (Japón)": "## Dōjō (Japon)",
        "## Reihō y cultura": "## Reihō et culture",
        "## Filosofía": "## Philosophie",
        "## Guías (instrucción)": "## Guides (instruction)",
        "## Artículos de tenshinryu.net": "## Articles tenshinryu.net",
        "## Fuentes": "## Sources",
        "## Archivos raw ingeridos": "## Fichiers bruts ingérés",
        "(español)": "(français)",
        "Base de conocimiento estructurada": "Base de connaissances structurée",
        "Mantenida por ingestión LLM desde fuentes oficiales; revisada por humanos.":
        "Maintenue par ingestion LLM depuis des sources officielles ; relue par des humains.",
        "Otros idiomas:": "Autres langues :",
        "[inglés]": "[anglais]",
        "[japonés]": "[japonais]",
        "[griego]": "[grec]",
        "artículos en japonés": "articles en japonais",
        "archivo completo del blog": "archive complète du blog",
        "Archivo del blog": "Archives du blog",
        "Más de 150 resúmenes de fuentes": "Plus de 150 résumés de sources",
        "catálogo de archivos raw ingeridos": "catalogue des fichiers bruts ingérés",
        "páginas recortadas": "pages extraites",
        "fotos de referencia de kata + imágenes promocionales":
        "photos de référence kata + images promotionnelles",
    },
    "de": {
        "## Panorama general": "## Überblick",
        "| Página | Resumen |": "| Seite | Zusammenfassung |",
        "## Historia y linaje": "## Geschichte & Linie",
        "## Artes": "## Künste",
        "## Técnicas": "## Techniken",
        "## Conceptos": "## Konzepte",
        "## Personas": "## Personen",
        "## Dōjō (Japón)": "## Dōjō (Japan)",
        "## Reihō y cultura": "## Reihō & Kultur",
        "## Filosofía": "## Philosophie",
        "## Guías (instrucción)": "## Leitfäden (Unterricht)",
        "## Artículos de tenshinryu.net": "## tenshinryu.net-Artikel",
        "## Fuentes": "## Quellen",
        "## Archivos raw ingeridos": "## Eingespielte Rohdateien",
        "(español)": "(Deutsch)",
        "Base de conocimiento estructurada": "Strukturierte Wissensbasis",
        "Mantenida por ingestión LLM desde fuentes oficiales; revisada por humanos.":
        "LLM-Ingest aus offiziellen Quellen; menschlich geprüft.",
        "Otros idiomas:": "Weitere Sprachen:",
        "[inglés]": "[Englisch]",
        "[japonés]": "[Japanisch]",
        "[griego]": "[Griechisch]",
        "artículos en japonés": "japanische Artikel",
        "archivo completo del blog": "vollständiges Blog-Archiv",
        "Archivo del blog": "Blog-Archiv",
        "Más de 150 resúmenes de fuentes": "Über 150 Quellenzusammenfassungen",
        "catálogo de archivos raw ingeridos": "Katalog eingespielter Rohdateien",
        "páginas recortadas": "ausgeschnittene Seiten",
        "fotos de referencia de kata + imágenes promocionales":
        "Kata-Referenzfotos + Werbebilder",
    },
    "it": {
        "## Panorama general": "## Panoramica",
        "| Página | Resumen |": "| Pagina | Riassunto |",
        "## Historia y linaje": "## Storia e lignaggio",
        "## Artes": "## Arti",
        "## Técnicas": "## Tecniche",
        "## Conceptos": "## Concetti",
        "## Personas": "## Persone",
        "## Dōjō (Japón)": "## Dōjō (Giappone)",
        "## Reihō y cultura": "## Reihō e cultura",
        "## Filosofía": "## Filosofia",
        "## Guías (instrucción)": "## Guide (istruzione)",
        "## Artículos de tenshinryu.net": "## Articoli tenshinryu.net",
        "## Fuentes": "## Fonti",
        "## Archivos raw ingeridos": "## File grezzi ingeriti",
        "(español)": "(italiano)",
        "Base de conocimiento estructurada": "Base di conoscenza strutturata",
        "Mantenida por ingestión LLM desde fuentes oficiales; revisada por humanos.":
        "Mantenuta da ingestione LLM da fonti ufficiali; revisionata da umani.",
        "Otros idiomas:": "Altre lingue:",
        "[inglés]": "[inglese]",
        "[japonés]": "[giapponese]",
        "[griego]": "[greco]",
        "artículos en japonés": "articoli in giapponese",
        "archivo completo del blog": "archivio completo del blog",
        "Archivo del blog": "Archivio del blog",
        "Más de 150 resúmenes de fuentes": "Oltre 150 riassunti delle fonti",
        "catálogo de archivos raw ingeridos": "catalogo dei file grezzi ingeriti",
        "páginas recortadas": "pagine ritagliate",
        "fotos de referencia de kata + imágenes promocionales":
        "foto di riferimento kata + immagini promozionali",
    },
}

META = {
    "fr": {
        "index": ("Wiki Hyōhō Tenshinryu — Index", "fr"),
        "overview": ("Aperçu — Hyōhō Tenshinryu", "fr"),
        "synthesis": ("Synthèse", "fr"),
        "arts/_index": ("Arts du Hyōhō Tenshinryu", "fr"),
        "reiho/_index": ("Reihō et culture — Index", "fr"),
        "techniques/tachiai-12-kata": ("Tachiai Battojutsu — 12 Seihō", "fr"),
        "concepts/miden-kurai-no-koto": ("Miden Kurai-no-Koto (身伝・位の事)", "fr"),
        "guides/start-here": ("Commencer — Parcours élève", "fr"),
    },
    "de": {
        "index": ("Tenshinryu Hyōhō Wiki — Index", "de"),
        "overview": ("Überblick — Hyōhō Tenshinryu", "de"),
        "synthesis": ("Synthese", "de"),
        "arts/_index": ("Künste des Hyōhō Tenshinryu", "de"),
        "reiho/_index": ("Reihō & Kultur — Index", "de"),
        "techniques/tachiai-12-kata": ("Tachiai Battojutsu — 12 Seihō", "de"),
        "concepts/miden-kurai-no-koto": ("Miden Kurai-no-Koto (身伝・位の事)", "de"),
        "guides/start-here": ("Einstieg — Lernpfad für Schüler", "de"),
    },
    "it": {
        "index": ("Wiki Hyōhō Tenshinryu — Indice", "it"),
        "overview": ("Panoramica — Hyōhō Tenshinryu", "it"),
        "synthesis": ("Sintesi", "it"),
        "arts/_index": ("Arti dell'Hyōhō Tenshinryu", "it"),
        "reiho/_index": ("Reihō e cultura — Indice", "it"),
        "techniques/tachiai-12-kata": ("Tachiai Battojutsu — 12 Seihō", "it"),
        "concepts/miden-kurai-no-koto": ("Miden Kurai-no-Koto (身伝・位の事)", "it"),
        "guides/start-here": ("Inizia qui — Percorso per allievi", "it"),
    },
}

START_HERE = {
    "fr": """---
slug: guides/start-here
lang: fr
title: Commencer — Parcours élève
pair: en/guides/start-here
tags: [guides, pedagogy, student]
sources:
  - wiki/en/techniques/tachiai-12-kata.md
  - wiki/en/guides/instructor-3rd-grade/vol-2-training-flow.md
updated: 2026-06-30
---

# Commencer — Parcours élève

Orientation pratique pour les nouveaux élèves de **Tenshinryu Hyōhō** — que vous vous entraîniez dans une branche au Japon, via **Tenshinryu ONLINE / KIWAMI**, ou que vous exploriez avant votre premier cours.

## À quoi sert ce wiki

Ce site est une base de connaissances structurée à partir de sources officielles Tenshinryu (tenshinryu.net, textes d'instructeurs, livres de curriculum). Il **ne remplace pas** l'enseignement en présentiel.

Le curriculum avancé — notamment les [[techniques/tachiai-12-kata|douze seihō]] et le [[concepts/miden-kurai-no-koto|miden kurai]] — est un **enseignement confidentiel (門外不出)** : étudiez sous la direction de votre instructeur. Ne considérez pas les pages du wiki comme une autorisation d'enseigner hors de la lignée.

Pour une vue d'ensemble des hubs, voir [[synthesis|Synthèse]].

## Checklist Semaine 1

À parcourir dans l'ordre pendant votre première semaine :

1. **Aperçu** — [[overview|Qu'est-ce que le Hyōhō Tenshinryu]] ; les huit arts en bref.
2. **Bases du reihō** — l'étiquette avant la technique :
   - [[reiho/tabi|Comment porter les tabi]]
   - [[reiho/sageo|À propos du sageo]]
   - [[reiho/keiko-osame|Keiko osame (clôture de la pratique)]]
   - Liste complète : [[reiho/_index|Index reihō]]
3. **À quoi ressemble un cours** — déroulement type (salut d'ouverture, narashi-geiko, thèmes principaux, clôture) :

> **D'après le texte instructeur (Vol. II) :** Arriver tôt ; saluer les élèves ; ouvrir par **zarei** (salut assis), **ken-za-zen** optionnel, puis **kinchō**. **Narashi-geiko** répète les sorties de lame sans correction lourde (~10–20 répétitions). Les blocs principaux incluent **doran-keiko**, un exposé sur le bushidō et l'histoire, puis des thèmes debout de **battojutsu** / **kenjutsu**. Clôture par des remarques et **keiko osame**.

   Détail complet : [[guides/instructor-3rd-grade/vol-2-training-flow|The Flow of Training]].

## Orientation du curriculum

Après la Semaine 1, repérez où se trouvent les techniques :

| Étape | Page | Pourquoi |
|-------|------|----------|
| 1 | [[arts/_index|Arts du Hyōhō]] | Huit arts + contexte koden / denchu tōhō |
| 2 | [[arts/battojutsu|Battojutsu]] | Sortie de lame et coupe ; porte d'entrée du curriculum debout |
| 3 | [[concepts/seiho|Seiho (勢法)]] | Catégorie spéciale de « kata » Tenshinryu — pas des formes génériques |
| 4 | [[techniques/tachiai-12-kata|Tachiai — 12 seihō]] | **Quand votre instructeur l'assigne** — les douze formes |

Approfondissement optionnel : [[concepts/miden-kurai-no-koto|Miden Kurai-no-Koto]] (manuel des postures / 位), [[guides/teaching-beginners|Enseigner aux débutants]] (perspective instructeur).

## Élèves internationaux (ONLINE / KIWAMI)

- **Entraînement en direct :** [Tenshinryu ONLINE / KIWAMI](https://tenshinryu.xyz) — espace membre pour le keiko en ligne.
- **Essais de philosophie** (état d'esprit, pas sport) :
  - [[philosophy/onko-chishin|Onko chishin 温故知新]] — apprendre de l'ancien pour connaître le nouveau
  - [[philosophy/datsuryoku|Datsuryoku]] — relâcher la tension inutile
- **Lectures recommandées :** [[articles/p-29|Culture du bugō]], [[articles/p-2605|Culture du kata (III)]], [[articles/p-35|Tradition shinanjo]] — voir [[articles/_index#start-reading|Commencer la lecture]] dans l'archive du blog.

## Élèves au Japon

- **Branches et horaires :** [[dojo/overview|Hub dōjō Japon]]
- **Pourquoi 指南所, pas 道場 :** [[dojo/shinanjo-tradition|Shinanjo et salles de pratique]]
- **Essais sélectionnés :** [[articles/p-67|Reihō]], [[articles/p-2747|Fukuro-shinai (marudachi)]], [[articles/p-2893|Histoire d'inscription d'Ide Shike]]
- **Lignée :** [[people/nakamura-tenshin|9e Shike]], [[people/kuwami-masakumo|10e Shike]], [[people/ide-ryusetsu|11e Shike]] · [[history/instructors|Lignée des instructeurs]]

## Étapes suivantes

- [[synthesis|Synthèse]] — carte transversale (table des 12 seihō, kurai, reihō, dōjō, sources)
- [[articles/_index|Archive du blog]] — 291 articles tenshinryu.net par catégorie
- [[index|Index complet du wiki]]

日本語: [[../ja/guides/start-here|はじめに]]
""",
    "de": """---
slug: guides/start-here
lang: de
title: Einstieg — Lernpfad für Schüler
pair: en/guides/start-here
tags: [guides, pedagogy, student]
sources:
  - wiki/en/techniques/tachiai-12-kata.md
  - wiki/en/guides/instructor-3rd-grade/vol-2-training-flow.md
updated: 2026-06-30
---

# Einstieg — Lernpfad für Schüler

Praktische Orientierung für neue **Tenshinryu Hyōhō**-Schüler — ob Sie in einer Japan-Niederlassung trainieren, über **Tenshinryu ONLINE / KIWAMI**, oder vor dem ersten Unterricht erkunden.

## Was dieses Wiki ist

Diese Seite ist eine strukturierte Wissensbasis aus offiziellen Tenshinryu-Quellen (tenshinryu.net, Instruktorentexte, Lehrplanbücher). Sie **ersetzt keinen** Unterricht vor Ort.

Fortgeschrittener Lehrplan — besonders [[techniques/tachiai-12-kata|zwölf Seihō]] und [[concepts/miden-kurai-no-koto|Miden Kurai]] — ist **vertrauliche Lehre (門外不出)**: studieren Sie unter Anleitung Ihres Instruktors. Wiki-Seiten sind keine Erlaubnis, außerhalb der Linie zu unterrichten.

Überblick über die Hubs: [[synthesis|Synthese]].

## Checkliste Woche 1

In der ersten Woche in dieser Reihenfolge:

1. **Überblick** — [[overview|Was Tenshinryu Hyōhō ist]]; acht Künste im Überblick.
2. **Reihō-Grundlagen** — Etikette vor Technik:
   - [[reiho/tabi|Tabi richtig tragen]]
   - [[reiho/sageo|Über den Sageo]]
   - [[reiho/keiko-osame|Keiko osame (Übungsabschluss)]]
   - Vollständige Liste: [[reiho/_index|Reihō-Index]]
3. **Wie eine Stunde abläuft** — typischer Ablauf (Eröffnungsgruß, Narashi-geiko, Hauptthemen, Abschluss):

> **Aus Instruktorentext (Bd. II):** Früh kommen; Schüler begrüßen; Beginn mit **Zarei** (Sitzgruß), optional **Ken-za-zen**, dann **Kinchō**. **Narashi-geiko** wiederholt Ziehungen ohne starke Korrektur (~10–20 Wdh.). Hauptblöcke: **Doran-keiko**, Vortrag zu Bushidō und Geschichte, dann stehendes **Battojutsu** / **Kenjutsu**. Abschluss mit Bemerkungen und **Keiko osame**.

   Details: [[guides/instructor-3rd-grade/vol-2-training-flow|The Flow of Training]].

## Lehrplan-Orientierung

Nach Woche 1 — wo Techniken liegen:

| Schritt | Seite | Warum |
|---------|-------|-------|
| 1 | [[arts/_index|Künste des Hyōhō]] | Acht Künste + Koden / Denchu Tōhō |
| 2 | [[arts/battojutsu|Battojutsu]] | Ziehen und Schneiden; Einstieg ins stehende Curriculum |
| 3 | [[concepts/seiho|Seiho (勢法)]] | Tenshinryus eigene «Kata»-Kategorie |
| 4 | [[techniques/tachiai-12-kata|Tachiai — 12 Seihō]] | **Wenn der Instruktor es zuweist** — zwölf Formen |

Optional: [[concepts/miden-kurai-no-koto|Miden Kurai-no-Koto]], [[guides/teaching-beginners|Anfänger unterrichten]].

## Internationale Schüler (ONLINE / KIWAMI)

- **Live-Training:** [Tenshinryu ONLINE / KIWAMI](https://tenshinryu.xyz)
- **Philosophie-Aufsätze:**
  - [[philosophy/onko-chishin|Onko chishin 温故知新]]
  - [[philosophy/datsuryoku|Datsuryoku]]
- **Empfohlen:** [[articles/p-29|Bugō-Kultur]], [[articles/p-2605|Kata-Kultur (III)]], [[articles/p-35|Shinanjo-Tradition]] — [[articles/_index#start-reading|Lesestart]] im Blog-Archiv.

## Schüler in Japan

- **Niederlassungen:** [[dojo/overview|Japan-Dōjō-Hub]]
- **指南所 statt 道場:** [[dojo/shinanjo-tradition|Shinanjo & Übungshallen]]
- **Essays:** [[articles/p-67|Reihō]], [[articles/p-2747|Fukuro-shinai]], [[articles/p-2893|Ide Shikes Eintrittsgeschichte]]
- **Linie:** [[people/nakamura-tenshin|9. Shike]], [[people/kuwami-masakumo|10. Shike]], [[people/ide-ryusetsu|11. Shike]] · [[history/instructors|Instruktoren-Linie]]

## Nächste Schritte

- [[synthesis|Synthese]]
- [[articles/_index|Blog-Archiv]] — 291 tenshinryu.net-Beiträge
- [[index|Vollständiger Wiki-Index]]

日本語: [[../ja/guides/start-here|はじめに]]
""",
    "it": """---
slug: guides/start-here
lang: it
title: Inizia qui — Percorso per allievi
pair: en/guides/start-here
tags: [guides, pedagogy, student]
sources:
  - wiki/en/techniques/tachiai-12-kata.md
  - wiki/en/guides/instructor-3rd-grade/vol-2-training-flow.md
updated: 2026-06-30
---

# Inizia qui — Percorso per allievi

Orientamento pratico per i nuovi allievi di **Tenshinryu Hyōhō** — che si allenino in una sede in Giappone, tramite **Tenshinryu ONLINE / KIWAMI**, o stiano esplorando prima della prima lezione.

## Cos'è questo wiki

Questo sito è una base di conoscenza strutturata da fonti ufficiali Tenshinryu (tenshinryu.net, testi degli istruttori, libri di curriculum). **Non sostituisce** l'insegnamento dal vivo.

Il curriculum avanzato — in particolare i [[techniques/tachiai-12-kata|dodici seihō]] e il [[concepts/miden-kurai-no-koto|miden kurai]] — è **insegnamento riservato (門外不出)**: studiate sotto la guida del vostro istruttore. Non trattate le pagine del wiki come permesso di insegnare fuori dalla linea.

Panoramica dei hub: [[synthesis|Sintesi]].

## Checklist Settimana 1

Da seguire in ordine nella prima settimana:

1. **Panoramica** — [[overview|Cos'è l'Hyōhō Tenshinryu]]; le otto arti a colpo d'occhio.
2. **Basi del reihō** — etichetta prima della tecnica:
   - [[reiho/tabi|Come indossare i tabi]]
   - [[reiho/sageo|Il sageo]]
   - [[reiho/keiko-osame|Keiko osame (chiusura della pratica)]]
   - Elenco completo: [[reiho/_index|Indice reihō]]
3. **Com'è una lezione** — flusso tipico (inchino iniziale, narashi-geiko, temi principali, chiusura):

> **Dal testo istruttore (Vol. II):** Arrivare presto; salutare gli allievi; apertura con **zarei**, opzionale **ken-za-zen**, poi **kinchō**. **Narashi-geiko** ripete estrazioni senza correzioni pesanti (~10–20 ripetizioni). Blocchi principali: **doran-keiko**, discorso su bushidō e storia, poi **battojutsu** / **kenjutsu** in piedi. Chiusura con osservazioni e **keiko osame**.

   Dettaglio: [[guides/instructor-3rd-grade/vol-2-training-flow|The Flow of Training]].

## Orientamento al curriculum

Dopo la Settimana 1, mappate dove stanno le tecniche:

| Passo | Pagina | Perché |
|-------|--------|--------|
| 1 | [[arts/_index|Arti dell'Hyōhō]] | Otto arti + contesto koden / denchu tōhō |
| 2 | [[arts/battojutsu|Battojutsu]] | Estrazione e taglio; accesso al curriculum in piedi |
| 3 | [[concepts/seiho|Seiho (勢法)]] | Categoria speciale di «kata» Tenshinryu |
| 4 | [[techniques/tachiai-12-kata|Tachiai — 12 seihō]] | **Quando l'istruttore lo assegna** — dodici forme |

Approfondimenti: [[concepts/miden-kurai-no-koto|Miden Kurai-no-Koto]], [[guides/teaching-beginners|Insegnare ai principianti]].

## Allievi internazionali (ONLINE / KIWAMI)

- **Allenamento live:** [Tenshinryu ONLINE / KIWAMI](https://tenshinryu.xyz)
- **Saggi di filosofia:**
  - [[philosophy/onko-chishin|Onko chishin 温故知新]]
  - [[philosophy/datsuryoku|Datsuryoku]]
- **Letture consigliate:** [[articles/p-29|Cultura bugō]], [[articles/p-2605|Cultura del kata (III)]], [[articles/p-35|Tradizione shinanjo]] — [[articles/_index#start-reading|Inizia a leggere]] nell'archivio blog.

## Allievi in Giappone

- **Sedi e orari:** [[dojo/overview|Hub dōjō Giappone]]
- **Perché 指南所, non 道場:** [[dojo/shinanjo-tradition|Shinanjo e sale di pratica]]
- **Saggi:** [[articles/p-67|Reihō]], [[articles/p-2747|Fukuro-shinai]], [[articles/p-2893|Storia di iscrizione di Ide Shike]]
- **Lignaggio:** [[people/nakamura-tenshin|9° Shike]], [[people/kuwami-masakumo|10° Shike]], [[people/ide-ryusetsu|11° Shike]] · [[history/instructors|Lignaggio istruttori]]

## Prossimi passi

- [[synthesis|Sintesi]]
- [[articles/_index|Archivio blog]] — 291 post tenshinryu.net
- [[index|Indice completo del wiki]]

日本語: [[../ja/guides/start-here|はじめに]]
""",
}

SYNTHESIS_TR = {
    "fr": {
        "lang: es": "lang: fr",
        "title: Síntesis": "title: Synthèse",
        "# Síntesis": "# Synthèse",
        "Mapa transversal": "Carte transversale",
        "Currículo central": "Curriculum central",
        "Pedagogía e instructores": "Pédagogie et instructeurs",
        "Linaje y organización": "Lignée et organisation",
        "Reihō y cultura": "Reihō et culture",
        "Fuentes": "Sources",
        "Inglés:": "Anglais :",
        "Japonés:": "Japonais :",
    },
    "de": {
        "lang: es": "lang: de",
        "title: Síntesis": "title: Synthese",
        "# Síntesis": "# Synthese",
        "Mapa transversal": "Querschnittskarte",
        "Currículo central": "Kernlehrplan",
        "Pedagogía e instructores": "Pädagogik & Instruktoren",
        "Linaje y organización": "Linie & Organisation",
        "Reihō y cultura": "Reihō & Kultur",
        "Fuentes": "Quellen",
        "Inglés:": "Englisch:",
        "Japonés:": "Japanisch:",
    },
    "it": {
        "lang: es": "lang: it",
        "title: Síntesis": "title: Sintesi",
        "# Síntesis": "# Sintesi",
        "Mapa transversal": "Mappa trasversale",
        "Currículo central": "Curriculum centrale",
        "Pedagogía e instructores": "Pedagogia e istruttori",
        "Linaje y organización": "Lignaggio e organizzazione",
        "Reihō y cultura": "Reihō e cultura",
        "Fuentes": "Fonti",
        "Inglés:": "Inglese:",
        "Japonés:": "Giapponese:",
    },
}

REIHO_INDEX = {
    "fr": """---
slug: reiho/_index
lang: fr
title: Reihō et culture — Index
pair: en/reiho/_index
tags: [reiho, culture]
updated: 2026-06-30
---

# Reihō et culture

Étiquette, tenue et conduite quotidienne dans Tenshinryu — à étudier tôt (voir [[guides/start-here|Commencer]]).

| Page | Sujet |
|------|-------|
| [[reiho/sageo|À propos du sageo]] | Longueur et maniement du sageo (下緒) |
| [[reiho/tabi|Comment porter les tabi]] | Chaussure de pratique |
| [[reiho/kesa|Kesa 袈裟]] | Pliage et port du kesa |
| [[reiho/tekoa|Tekō (protection du poignet)]] | Protection main / poignet |
| [[reiho/keiko-osame|Keiko-Osame 稽古納め]] | Cérémonie de clôture |
| [[reiho/dojo-movement|Mouvement dans le dōjō]] | Conduite dans l'espace d'entraînement |
| [[reiho/technique-of-respect|La technique du respect]] | Révérence intérieure au quotidien |
| [[reiho/sewing-haori|Scène de couture]] | Couture des cordons du haori |
| [[reiho/traditional-costume|Costume traditionnel (Vol. 2)]] | Album de référence |

Voir aussi : [[articles/p-67|Essai reihō (tenshinryu.net)]] · [[philosophy/]] · [[synthesis#reihō--culture]]

日本語: [[../ja/reiho/_index|礼法索引]]
""",
    "de": """---
slug: reiho/_index
lang: de
title: Reihō & Kultur — Index
pair: en/reiho/_index
tags: [reiho, culture]
updated: 2026-06-30
---

# Reihō & Kultur

Etikette, Kleidung und tägliches Verhalten in Tenshinryu — früh studieren (siehe [[guides/start-here|Einstieg]]).

| Seite | Thema |
|-------|-------|
| [[reiho/sageo|Über den Sageo]] | Sageo (下緒) Länge und Handhabung |
| [[reiho/tabi|Tabi tragen]] | Übungsfußbekleidung |
| [[reiho/kesa|Kesa 袈裟]] | Kesa falten und tragen |
| [[reiho/tekoa|Tekō (Handgelenkschutz)]] | Hand- / Handgelenkschutz |
| [[reiho/keiko-osame|Keiko-Osame 稽古納め]] | Abschlusszeremonie |
| [[reiho/dojo-movement|Bewegung im Dōjō]] | Verhalten im Übungsraum |
| [[reiho/technique-of-respect|Die Technik des Respekts]] | Innere Ehrfurcht im Alltag |
| [[reiho/sewing-haori|Eine Nähszene]] | Haori-Schnüre nähen |
| [[reiho/traditional-costume|Traditionelle Tracht (Bd. 2)]] | Referenzalbum |

Siehe auch: [[articles/p-67|Reihō-Essay]] · [[philosophy/]] · [[synthesis#reihō--culture]]

日本語: [[../ja/reiho/_index|礼法索引]]
""",
    "it": """---
slug: reiho/_index
lang: it
title: Reihō e cultura — Indice
pair: en/reiho/_index
tags: [reiho, culture]
updated: 2026-06-30
---

# Reihō e cultura

Etichetta, abbigliamento e condotta quotidiana in Tenshinryu — da studiare presto (vedi [[guides/start-here|Inizia qui]]).

| Pagina | Argomento |
|--------|-----------|
| [[reiho/sageo|Il sageo]] | Lunghezza e uso del sageo (下緒) |
| [[reiho/tabi|Come indossare i tabi]] | Calzature per la pratica |
| [[reiho/kesa|Kesa 袈裟]] | Piegatura e uso del kesa |
| [[reiho/tekoa|Tekō (copertura del polso)]] | Protezione mano / polso |
| [[reiho/keiko-osame|Keiko-Osame 稽古納め]] | Cerimonia di chiusura |
| [[reiho/dojo-movement|Movimento nel dōjō]] | Condotta nello spazio di allenamento |
| [[reiho/technique-of-respect|La tecnica del rispetto]] | Riverenza interiore nella vita quotidiana |
| [[reiho/sewing-haori|Una scena di cucito]] | Cucitura dei cordoni dell'haori |
| [[reiho/traditional-costume|Costume tradizionale (Vol. 2)]] | Album di riferimento |

Vedi anche: [[articles/p-67|Saggio reihō]] · [[philosophy/]] · [[synthesis#reihō--culture]]

日本語: [[../ja/reiho/_index|礼法索引]]
""",
}

PARTIAL = {
    "fr": "> **Traduction partielle** — Résumé en français (fr-FR) basé sur les versions anglaise et espagnole.\n\n",
    "de": "> **Teilübersetzung** — Deutsche Zusammenfassung basierend auf englischer und spanischer Version.\n\n",
    "it": "> **Traduzione parziale** — Riassunto in italiano basato sulle versioni inglese e spagnola.\n\n",
}

OVERVIEW = {
    "fr": """# Hyōhō Tenshinryu

**Tenshinryu** (天心流) est un **hyōhō** (兵法) martial japonais traditionnel — un système intégré d'arts martiaux — dont les racines remontent au début de l'ère Edo (il y a environ 400 ans). Il intègre épée, lance, armes à chaîne et méthodes à mains nues, avec un accent sur les tactiques applicables dans les postures et environnements quotidiens.

Voir aussi : [[history/overview]] · [[arts/_index]]

## En bref

| | |
|---|---|
| **Fondateur** | Tokizawa Yahei (時沢弥兵衛), sous Yagyū Munenori |
| **Époque** | Période Kan'ei ; formalisé à partir du Shinkageryū et traditions alliées |
| **But (historique)** | Formation pour **Kogan** (光願), guerriers infiltrés au service de la paix Tokugawa |
| **Tête actuelle** | Lignée via Ishii Seizo (8e) → Nakamura Tenshin (9e) |
| **Portée moderne** | Réseau de dōjō au Kantō ; chapitres internationaux ; [[TENSHINRYU ONLINE]] via KIWAMI |

## Ce qui en fait un « hyōhō »

Contrairement à une école à une seule arme, Tenshinryu compte huit **arts** principaux (voir [[arts/_index]]). L'entraînement inclut le dégainage en contexte de château (**denchu tōhō saya no uchi**), les formes **koden** à longue épée et l'usage quotidien du **wakizashi** (脇差).

## Apprendre aujourd'hui

- **Au Japon** : plusieurs lieux de pratique (Kantō et ailleurs) — détails sur le site officiel.
- **International** : branches de la fédération dans le monde ; curriculum en ligne sur [Tenshinryu KIWAMI](https://tenshinryu.xyz).
- **Cœur batto** : [[techniques/tachiai-12-kata]] — douze seihō (勢法) debout.

> **Note :** Ce wiki compile du matériel publié. Linée et instruction technique relèvent des maîtres autorisés.
""",
    "de": """# Hyōhō Tenshinryu

**Tenshinryu** (天心流) ist ein traditionelles japanisches **Hyōhō** (兵法) — ein ganzheitliches Kampfkunstsystem — mit Wurzeln in der frühen Edo-Zeit (vor etwa 400 Jahren). Es vereint Schwert, Speer, Kettenwaffen und waffenlose Methoden, mit Schwerpunkt auf taktischen Anwendungen in Alltagshaltungen und -umgebungen.

Siehe auch: [[history/overview]] · [[arts/_index]]

## Kurzüberblick

| | |
|---|---|
| **Gründer** | Tokizawa Yahei (時沢弥兵衛), unter Yagyū Munenori |
| **Zeit** | Kan'ei-Periode; formalisiert aus Shinkageryū und verbündeten Traditionen |
| **Zweck (historisch)** | Ausbildung für **Kogan** (光願), verdeckte Krieger im Dienst des Tokugawa-Friedens |
| **Aktuelle Spitze** | Linie über Ishii Seizo (8.) → Nakamura Tenshin (9.) |
| **Moderne Reichweite** | Dōjō-Netz im Kantō; internationale Zweige; [[TENSHINRYU ONLINE]] via KIWAMI |

## Was es zum « Hyōhō » macht

Anders als eine Ein-Waffen-Schule listet Tenshinryu acht Haupt**künste** (siehe [[arts/_index]]). Training umfasst Ziehmethoden im Schlosskontext (**denchu tōhō saya no uchi**), **Koden**-Langschwertformen und täglichen **Wakizashi** (脇差)-Gebrauch.

## Heute lernen

- **In Japan**: mehrere Übungsorte (Kantō u. a.) — Details auf der offiziellen Website.
- **International**: Föderationszweige weltweit; Online-Lehrplan bei [Tenshinryu KIWAMI](https://tenshinryu.xyz).
- **Batto-Kern**: [[techniques/tachiai-12-kata]] — zwölf stehende Seihō (勢法).

> **Hinweis:** Dieses Wiki sammelt veröffentlichtes Material. Linie und technische Unterweisung gehören autorisierten Meistern.
""",
    "it": """# Hyōhō Tenshinryu

**Tenshinryu** (天心流) è un **hyōhō** (兵法) marziale giapponese tradizionale — un sistema integrato di arti marziali — con radici all'inizio del periodo Edo (circa 400 anni fa). Integra spada, lancia, armi a catena e metodi a mani nude, con enfasi su tattiche applicabili nelle posture e negli ambienti quotidiani.

Vedi anche: [[history/overview]] · [[arts/_index]]

## In sintesi

| | |
|---|---|
| **Fondatore** | Tokizawa Yahei (時沢弥兵衛), sotto Yagyū Munenori |
| **Epoca** | Periodo Kan'ei; formalizzato da Shinkageryū e tradizioni alleate |
| **Scopo (storico)** | Formazione per **Kogan** (光願), guerrieri sotto copertura al servizio della pace Tokugawa |
| **Capo attuale** | Lignaggio tramite Ishii Seizo (8°) → Nakamura Tenshin (9°) |
| **Portata moderna** | Rete di dōjō nel Kantō; capitoli internazionali; [[TENSHINRYU ONLINE]] via KIWAMI |

## Cosa lo rende « hyōhō »

A differenza di una scuola a singola arma, Tenshinryu elenca otto **arti** principali (vedi [[arts/_index]]). L'allenamento include estrazione in contesto di castello (**denchu tōhō saya no uchi**), forme **koden** di spada lunga e uso quotidiano del **wakizashi** (脇差).

## Imparare oggi

- **In Giappone**: vari luoghi di pratica (Kantō e altri) — dettagli sul sito ufficiale.
- **Internazionale**: rami della federazione nel mondo; curriculum online su [Tenshinryu KIWAMI](https://tenshinryu.xyz).
- **Nucleo batto**: [[techniques/tachiai-12-kata]] — dodici seihō (勢法) in piedi.

> **Nota:** Questo wiki compila materiale pubblicato. Lignaggio e istruzione tecnica spettano ai maestri autorizzati.
""",
}

ARTS_INDEX = {
    "fr": """# Arts (composants du hyōhō)

Tenshinryu s'organise comme **hyōhō** — arts martiaux intégrés. Le site international liste ces **arts** principaux :

| Art | Japonais | Focus |
|-----|----------|-------|
| [[arts/kenjutsu]] | 剣術 | Épée dégainée |
| [[arts/battojutsu]] | 抜刀術 | Dégainage |
| [[arts/sojutsu]] | 槍術 | Lance |
| [[arts/jumonjiyarijutsu]] | 十文字槍術 | Lance en croix |
| [[arts/naginatajutsu]] | 薙刀術 | Naginata |
| [[arts/kusarigamajutsu]] | 鎖鎌術 | Faux à chaîne |
| [[arts/tesajutsu]] | 鉄鎖術 | Chaîne |
| [[arts/yawara]] | 柔 | Lutte à mains nues |

## Noyau vs tonomono

**Noyau :** denchu tōhō saya no uchi, batto assis et debout, **kenjutsu**.

**Tonomono / heiden (外物) :** yawara/jujutsu, kusarigama, lance, lance en croix, naginata — selon niveau et intérêt. Pas d'entrée pour un seul art supplémentaire. Les armes longues viennent de **Hozoin-ryu In-ha**.

## Curricula spéciaux

- **Denchu Tōhō Saya no Uchi** (殿中刀法鞘之中)
- **Koden** (古伝) — formes de **tachi**, pas seulement **uchigatana**
- **Wakizashi** (脇差) — porté à l'entraînement

## Portée de l'entraînement

Techniques pour s'allonger, se réveiller, s'asseoir, se tenir debout, marcher et courir.

## Voir aussi

- [[overview]] · [[philosophy/kata-culture]] · [[techniques/tachiai-12-kata]]
""",
    "de": """# Künste (Bestandteile des Hyōhō)

Tenshinryu ist als **Hyōhō** — ganzheitliche Kampfkünste — organisiert. Die internationale Website listet diese Haupt**künste**:

| Kunst | Japanisch | Schwerpunkt |
|-------|-----------|-------------|
| [[arts/kenjutsu]] | 剣術 | Gezücktes Schwert |
| [[arts/battojutsu]] | 抜刀術 | Ziehen |
| [[arts/sojutsu]] | 槍術 | Speer |
| [[arts/jumonjiyarijutsu]] | 十文字槍術 | Kreuzspeer |
| [[arts/naginatajutsu]] | 薙刀術 | Naginata |
| [[arts/kusarigamajutsu]] | 鎖鎌術 | Kettensichel |
| [[arts/tesajutsu]] | 鉄鎖術 | Kette |
| [[arts/yawara]] | 柔 | Waffenloser Kampf |

## Kern vs. Tonomono

**Kern:** Denchu Tōhō Saya no Uchi, sitzendes und stehendes Batto, **Kenjutsu**.

**Tonomono / Heiden (外物):** Yawara/Jujutsu, Kusarigama, Speer, Kreuzspeer, Naginata — je nach Niveau. Kein Einstieg nur für ein Zusatzkunst. Langwaffen aus **Hozoin-ryu In-ha**.

## Speziallehrpläne

- **Denchu Tōhō Saya no Uchi** (殿中刀法鞘之中)
- **Koden** (古伝) — **Tachi**-Formen, nicht nur **Uchigatana**
- **Wakizashi** (脇差) — im Training getragen

## Trainingsumfang

Techniken für Hinlegen, Erwachen, Sitzen, Stehen, Gehen und Laufen.

## Siehe auch

- [[overview]] · [[philosophy/kata-culture]] · [[techniques/tachiai-12-kata]]
""",
    "it": """# Arti (componenti dell'hyōhō)

Tenshinryu è organizzato come **hyōhō** — arti marziali integrate. Il sito internazionale elenca queste **arti** principali:

| Arte | Giapponese | Focus |
|------|------------|-------|
| [[arts/kenjutsu]] | 剣術 | Spada sguainata |
| [[arts/battojutsu]] | 抜刀術 | Estrazione |
| [[arts/sojutsu]] | 槍術 | Lancia |
| [[arts/jumonjiyarijutsu]] | 十文字槍術 | Lancia a croce |
| [[arts/naginatajutsu]] | 薙刀術 | Naginata |
| [[arts/kusarigamajutsu]] | 鎖鎌術 | Falcetto a catena |
| [[arts/tesajutsu]] | 鉄鎖術 | Catena |
| [[arts/yawara]] | 柔 | Lotta a mani nude |

## Nucleo vs tonomono

**Nucleo:** denchu tōhō saya no uchi, batto seduto e in piedi, **kenjutsu**.

**Tonomono / heiden (外物):** yawara/jujutsu, kusarigama, lancia, lancia a croce, naginata — secondo livello e interesse. Nessuna ammissione solo per un'arte supplementare. Le armi lunghe provengono da **Hozoin-ryu In-ha**.

## Curricula speciali

- **Denchu Tōhō Saya no Uchi** (殿中刀法鞘之中)
- **Koden** (古伝) — forme di **tachi**, non solo **uchigatana**
- **Wakizashi** (脇差) — portato in allenamento

## Ambito dell'allenamento

Tecniche per sdraiarsi, svegliarsi, sedersi, stare in piedi, camminare e correre.

## Vedi anche

- [[overview]] · [[philosophy/kata-culture]] · [[techniques/tachiai-12-kata]]
""",
}

TACHIAI_TR = {
    "fr": {
        "lang: es": "lang: fr",
        "Currículo avanzado": "Curriculum avancé",
        "Enseñanza confidencial": "Enseignement confidentiel",
        "Los doce seihō": "Les douze seihō",
        "Nombre verdadero": "Nom véritable",
        "Nombre(s) oculto(s)": "Nom(s) caché(s)",
        "Tipo": "Type",
        "Página": "Page",
        "Defensa": "Défense",
        "Duelo / igualar desenfundado": "Duel / égalisation du dégainage",
        "Anticipar el desenfundado": "Anticiper le dégainage",
        "Autodefensa y asesinato": "Autodéfense et assassinat",
        "Cuatro enemigos": "Quatre ennemis",
        "Corta distancia": "Courte distance",
        "Puente colgante": "Pont suspendu",
        "Ataque y defensa": "Attaque et défense",
        "Patrón común de cierre": "Schéma de clôture commun",
        "Notas de progresión": "Notes de progression",
        "Véase": "Voir",
    },
    "de": {
        "lang: es": "lang: de",
        "Currículo avanzado": "Fortgeschrittener Lehrplan",
        "Enseñanza confidencial": "Vertrauliche Lehre",
        "Los doce seihō": "Die zwölf Seihō",
        "Nombre verdadero": "Wahrer Name",
        "Nombre(s) oculto(s)": "Verborgene(r) Name(n)",
        "Tipo": "Typ",
        "Página": "Seite",
        "Defensa": "Verteidigung",
        "Duelo / igualar desenfundado": "Duell / gleichzeitiges Ziehen",
        "Anticipar el desenfundado": "Ziehen vorwegnehmen",
        "Autodefensa y asesinato": "Selbstverteidigung & Attentat",
        "Cuatro enemigos": "Vier Gegner",
        "Corta distancia": "Nahdistanz",
        "Puente colgante": "Hängebrücke",
        "Ataque y defensa": "Angriff & Verteidigung",
        "Patrón común de cierre": "Gemeinsames Abschlussmuster",
        "Notas de progresión": "Progressionshinweise",
        "Véase": "Siehe",
    },
    "it": {
        "lang: es": "lang: it",
        "Currículo avanzado": "Curriculum avanzato",
        "Enseñanza confidencial": "Insegnamento riservato",
        "Los doce seihō": "I dodici seihō",
        "Nombre verdadero": "Nome vero",
        "Nombre(s) oculto(s)": "Nome/i nascosto/i",
        "Tipo": "Tipo",
        "Página": "Pagina",
        "Defensa": "Difesa",
        "Duelo / igualar desenfundado": "Duello / parità di estrazione",
        "Anticipar el desenfundado": "Anticipare l'estrazione",
        "Autodefensa y asesinato": "Autodifesa e assassinio",
        "Cuatro enemigos": "Quattro nemici",
        "Corta distancia": "Corta distanza",
        "Puente colgante": "Ponte sospeso",
        "Ataque y defensa": "Attacco e difesa",
        "Patrón común de cierre": "Schema di chiusura comune",
        "Notas de progresión": "Note di progressione",
        "Véase": "Vedi",
    },
}

MIDEN_TR = TACHIAI_TR  # shared header vocabulary


def fm_for(lang: str, slug: str) -> str:
    title, _ = META[lang][slug]
    es_path = ES / f"{slug}.md"
    extra: list[str] = []
    if es_path.is_file():
        es_fm = es_path.read_text(encoding="utf-8").split("---\n", 2)[1]
        for line in es_fm.splitlines():
            if line.startswith(("tags:", "sources:", "updated:")):
                extra.append(line)
    if not any(l.startswith("updated:") for l in extra):
        extra.append("updated: 2026-06-30")
    lines = ["---", f"slug: {slug}", f"lang: {lang}", f"title: {title}", f"pair: en/{slug}"] + extra + ["---", ""]
    return "\n".join(lines)


def write_hub(lang: str, slug: str, body: str) -> None:
    out = WIKI / lang / f"{slug}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(fm_for(lang, slug) + body.strip() + "\n", encoding="utf-8")


def adapt_es_index(es_text: str, lang: str) -> str:
    text = es_text
    for old, new in INDEX_TR[lang].items():
        text = text.replace(old, new)
    lines = text.splitlines()
    out: list[str] = []
    in_fm = False
    for line in lines:
        if line.strip() == "---":
            in_fm = not in_fm
            out.append(line)
            continue
        if in_fm:
            if line.startswith("lang: "):
                out.append(f"lang: {lang}")
            elif line.startswith("title: "):
                out.append(f"title: {META[lang]['index'][0]}")
            elif line.startswith("pair: "):
                out.append("pair: en/index")
            else:
                out.append(line)
        else:
            out.append(line)
    return "\n".join(out)


def main() -> None:
    for lang in ("fr", "de", "it"):
        # start-here
        dest = WIKI / lang / "guides" / "start-here.md"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(START_HERE[lang].strip() + "\n", encoding="utf-8")

        # reiho index
        dest = WIKI / lang / "reiho" / "_index.md"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(REIHO_INDEX[lang].strip() + "\n", encoding="utf-8")

        # synthesis from es
        syn = (ES / "synthesis.md").read_text(encoding="utf-8")
        for old, new in SYNTHESIS_TR[lang].items():
            syn = syn.replace(old, new)
        lines = syn.splitlines()
        syn_out: list[str] = []
        in_fm = False
        for line in lines:
            if line.strip() == "---":
                in_fm = not in_fm
                syn_out.append(line)
                continue
            if in_fm:
                if line.startswith("lang: "):
                    syn_out.append(f"lang: {lang}")
                elif line.startswith("title: "):
                    syn_out.append(f"title: {META[lang]['synthesis'][0]}")
                elif line.startswith("pair: "):
                    syn_out.append("pair: en/synthesis")
                else:
                    syn_out.append(line)
            else:
                syn_out.append(line)
        (WIKI / lang / "synthesis.md").write_text("\n".join(syn_out) + "\n", encoding="utf-8")

        idx = adapt_es_index((ES / "index.md").read_text(encoding="utf-8"), lang)
        (WIKI / lang / "index.md").write_text(idx, encoding="utf-8")

        write_hub(lang, "overview", OVERVIEW[lang])
        write_hub(lang, "arts/_index", ARTS_INDEX[lang])

        for slug, tr_map in (
            ("techniques/tachiai-12-kata", TACHIAI_TR),
            ("concepts/miden-kurai-no-koto", MIDEN_TR),
        ):
            text = (ES / f"{slug}.md").read_text(encoding="utf-8")
            es_body = text.split("---\n\n", 1)[1]
            for old, new in tr_map[lang].items():
                es_body = es_body.replace(old, new)
            write_hub(lang, slug, PARTIAL[lang] + es_body)

        print(f"{lang}: wrote 8 hub pages")


if __name__ == "__main__":
    main()
