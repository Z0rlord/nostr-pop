#!/usr/bin/env python3
"""Fill JA stubs and expand ES/EL priority pages from EN sources."""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / "wiki"
TODAY = date.today().isoformat()

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

CHROME_RE = re.compile(
    r"^(?:\d{4}-\d{2}-\d{2}|関連する記事|Thought|HOME|Private:|Prev|Next|"
    r"See also:|タグ |BUSHI KOBUDO|JAPANESE TRADITION TENSHINRYU|"
    r"https?://|pic\.twitter|— Access The)",
    re.I,
)

JA_STUB_SLUGS = [
    "philosophy/apologies",
    "philosophy/correcting-mistakes",
    "philosophy/datsuryoku",
    "philosophy/kata-culture",
    "philosophy/martial-arts-misunderstandings",
    "philosophy/message-to-practitioners",
    "philosophy/nature-worship",
    "philosophy/onko-chishin",
    "philosophy/pride-and-humility",
    "philosophy/student-improvement",
    "philosophy/tradition-and-change",
    "philosophy/words-and-character",
    "reiho/dojo-movement",
    "reiho/keiko-osame",
    "reiho/kesa",
    "reiho/sageo",
    "reiho/sewing-haori",
    "reiho/tabi",
    "reiho/technique-of-respect",
    "reiho/tekoa",
    "reiho/traditional-costume",
    "history/1795",
    "history/1937",
    "history/koran-to",
    "techniques/bakuchiken",
    "techniques/chochin-barai",
    "techniques/fukuro-jinai",
    "techniques/fusa-otoshi",
    "techniques/nedachi",
    "techniques/tousen-niraminuki",
    "techniques/zanuke",
]

PRIORITY_ES_EL = JA_STUB_SLUGS + [
    f"techniques/tachiai-12-kata/{s}"
    for s in (
        "omokage",
        "nukiai",
        "nukidome",
        "makihazushi",
        "yokemigaeshi",
        "sodegaeshi",
        "shihogiri",
        "gyakuto",
        "marukibashi",
        "ninotachigaeshi",
        "karamegaeshi",
        "kesagake-no-koto",
    )
]

# Full Japanese bodies (international.tenshinryu.net articles)
JA_BODIES: dict[str, str] = {
    "philosophy/onko-chishin": """# 温故知新

料理が苦手な人の特徴の一つは、レシピに従わないことである。レシピ自体が誤っていれば、従っても美味しくならない。しかし正しいレシピがあるのに、経験の浅い人が「不要」と思う工程を飛ばしたり勝手に変えたりすれば、料理は台無しになり、場合によっては健康リスクにもなる。

表向きの実用性を語る人の言葉は、初心者にはとても説得力がある。一般の人が高度な数学や物理学を理解できないのと同様、武道の真の理を理解するには、稽古と努力が必要である。努力なく「分かった」と言う者の知識は、初心者向けに浅く、深みがない。

流派を学ぶなら、まず疑うべきは自分の能力・知識・理解力である。師の言葉と流派の教えに純粋に従い、逸脱せず学び続ければ、無用な遠回りや停滞を避け、着実に上達できる。

母は長年カレー作りを試行錯誤していた。ある日姉が「レシピ通りに作れば、毎回美味しくできる」と言った。母は驚き、市販ルウのパッケージ記載どおりに作ったところ、あっさり美味しいカレーができた。大企業が長年研究したルウとレシピがあるのだから、従えば美味しくなるのは当然である。好みに合わせた調整は後からでよい。出発点は常にレシピに従うことである。

人間は愚かで、個人の経験と知恵が、数多の先人の蓄積より優れると錯覚しがちである。そのため tradition を軽んじ、自分こそ上だと豪語する者がいる—— tradition を理解せずに語る例である。古いことわざに**温故知新**（古を温ねて新しきを知る）がある。古武道はその好例である。

第一に、流派とその tradition を信じること。第二に、自分の経験・知恵・能力を過信しないこと。そして最後に信じるべきは、選んだ道と、それを選べた自分自身である。""",
    "philosophy/datsuryoku": """# 脱力

**脱力（だつりょく）** — 体の力を抜くこと；筋肉の力みを解くこと。

天心流は脱力を非常に重視する。しかし筋肉を鍛えることを否定するわけではない。大切なのは**使い方**である。銀行に巨額があっても引き出し方を知らなければ意味がない。実戦では力そのものは大きな利点だが、体格と力には限界がある。体の使い方・技・戦術を学べば、体格差を覆し、無駄なエネルギー消費を抑え、長時間戦える。

筋力を増やす時間と同じか、それ以上に「筋肉の使い方」を学ぶ必要がある。筋肉を否定するのではなく、使い方を学ばないことを否定する——それが脱力の教えである。正しい型と動きを保ち、不要な力みを徹底的に抜くとき、初めて最適化が起こる。「最適な力の数値」を探すのは誤り。ゼロを目指し、最適化を自然に生じさせる——これが生死を繰り返した先人の知恵である。""",
    "philosophy/kata-culture": """# 型の文化

武道・武術の学びは、根本的に**型（かた）**を学ぶことである。型は「形」という漢字で書く。**文化の型**とは、集団が築き伝えた有形・無形の形式そのものと見なせる。

「日本は型の文化」と言われるが、型を持つのは日本だけではない。ボクシングのコンビネーション、球技の特定局面の反復練習も、広い意味で型である。日本文化に特徴的なのは、型への焦点と、型の大幅な変更への慎重さである。実用から問題が見えれば型は変化するが、古武道では型の保存そのものが「伝統保存」として新たな目的を持つようになった。

西洋の剣術は火器の普及とともに実戦から早く消え、フェンシングなどに痕跡を残した。対して日本では日本刀への愛着とともに、実用を失っても型を保存する傾向が強い。天心流では**勢法**という独自の型体系が、立相抜刀術の核をなす（[[concepts/seiho]] 参照）。""",
    "philosophy/nature-worship": """# 自然崇拝と敬意

日本には古来、自然を神聖視する**自然崇拝**の精神がある。山・川・樹木に魂が宿ると見なし、畏敬の念を持って接する。武道の場でも、稽古場（道場）や道具、相手に対する**敬意**は、この精神と結びついている。

天心流の礼法（[[reiho/technique-of-respect]]）は、単なる形式ではなく、相手・場・伝統への敬意を体現する。自然と調和した心構えは、脱力（[[philosophy/datsuryoku]]）や型の修練（[[philosophy/kata-culture]]）とも通じる。""",
    "philosophy/pride-and-humility": """# 驕りでない誇りと、卑下でない謙虚

**誇り**と**謙虚**は矛盾しない。傲慢な驕りでも、自己卑下でもない——天心流が求める心構えである。

流派の伝統を守り、自分の立場を知ることは誇りである。しかし自分だけが特別だと思い込むのは驕りである。師と先輩への敬意、稽古への真摯な姿勢が謙虚さである。それは弱さではなく、学び続けるための姿勢である。""",
    "philosophy/correcting-mistakes": """# 過ちを正さぬことは真の過ち

孔子の言葉「過ちて改めざる、是れを過ちという」——間違いを犯しても正さなければ、それこそ本当の過ちである。

稽古でも、一度間違った型や力みを放置すれば、それが癖になる。指摘を受けたら素直に直す。流派の教えに従い、自分の勝手な解釈で固定化しないことが、上達への道である。""",
    "philosophy/apologies": """# 謝罪について

日本の武士文化において、**謝罪**は単なる言葉ではなく、行動と責任の表明である。軽率な「ごめんなさい」だけでは不十分な場合がある。

天心流では、礼（[[reiho/technique-of-respect]]）と誠実さが求められる。過ちを認め、改め、相手と関係を修復する——それが真の謝罪である。""",
    "philosophy/tradition-and-change": """# 伝統と変化

伝統は変えてはならないのか、変えなければならないのか——古武道界で繰り返し問われるテーマである。

天心流の立場は、**温故知新**（[[philosophy/onko-chishin]]）にある。根幹の型と教えを守りつつ、時代に応じた伝達方法（オンライン稽古など）は進化する。しかし「便利さ」を理由に型の核心を削ることは、レシピの必須工程を飛ばすのと同じである。""",
    "philosophy/words-and-character": """# 言葉と人格

**言葉は人格を形作る**。軽はずみな発言、他者を贬す言葉は、自分自身をも損なう。

稽古場でも日常でも、発言には注意を払う。武士の言葉は、行動と一致していなければならない。""",
    "philosophy/student-improvement": """# 弟子の上達

師としての関心：**弟子が上達しない**ことへの懸念。原因は多岐にわたる——稽古量、理解、型への忠実さ、心構え。

指導者は、初学者（[[guides/teaching-beginners]]）から上級者まで、一人ひとりの段階に合わせた教え方が必要である。型を飛ばし、実用性だけを語る浅い指導は、長期的な上達を妨げる。""",
    "philosophy/martial-arts-misunderstandings": """# 古武道の誤解

日本の**古武道**は、現代のスポーツ武道や映画・ゲームのイメージと大きく異なる。実戦を想定した型、礼法、伝統の継承——それぞれに深い理由がある。

「実戦で使えないから意味がない」「型は形だけ」といった誤解は、稽古を経ずに語られることが多い。天心流では、型（勢法）こそが技と心を統合する手段である（[[concepts/seiho]]）。""",
    "philosophy/message-to-practitioners": """# 修行者へのメッセージ

天心流に関心を持つすべての方、そして既に稽古に励む方へ。

流派を選んだなら、まず師と tradition を信頼し、型と教えに誠実に向き合ってほしい。上達に近道はないが、逸脱のない学びには確かな道がある。国際的な稽古会・オンライン稽古（Tenshinryu Online）を通じて、世界の仲間と共に修練を続けてほしい。""",
    "reiho/sageo": """# 下緒（さげお）

## 下緒とは

**下緒**は、太刀緒（たちお）——腰に太刀を吊るす紐——の名残とされる。打刀（うちがたな）は帯刀（たいとう）で帯に差すが、下緒は栗形（くりかた）に残り、形式美と実用の両面を持つ。

天心流では下緒の長さを**一丈**（約六尺・180cm）と定める。一般に知られる五尺（約150cm）より長い。長い下緒は実用性を高める——襷掛け、止血帯、捕縛など多用途に対応するためである。

## 結び方

- **大刀**：主に**胡蝶結び**（蝶結び）。以前は大名結び（浪人結び）も教えられたが、伝統は胡蝶結びが正。
- **小太刀・小刀**：**茗荷結び**。一度解けば下緒を栗形から直ちに外せる天心流独自の結び方。

結ばない場合は、栗形が引っ張られて外れないよう一度鞘に巻き、歩行時に先端が地面に触れないよう注意する。石井師家（八世）は「下緒を床拭きにするな」と厳しく戒めたという。

## 下緒を結ぶ理由

江戸期の絵では結ばない例も多いが、登城などの公務では太刀緒を結び、**安太刀**（剣を即座に用いない状態）を示した。下緒を結ぶことは、公の場での礼と、抜刀の意図がないことの表明である。""",
    "reiho/tabi": """# 足袋の履き方

**足袋**を履く際は、一度裏返しにしてから指を入れるとよい。通常の履き方では**尻**（かかと側の割れ）に負担がかかり、破れやすくなる。

裏返しの程度（尻までか、足弓までか）は好みによる。**きちんと少しきつめ**に履くのが粋とされるが、足形によってサイズ調整が必要な場合もある。

着付けの一般則：足袋を**最初**に履く。袴を履く際左足から入るように、左の足袋から履く——右を reserve にする説もあるが、起源は明確でない。""",
    "reiho/kesa": """# 袈裟（けさ）

**袈裟**は武士の正装の一部として用いられる。着付けと意味には流派・時代による違いがあるが、天心流では伝統衣装（[[reiho/traditional-costume]]）の文脈で説明される。

正式な場での装いは、礼（[[reiho/technique-of-respect]]）と一体である。""",
    "reiho/tekoa": """# 手甲（てこう）

**手甲**は手首の甲側を覆う装具。袈裟や羽織とともに、伝統的な装束の一部（[[reiho/traditional-costume]]）。

稽古や演武において、袖口の扱いと合わせて礼法上の意味も持つ。""",
    "reiho/keiko-osame": """# 稽古納め

**稽古納め** — 稽古を終える際の作法。道場を清め、師・仲間に礼を尽くし、その日の修練を締めくくる。

道場内の動き（[[reiho/dojo-movement]]）と一体で学ぶ。形式を軽んじず、心を込めて行う。""",
    "reiho/dojo-movement": """# 道場内の動き

道場では、**動き方**自体が礼である。無駄な動き、乱暴な足音、道具の扱い——すべてが修行の一部。

入場・退場、正座・立ち、刀の扱いにおいて、[[reiho/technique-of-respect]] と [[reiho/keiko-osame]] と連動して理解する。""",
    "reiho/technique-of-respect": """# 礼の技

**礼の技** — 敬意を示す作法は、単なるエチケットではなく「技」である。相手・場・道具・伝統への respect を身体で表現する。

稽古の始めと終わり、演武、日常——武士の振る舞いの核。自然崇拝の精神（[[philosophy/nature-worship]]）とも通じる。""",
    "reiho/sewing-haori": """# 羽織紐の縫い方

**羽織**を縫う場面——武士の生活文化の一端。自分の装束を手入れすることは、自律と tradition への敬意の表れ。

伝統衣装（[[reiho/traditional-costume]]）の写真集とも関連。""",
    "reiho/traditional-costume": """# 伝統衣装

天心流の**伝統衣装**——袴、羽織、袈裟、足袋、手甲など——の参考写真と解説。各項目は [[reiho/kesa]]、[[reiho/tabi]]、[[reiho/tekoa]] など個別ページで詳述。

装束は形式美だけでなく、稽古と礼法を支える実用的な意味も持つ。""",
    "history/1795": """# 日本の家で首を飾らない（1795年）

*Assassin's Creed Shadows* などのゲーム描写で、日本の家に骸骨や首が飾られている場面が話題になったが、これは史実と異なる。

日本には、**首を室内の装飾として飾る文化は基本的にない**。合戦では敵将の首は武功の証として取り、検分ののち丁重に葬る。**晒し首（さらしくび）** は罪人や敵将の首を一定期間屋外に晒す**懲罰**であり、私邸の装飾ではない。

ゲームやフィクションでの創作は許容されるが、「史実を描く」と標榜するなら、存在しなかった文化慣習を創作することは歴史文化の歪曲である。過去の武士道倫理が現代から見れば barbaric に見えることは別問題として、**なかった慣習をあったかのように描く**ことは誤りである。""",
    "history/1937": """# 1937年の記事

1937年に関する天心流国際サイトの歴史・文化論考。当時の社会情勢と武士文化の理解をめぐる論点を含む。

詳細は英語版ページを参照。""",
    "history/koran-to": """# 虎乱刀（こらんとう）

**虎乱刀** — 天心流に伝わる技法・刀法に関する解説。至近距離で相手が抜こうとするとき、やや右に体をずらし、足を入れ替えながら相手の腕や手を切る。

刀を高く上げれば攻撃力は増すが、手出しが遅れる。故に高く上げず、足入れで攻撃を強める。**脇息（きょそく）** を蹴る動きが説明に含まれるが、これは**中心線から外れる**ことの便宜的な比喩である。実際に脇息がなくても、要点は相手の攻撃線（中心線）から外れて反撃することにある。

この技は公の場より**私的な近距離**——酒宴など、親しい間柄を想定する。日本の武士文化では、距離の近さは関係の近さを示す。""",
    "techniques/chochin-barai": """# 提灯抜（ちょうちんばらい）

新宿支部の稽古で紹介された**提灯抜**。提灯に引っかからぬよう、提灯を払うように抜刀する技法。*Chōchin-barai*（提灯抜）の名は、吊り下げられた提灯のそばを抜刀するイメージに由来する。

[[techniques/tachiai-12-kata]] の十二勢法とは別系統の紹介記事だが、立相抜刀術の実用感覚と通じる。""",
    "techniques/zanuke": """# 坐外（ざぬけ）

**坐外** — 背後の敵を討つ技法。相手に刀を見せぬよう動く。新宿支部稽古での紹介。

立相・近距離の状況想定。詳細は [[techniques/tachiai-12-kata]] および英語版解説を参照。""",
    "techniques/tousen-niraminuki": """# 尖睨抜（とうせんにらみぬき）

**尖睨抜** — 大太刀を用い、相手に脅されておどおどする振りを見せながら抜く技法。尖った睨みと抜刀がセットの名前である。

新宿支部稽古での紹介記事。""",
    "techniques/bakuchiken": """# 驀地剣（ばくちけん）

**驀地剣**は、立相十二勢法第三の**抜留**（ぬきどめ）の通称である。相手の抜き手を先制し、低い抜刀で相手の刀鍔の下に意図を隠す。

正式な勢法ページ: [[techniques/tachiai-12-kata/nukidome]]""",
    "techniques/fusa-otoshi": """# 房落（ふさおとし）

**房落** — 至近距離での抜刀技法。房（ふさ）を落とすように、相手の意識の隙に入って抜く。

国際サイトの技法紹介記事。十二勢法カリキュラム（[[techniques/tachiai-12-kata]]）とあわせて学ぶ。""",
    "techniques/fukuro-jinai": """# 袋印内（ふくろじない）

**袋印内** — 袋を用いた印内（いんない）の技法。天心流に伝わる応用技法の一つ。

国際サイト紹介。詳細は英語版および稽古での口伝に依る。""",
    "techniques/nedachi": """# 根立（ねだち）

**根立** — 「根を立てる」構え・技法。立ち方と抜刀の準備が一体となった技。

国際サイトの短い紹介。詳細は英語版および稽古での口伝に依る。""",
}


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    return yaml.safe_load(m.group(1)) or {}, text[m.end() :]


def fm_block(fm: dict) -> str:
    fm = dict(fm)
    fm["updated"] = TODAY
    return f"---\n{yaml.safe_dump(fm, allow_unicode=True, sort_keys=False).strip()}\n---\n\n"


def source_stem(fm: dict) -> str:
    sources = fm.get("sources") or []
    if sources:
        first = sources[0]
        if isinstance(first, dict):
            first = first.get("path") or first.get("file") or ""
        return Path(str(first)).stem if first else ""
    return ""


def clean_en_body(body: str) -> str:
    lines: list[str] = []
    for line in body.splitlines():
        s = line.strip()
        if not s:
            if lines and lines[-1]:
                lines.append("")
            continue
        if CHROME_RE.search(s):
            continue
        if s.endswith("│JAPANESE TRADITION TENSHINRYU HYOHO"):
            continue
        if len(s) > 5 and s == lines[-1].strip() if lines else False:
            continue
        lines.append(line)
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    # Drop duplicate title lines after h1
    return text


def extract_paragraphs(body: str, max_n: int = 4) -> list[str]:
    paras: list[str] = []
    for block in re.split(r"\n{2,}", body):
        block = block.strip()
        if not block or block.startswith("#") or block.startswith("|") or block.startswith("!"):
            continue
        if len(block) < 30:
            continue
        paras.append(block)
        if len(paras) >= max_n:
            break
    return paras


def fill_ja(slug: str, *, dry_run: bool) -> bool:
    ja_path = WIKI / "ja" / f"{slug}.md"
    if not ja_path.is_file():
        return False
    text = ja_path.read_text(encoding="utf-8")
    if "英語版のみ" not in text:
        return False
    fm, _ = parse_frontmatter(text)
    body = JA_BODIES.get(slug)
    if not body:
        return False
    new_text = fm_block(fm) + body + "\n"
    if not dry_run:
        ja_path.write_text(new_text, encoding="utf-8")
    return True


# ES/EL expanded summaries for priority pages (key themes from EN)
ES_EL_SUMMARIES: dict[str, dict[str, str]] = {
    "philosophy/onko-chishin": {
        "es": """## Resumen

**Onko chishin** (温故知新) enseña que aprender un arte exige seguir la «receta» de la escuela antes de improvisar. Como en la cocina, saltarse pasos de un método probado arruina el resultado.

Quienes hablan de «practicidad» sin haber entrenado suelen convencer a principiantes, pero su conocimiento es superficial. Hay que confiar en la tradición del estilo, no sobrevalorar la propia experiencia y creer en el camino elegido.""",
        "el": """## Περίληψη

Το **onko chishin** (温故知新) διδάσκει ότι η μάθηση ενός στυλ απαιτεί να ακολουθείς τη «συνταγή» του σχολείου πριν αυτοσχεδιάσεις. Όπως στη μαγειρική, η παράλειψη βημάτων χαλά το αποτέλεσμα.

Όσοι μιλούν για «πρακτικότητα» χωρίς προπονηση συχνά πείθουν αρχάριους, αλλά η γνώση τους είναι επιφανειακή. Πρέπει να εμπιστευτείς την παράδοση, να μην υπερεκτιμάς την εμπειρία σου και να πιστεύεις στο μονοπάτι που διάλεξες.""",
    },
    "philosophy/datsuryoku": {
        "es": """## Resumen

**Datsuryoku** (脱力) es soltar la tensión innecesaria. Tenshinryu no niega el músculo, sino no saber usarlo: como tener dinero en el banco sin saber retirarlo.

La optimización corporal exige dominar el uso de la fuerza tanto como aumentarla. El objetivo es «cero tensión superflua» dentro de la forma correcta, no buscar un número mágico de esfuerzo.""",
        "el": """## Περίληψη

**Datsuryoku** (脱力) σημαίνει απελευθέρωση από περιττή ένταση. Το Tenshinryu δεν αρνείται τους μύες, αλλά το να μην ξέρεις να τους χρησιμοποιείς.

Η βελτιστοποίηση του σώματος απαιτεί να μάθεις να χρησιμοποιείς τη δύναμη όσο και να την αυξάνεις. Στόχος είναι «μηδενική περιττή ένταση» μέσα στη σωστή μορφή.""",
    },
    "techniques/tachiai-12-kata/omokage": {
        "es": """## Resumen

**Seihō 1: Omokage** (面陰) — nombre oculto *Sansetsuken* (傘雪剣). Tipo **boto** (defensa).

Situación: de pie o caminando; el adversario desenvaina y corta de frente (o kesagake). Se recibe con el mine/shinogi en el antebrazo cerca de la frente (imagen del paraguas con nieve), se protege la vista y se responde con corte kesagake.""",
        "el": """## Περίληψη

**Seihō 1: Omokage** (面陰) — κρυφό όνομα *Sansetsuken* (傘雪剣). Τύπος **boto** (άμυνα).

Υπόθεση: όρθιος ή εν κινήσει· ο αντίπαλος αποσπά και κόβει κατακόρυφα. Η λάμα δέχεται με mine/shinogi στον αντιβράχιο κοντά στο μέτωπο, προστατεύεται η όραση και ακολουθεί kesagake.""",
    },
    "techniques/tachiai-12-kata/nukiai": {
        "es": """## Resumen

**Seihō 2: Nukiai** (抜合) — duelo de desenvainado simultáneo. Históricamente se enseñaba primero porque Omokage se consideraba demasiado difícil.

Incluye varios nombres ocultos (Kusamadachi, Ichiedachi, etc.).""",
        "el": """## Περίληψη

**Seihō 2: Nukiai** (抜合) — αμοιβαίο άντλημα. Ιστορικά διδασκόταν πρώτο γιατί το Omokage θεωρούνταν πολύ δύσκολο.""",
    },
    "techniques/tachiai-12-kata/nukidome": {
        "es": """## Resumen

**Seihō 3: Nukidome** (抜留) — también **Bakuchiken** (驀地剣). Anticipa el desenvainado del adversario; desenvainado bajo para ocultar la intención.""",
        "el": """## Περίληψη

**Seihō 3: Nukidome** (抜留) — επίσης **Bakuchiken** (驀地剣). Προλαμβάνει το άντλημα του αντιπάλου.""",
    },
}


PENDING = {"es": "Traducción pendiente", "el": "Μετάφραση σε εξέλιξη"}
PARTIAL_BANNER = {
    "es": "> **Traducción parcial** — Resumen en español (es-ES) basado en la versión inglesa.",
    "el": "> **Μερική μετάφραση** — Περίληψη στα ελληνικά βασισμένη στην αγγλική έκδοση.",
}

HEADER_TR: dict[str, dict[str, str]] = {
    "es": {
        "Body": "Cuerpo",
        "Role": "Función",
        "Variations": "Variaciones",
        "Battojutsu": "Battojutsu",
        "In twelve seiho": "En los doce seihō",
        "See also": "Véase también",
        "Also called": "También llamado",
        "Key takeaways": "Puntos clave",
        "Wiki pages updated from this source": "Páginas del wiki actualizadas",
        "Wiki pages from this source": "Páginas del wiki relacionadas",
        "Follow-up ingests from same site": "Ingestas pendientes del mismo sitio",
        "Biography (from Miden Kurai-no-Koto)": "Biografía (Miden Kurai-no-Koto)",
        "Related": "Relacionado",
        "From tenshinryu.net": "Desde tenshinryu.net",
        "Branches": "Sedes",
        "Summary (from Japanese source)": "Resumen (fuente japonesa)",
        "Ten · Shin · Chi (天・真・地)": "Ten · Shin · Chi (天・真・地)",
        "In-Yo · Nakazumi · Mei-An": "In-Yo · Nakazumi · Mei-An",
        "Semeashi · Mamoriashi": "Semeashi · Mamoriashi",
        "Back-foot toe angles (guides only)": "Ángulos del pie trasero (orientación)",
        "Variations (not exhaustive)": "Variaciones (no exhaustivo)",
    },
    "el": {
        "Body": "Σώμα",
        "Role": "Ρόλος",
        "Variations": "Παραλλαγές",
        "Battojutsu": "Battojutsu",
        "In twelve seiho": "Στα δώδεκα seihō",
        "See also": "Δείτε επίσης",
        "Also called": "Επίσης λέγεται",
        "Key takeaways": "Βασικά σημεία",
        "Wiki pages updated from this source": "Σελίδες wiki που ενημερώθηκαν",
        "Wiki pages from this source": "Σχετικές σελίδες wiki",
        "Follow-up ingests from same site": "Εκκρεμείς ingest από τον ίδιο ιστότοπο",
        "Biography (from Miden Kurai-no-Koto)": "Βιογραφία (Miden Kurai-no-Koto)",
        "Related": "Σχετικά",
        "From tenshinryu.net": "Από tenshinryu.net",
        "Branches": "Παραρτήματα",
        "Summary (from Japanese source)": "Περίληψη (ιαπωνική πηγή)",
        "Ten · Shin · Chi (天・真・地)": "Ten · Shin · Chi (天・真・地)",
        "In-Yo · Nakazumi · Mei-An": "In-Yo · Nakazumi · Mei-An",
        "Semeashi · Mamoriashi": "Semeashi · Mamoriashi",
        "Back-foot toe angles (guides only)": "Γωνίες πίσω ποδιού (οδηγός)",
        "Variations (not exhaustive)": "Παραλλαγές (μη εξαντλητικές)",
    },
}

META_TR = {
    "es": {"URL": "URL", "Fetched": "Obtenido", "Raw": "Archivo"},
    "el": {"URL": "URL", "Fetched": "Λήφθη", "Raw": "Αρχείο"},
}

# Common EN → es/el phrase hints for kurai/entity bullets
LINE_HINTS: dict[str, dict[str, str]] = {
    "es": {
        "Right elbow": "Codo derecho",
        "Left foot": "Pie izquierdo",
        "Right foot": "Pie derecho",
        "Attack": "Ataque",
        "Defense": "Defensa",
        "waiting kurai": "kurai de espera",
        "said to be the **fastest**": "se considera el **más rápido**",
        "After **straight vertical cut**": "Tras un **corte vertical directo**",
        "step back": "retroceder",
        "Branch page from tenshinryu.net": "Página de sede desde tenshinryu.net",
        "Born Tokyo": "Nacido en Tokio",
        "Childhood": "Infancia",
        "Opened": "Abrió",
        "Related": "Relacionado",
    },
    "el": {
        "Right elbow": "Δεξιός αγκώνας",
        "Left foot": "Αριστερό πόδι",
        "Right foot": "Δεξί πόδι",
        "Attack": "Επίθεση",
        "Defense": "Άμυνα",
        "waiting kurai": "kurai αναμονής",
        "said to be the **fastest**": "θεωρείται το **ταχύτερο**",
        "After **straight vertical cut**": "Μετά από **κάθετη κοπή**",
        "step back": "βήμα πίσω",
        "Branch page from tenshinryu.net": "Σελίδα παραρτήματος από tenshinryu.net",
        "Born Tokyo": "Γεννήθηκε στο Τόκιο",
        "Childhood": "Παιδική ηλικία",
        "Opened": "Ίδρυσε",
        "Related": "Σχετικά",
    },
}


def rel_link(slug: str, target_lang: str, label: str) -> str:
    ups = "../" * (slug.count("/") + 1)
    return f"[{label}]({ups}{target_lang}/{slug}.md)"


def discover_stubs(lang: str) -> list[str]:
    loc = WIKI / lang
    marker = PENDING[lang]
    out: list[str] = []
    for path in sorted(loc.rglob("*.md")):
        if marker in path.read_text(encoding="utf-8"):
            out.append(str(path.relative_to(loc).with_suffix("")))
    return out


def page_kind(slug: str) -> str:
    if slug.startswith("sources/"):
        return "source"
    if slug.startswith("concepts/kurai/"):
        return "kurai"
    if slug.startswith("guides/"):
        return "guide"
    if slug.startswith("dojo/") or slug.startswith("people/"):
        return "entity"
    if slug.startswith("articles/"):
        return "article"
    return "generic"


def parse_sections(body: str) -> list[tuple[str | None, str]]:
    sections: list[tuple[str | None, str]] = []
    current_h: str | None = None
    buf: list[str] = []
    for line in body.splitlines():
        if line.startswith("## "):
            if buf or current_h is not None:
                sections.append((current_h, "\n".join(buf).strip()))
            current_h = line[3:].strip()
            buf = []
        else:
            buf.append(line)
    if buf or current_h is not None:
        sections.append((current_h, "\n".join(buf).strip()))
    if not sections:
        sections.append((None, body.strip()))
    return sections


def tr_header(h: str, lang: str) -> str:
    return HEADER_TR.get(lang, {}).get(h, h)


def localize_line(line: str, lang: str) -> str:
    s = line.strip()
    if not s:
        return s
    if s.startswith("- "):
        s = s[2:]
    hints = LINE_HINTS.get(lang, {})
    for en, loc in hints.items():
        if en in s:
            s = s.replace(en, loc)
    # Keep wikilinks, bold, Japanese
    if not s.startswith("- "):
        s = f"- {s}" if line.strip().startswith("-") else s
    return s


def extract_meta(body: str, key: str) -> str:
    m = re.search(rf"\*\*{re.escape(key)}:\*\*\s*(.+)", body)
    return m.group(1).strip() if m else ""


def extract_section_content(body: str, header: str) -> str:
    for h, content in parse_sections(body):
        if h == header:
            return content
    return ""


def extract_bullets(block: str) -> list[str]:
    out: list[str] = []
    for line in block.splitlines():
        s = line.strip()
        if s.startswith("- "):
            b = s[2:].strip()
            if CHROME_RE.search(b):
                continue
            if "JAPANESE TRADITION TENSHINRYU" in b:
                continue
            if len(b) > 15:
                out.append(b)
    return out


def summarize_source_bullet(bullet: str, title: str, lang: str) -> str:
    clean = re.sub(r"│.*", "", bullet).strip()
    clean = re.sub(r"\s+", " ", clean)
    if len(clean) > 120:
        clean = clean[:117] + "…"
    short_title = re.sub(r"^Source:\s*", "", title, flags=re.I).strip()
    if lang == "es":
        if len(clean) < 25 or clean.count(" ") < 3:
            return f"Contenido del artículo «{short_title}» en international.tenshinryu.net."
        return clean
    if len(clean) < 25 or clean.count(" ") < 3:
        return f"Περιεχόμενο άρθρου «{short_title}» στο international.tenshinryu.net."
    return clean


def footer_links(slug: str, lang: str, src_link: str = "") -> str:
    en_l = rel_link(slug, "en", "inglés" if lang == "es" else "αγγλικά")
    ja_l = rel_link(slug, "ja", "japonés" if lang == "es" else "ιαπωνικά")
    if lang == "es":
        parts = []
        if src_link:
            parts.append(f"Fuente: {src_link}")
        parts.append(f"Versión completa: {en_l} · {ja_l}")
        return "\n\n".join(parts)
    parts = []
    if src_link:
        parts.append(f"Πηγή: {src_link}")
    parts.append(f"Πλήρες κείμενο: {en_l} · {ja_l}")
    return "\n\n".join(parts)


def fill_source_body(slug: str, fm: dict, en_body: str, lang: str) -> str:
    title = fm.get("title", slug)
    short = re.sub(r"^Source:\s*", "", title, flags=re.I).strip()
    h1_es = f"# Resumen de la fuente — {short}"
    h1_el = f"# Περίληψη πηγής — {short}"
    h1 = h1_es if lang == "es" else h1_el

    parts = [PARTIAL_BANNER[lang], "", h1, ""]
    for key in ("URL", "Fetched", "Raw"):
        val = extract_meta(en_body, key)
        if val:
            parts.append(f"**{META_TR[lang][key]}:** {val}")

    kt = extract_section_content(en_body, "Key takeaways")
    bullets = extract_bullets(kt)
    parts.extend(["", f"## {tr_header('Key takeaways', lang)}", ""])
    if bullets:
        for b in bullets[:8]:
            parts.append(f"- {summarize_source_bullet(b, title, lang)}")
    else:
        if lang == "es":
            parts.append(f"- Recorte web archivado en `raw/web/` relacionado con **{short}**.")
        else:
            parts.append(f"- Αρχειοθετημένο web clip στο `raw/web/` σχετικό με **{short}**.")

    for sec in (
        "Wiki pages updated from this source",
        "Wiki pages from this source",
        "Follow-up ingests from same site",
    ):
        block = extract_section_content(en_body, sec)
        links = extract_bullets(block)
        if links:
            parts.extend(["", f"## {tr_header(sec, lang)}", ""])
            for ln in links:
                parts.append(f"- {ln}")

    parts.extend(["", footer_links(slug, lang)])
    return "\n".join(parts)


def fill_kurai_body(slug: str, fm: dict, en_body: str, lang: str) -> str:
    parts = [PARTIAL_BANNER[lang], ""]
    h1_m = re.search(r"^#\s+.+", en_body, re.M)
    h1_text = h1_m.group(0) if h1_m else f"# {fm.get('title', slug)}"
    parts.extend([h1_text, ""])

    for h, content in parse_sections(en_body):
        if not h:
            for line in content.splitlines():
                s = line.strip()
                if not s or s.startswith("日本語:"):
                    continue
                if s == h1_text.strip() or s.lstrip("# ").strip() == h1_text.lstrip("# ").strip():
                    continue
                if s.startswith("**Also called:**"):
                    label = tr_header("Also called", lang)
                    parts.append(f"**{label}:**{s.split(':', 1)[1]}")
                elif s.startswith("**") and "—" in s:
                    parts.append(s)
                elif s.startswith("|"):
                    parts.append(s)
                elif len(s) > 20:
                    parts.append(localize_line(s, lang) if s.startswith("-") else s)
            continue
        parts.extend(["", f"## {tr_header(h, lang)}", ""])
        if content.startswith("|"):
            block = content
            if lang == "es":
                block = block.replace("| Kurai | Summary |", "| Kurai | Resumen |")
                block = block.replace(
                    "| Kurai | Aliases | Role (summary) |",
                    "| Kurai | Alias | Función (resumen) |",
                )
            else:
                block = block.replace("| Kurai | Summary |", "| Kurai | Περίληψη |")
                block = block.replace(
                    "| Kurai | Aliases | Role (summary) |",
                    "| Kurai | Ψευδώνυμα | Ρόλος (περίληψη) |",
                )
            parts.append(block)
        else:
            for line in content.splitlines():
                s = line.strip()
                if not s:
                    continue
                if s.startswith("- "):
                    parts.append(localize_line(s, lang))
                elif s.startswith("[[") or s.startswith("**"):
                    parts.append(s)
                else:
                    parts.append(localize_line(f"- {s}", lang) if len(s) > 30 else s)

    parts.extend(["", footer_links(slug, lang)])
    return "\n".join(parts)


def fill_guide_body(slug: str, fm: dict, en_body: str, lang: str) -> str:
    title = fm.get("title", slug)
    h1 = re.search(r"^#\s+.+", en_body, re.M)
    parts = [
        PARTIAL_BANNER[lang],
        "",
        h1.group(0) if h1 else f"# {title}",
        "",
    ]
    intro = extract_paragraphs(clean_en_body(en_body), 1)
    bullets = extract_bullets(clean_en_body(en_body))
    heading = "## Resumen" if lang == "es" else "## Περίληψη"
    parts.extend([heading, ""])
    if lang == "es":
        parts.append(
            "Texto pedagógico de **Kuwami Masakumo** (10.º Shike) para instructores de Tenshinryu Hyōhō."
        )
    else:
        parts.append(
            "Παιδαγωγικό κείμενο του **Kuwami Masakumo** (10ος Shike) για εκπαιδευτές Tenshinryu Hyōhō."
        )
    if bullets:
        parts.append("")
        sub = "## Condiciones clave" if lang == "es" else "## Βασικές προϋποθέσεις"
        parts.extend([sub, ""])
        for b in bullets[:6]:
            parts.append(f"- {b[:200]}{'…' if len(b) > 200 else ''}")
    elif intro:
        parts.extend(["", intro[0][:350] + ("…" if len(intro[0]) > 350 else "")])
    stem = source_stem(fm)
    src = f"[[sources/{stem}]]" if stem else ""
    parts.extend(["", footer_links(slug, lang, src)])
    return "\n".join(parts)


def fill_entity_body(slug: str, fm: dict, en_body: str, lang: str) -> str:
    title = fm.get("title", slug)
    h1_m = re.search(r"^#\s+.+", en_body, re.M)
    h1_text = h1_m.group(0) if h1_m else f"# {title}"
    parts = [PARTIAL_BANNER[lang], "", h1_text, ""]
    see_label = "Véase también" if lang == "es" else "Δείτε επίσης"

    for h, content in parse_sections(en_body):
        if h:
            parts.extend(["", f"## {tr_header(h, lang)}", ""])
        for line in content.splitlines():
            s = line.strip()
            if not s or s.startswith("日本語:"):
                continue
            if s == h1_text.strip() or (not h and s.startswith("# ")):
                continue
            if s.startswith("See also:"):
                parts.append(s.replace("See also:", f"{see_label}:"))
                continue
            if s.startswith("|"):
                parts.append(s)
            elif s.startswith("- "):
                parts.append(localize_line(s, lang))
            elif s.startswith("[[") or s.startswith("**"):
                parts.append(s)
            elif len(s) > 15:
                if h:
                    parts.append(localize_line(s, lang) if s.startswith("-") else s)
                else:
                    parts.append(s)

    if slug == "dojo/overview":
        branches = extract_section_content(en_body, "Branches")
        if branches:
            hdr = f"## {tr_header('Branches', lang)}"
            if hdr not in "\n".join(parts):
                parts.extend(["", hdr, "", branches])

    parts.extend(["", footer_links(slug, lang)])
    return "\n".join(parts)


def fill_article_body(slug: str, fm: dict, en_body: str, lang: str) -> str:
    title = fm.get("title", slug)
    h1 = re.search(r"^#\s+.+", en_body, re.M)
    paras = extract_paragraphs(clean_en_body(en_body), 2)
    parts = [PARTIAL_BANNER[lang], "", h1.group(0) if h1 else f"# {title}", ""]
    heading = "## Resumen" if lang == "es" else "## Περίληψη"
    parts.extend([heading, ""])
    if paras:
        for p in paras[:2]:
            text = p[:380] + ("…" if len(p) > 380 else "")
            if lang == "es":
                parts.append(
                    f"- Artículo de [tenshinryu.net](https://tenshinryu.net/): {text}"
                )
            else:
                parts.append(f"- Άρθρο από [tenshinryu.net](https://tenshinryu.net/): {text}")
    else:
        if lang == "es":
            parts.append(f"- Entrada de archivo desde tenshinryu.net — **{title}**.")
        else:
            parts.append(f"- Καταχώρηση αρχείου από tenshinryu.net — **{title}**.")
    stem = source_stem(fm)
    src = f"[[sources/{stem}]]" if stem else ""
    parts.extend(["", footer_links(slug, lang, src)])
    return "\n".join(parts)


def build_es_el_body(slug: str, fm: dict, en_body: str, lang: str) -> str:
    custom = ES_EL_SUMMARIES.get(slug, {}).get(lang)
    if custom:
        return generic_es_el_summary(slug, fm, en_body, lang)
    kind = page_kind(slug)
    builders = {
        "source": fill_source_body,
        "kurai": fill_kurai_body,
        "guide": fill_guide_body,
        "entity": fill_entity_body,
        "article": fill_article_body,
    }
    if kind in builders:
        return builders[kind](slug, fm, en_body, lang)
    return generic_es_el_summary(slug, fm, en_body, lang)


def generic_es_el_summary(slug: str, fm: dict, en_body: str, lang: str) -> str:
    title = fm.get("title", slug)
    paras = extract_paragraphs(clean_en_body(en_body), 2)
    stem = source_stem(fm)
    src_link = f"[[sources/{stem}]]" if stem else ""

    if lang == "es":
        banner = PARTIAL_BANNER["es"]
        heading = "## Resumen"
        en_l = rel_link(slug, "en", "inglés")
        ja_l = rel_link(slug, "ja", "japonés")
        footer = f"\n\nVersión completa: {en_l} · {ja_l}\n"
        if src_link:
            footer = f"\n\nFuente: {src_link}\n" + footer
    else:
        banner = PARTIAL_BANNER["el"]
        heading = "## Περίληψη"
        en_l = rel_link(slug, "en", "αγγλικά")
        ja_l = rel_link(slug, "ja", "ιαπωνικά")
        footer = f"\n\nΠλήρες κείμενο: {en_l} · {ja_l}\n"
        if src_link:
            footer = f"\n\nΠηγή: {src_link}\n" + footer

    h1 = re.search(r"^#\s+.+", en_body, re.M)
    h1_text = h1.group(0) if h1 else f"# {title}"

    parts = [banner, "", h1_text, "", heading, ""]
    custom = ES_EL_SUMMARIES.get(slug, {}).get(lang)
    if custom:
        parts.append(custom.strip())
    elif paras:
        parts.append(
            " *(Resumen automático del texto fuente; consulte la versión inglesa para detalle.)*\n"
            if lang == "es"
            else " *(Αυτόματη περίληψη· δείτε τα αγγλικά για λεπτομέρειες.)*\n"
        )
        for p in paras[:2]:
            parts.append(p[:400] + ("…" if len(p) > 400 else ""))
            parts.append("")
    else:
        parts.append(f"**{title}** — entrada del wiki Tenshinryu Hyōhō.")
    parts.append(footer.strip())
    return "\n".join(parts)


def fill_es_el(slug: str, lang: str, *, dry_run: bool, refill_kinds: set[str] | None = None) -> bool:
    path = WIKI / lang / f"{slug}.md"
    en_path = WIKI / "en" / f"{slug}.md"
    if not path.is_file() or not en_path.is_file():
        return False
    text = path.read_text(encoding="utf-8")
    pending = PENDING[lang] in text
    refill = (
        refill_kinds
        and page_kind(slug) in refill_kinds
        and PARTIAL_BANNER[lang] in text
    )
    if not pending and not refill:
        return False
    fm, _ = parse_frontmatter(text)
    _, en_body = parse_frontmatter(en_path.read_text(encoding="utf-8"))
    body = build_es_el_body(slug, fm, en_body, lang)
    new_text = fm_block(fm) + body + "\n"
    if not dry_run:
        path.write_text(new_text, encoding="utf-8")
    return True


def section_of(slug: str) -> str:
    return slug.split("/")[0] if "/" in slug else slug


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--ja-only", action="store_true")
    parser.add_argument("--es-el-only", action="store_true")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Fill all ES/EL pending stubs (not only priority list)",
    )
    parser.add_argument(
        "--refill-kinds",
        default="",
        help="Comma-separated page kinds to re-fill even when partial (kurai,entity,…)",
    )
    args = parser.parse_args()

    refill_kinds = {k.strip() for k in args.refill_kinds.split(",") if k.strip()}
    ja_n = es_n = el_n = 0
    es_by_sec: dict[str, int] = {}
    el_by_sec: dict[str, int] = {}

    def slug_list(lang: str) -> list[str]:
        if refill_kinds:
            loc = WIKI / lang
            slugs: list[str] = []
            for path in sorted(loc.rglob("*.md")):
                slug = str(path.relative_to(loc).with_suffix(""))
                if page_kind(slug) in refill_kinds:
                    slugs.append(slug)
            return slugs
        if args.all:
            return discover_stubs(lang)
        return list(PRIORITY_ES_EL)

    if not args.es_el_only:
        for slug in JA_STUB_SLUGS:
            if fill_ja(slug, dry_run=args.dry_run):
                ja_n += 1
                print(f"  JA: {slug}")

    if not args.ja_only:
        es_slugs = slug_list("es")
        el_slugs = slug_list("el")
        seen_es: set[str] = set()
        seen_el: set[str] = set()
        for slug in es_slugs:
            if slug in seen_es:
                continue
            seen_es.add(slug)
            if fill_es_el(slug, "es", dry_run=args.dry_run, refill_kinds=refill_kinds):
                es_n += 1
                sec = section_of(slug)
                es_by_sec[sec] = es_by_sec.get(sec, 0) + 1
                if args.all and es_n <= 5 or not args.all:
                    print(f"  ES: {slug}")
        for slug in el_slugs:
            if slug in seen_el:
                continue
            seen_el.add(slug)
            if fill_es_el(slug, "el", dry_run=args.dry_run, refill_kinds=refill_kinds):
                el_n += 1
                sec = section_of(slug)
                el_by_sec[sec] = el_by_sec.get(sec, 0) + 1
                if args.all and el_n <= 5 or not args.all:
                    print(f"  EL: {slug}")

    print(f"\nFilled: JA={ja_n}, ES={es_n}, EL={el_n}")
    if es_by_sec:
        print("ES by section:", dict(sorted(es_by_sec.items())))
    if el_by_sec:
        print("EL by section:", dict(sorted(el_by_sec.items())))
    if args.all:
        rem_es = len(discover_stubs("es"))
        rem_el = len(discover_stubs("el"))
        print(f"Remaining stubs: ES={rem_es}, EL={rem_el}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
