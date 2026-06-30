#!/usr/bin/env python3
"""Generate individual kurai wiki pages from catalog data."""

from __future__ import annotations

import re
from pathlib import Path

WIKI = Path(__file__).resolve().parents[1]
SOURCE = "raw/books/_root/ZB Copy of Tenshinryu Miden Kurai-no-Koto.txt"
UPDATED = "2026-06-29"

# slug -> dict with tier, names, aliases, en_body, ja_body, seiho (optional list)
KURAI: dict[str, dict] = {}


def entry(
    slug: str,
    tier: str,
    name_en: str,
    name_ja: str,
    aliases_en: list[str],
    aliases_ja: list[str],
    en_body: str,
    ja_body: str,
    seiho: list[str] | None = None,
) -> None:
    KURAI[slug] = {
        "tier": tier,
        "name_en": name_en,
        "name_ja": name_ja,
        "aliases_en": aliases_en,
        "aliases_ja": aliases_ja,
        "en_body": en_body.strip(),
        "ja_body": ja_body.strip(),
        "seiho": seiho or [],
    }


def fm(slug: str, lang: str, title: str, pair: str, tier: str, name_ja: str = "") -> str:
    tags = ["kurai", tier]
    if lang == "ja":
        tags.append("ja-primary-terms")
    return f"""---
slug: concepts/kurai/{slug}
lang: {lang}
title: "{title}"
pair: {pair}
tags: {tags}
tier: {tier}
sources:
  - {SOURCE}
updated: {UPDATED}
---

"""


def tier_parent(tier: str) -> str:
    return {
        "ten": "[[concepts/kurai/ten-no-kurai]]",
        "shin": "[[concepts/kurai/shin-no-kurai]]",
        "chi": "[[concepts/kurai/chi-no-kurai]]",
        "hyoho": "[[concepts/kurai/hyoho-kokoroe-no-kurai]]",
        "sanmi": "[[concepts/kurai/sanmi-no-kurai]]",
    }[tier]


def strip_md(text: str) -> str:
    return re.sub(r"[*#`_]", "", text).strip()


def write_page(lang: str, slug: str, data: dict) -> None:
    pair_lang = "ja" if lang == "en" else "en"
    pair = f"{pair_lang}/concepts/kurai/{slug}"
    if lang == "en":
        title = data["name_en"]
        aliases = data["aliases_en"]
        body = data["en_body"]
    else:
        title = data["name_ja"]
        aliases = data["aliases_ja"]
        body = data["ja_body"]

    parent = tier_parent(data["tier"])

    alias_block = ""
    if aliases:
        label = "Also called" if lang == "en" else "別名"
        alias_block = f"\n**{label}:** " + " · ".join(aliases) + "\n"

    seiho_block = ""
    if data["seiho"]:
        links = ", ".join(f"[[techniques/tachiai-12-kata/{s}]]" for s in data["seiho"])
        heading = "## 十二勢法での使用" if lang == "ja" else "## In twelve seiho"
        seiho_block = f"\n{heading}\n\n{links}\n"

    cross_link = (
        f"日本語: [../../ja/concepts/kurai/{slug}.md](../../ja/concepts/kurai/{slug}.md)"
        if lang == "en"
        else f"英語: [../../en/concepts/kurai/{slug}.md](../../en/concepts/kurai/{slug}.md)"
    )
    see_also = "## 関連" if lang == "ja" else "## See also"

    content = (
        fm(slug, lang, title, pair, data["tier"])
        + f"# {data['name_ja'] if lang == 'ja' else data['name_en']}\n\n"
        + f"{cross_link}\n"
        + alias_block
        + f"\n{body}\n"
        + seiho_block
        + f"\n{see_also}\n\n- {parent}\n- [[concepts/miden-kurai-no-koto]]\n- [[concepts/kurai/fundamentals]]\n"
    )
    out = WIKI / "wiki" / lang / "concepts" / "kurai" / f"{slug}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(content, encoding="utf-8")


# --- TEN NO KURAI ---

entry(
    "kumoi-no-kurai", "ten", "Kumoi-no-Kurai 雲居の位", "雲居の位",
    ["Kenjodan", "Tenjodan", "Raito 雷刀"],
    ["剣上段", "拳上段", "天上段", "雷刀"],
    """
**Kumoi (雲居)** — " dwelling in the clouds / far high sky." Sword raised as if to pierce heaven with the kissaki.

## Body

- Right elbow **extended**; fists and sword at **Nakazumi (中墨)**
- Sword tilted slightly **back**
- Left fist must **not** pass forehead — forehead and little-finger side of left fist in one line
- Back foot: **Kagiashi**

## Role

- Attack; waiting kurai for **Sasoibara** (誘い腹 — invite cut to abdomen)
- Strike from this kurai said to be the **fastest**

## Variations

Left or right foot forward; **Shumokuashi**; **Tendachi** — all **Taimen (対面 / Tosyadachi 刀者立)**

## Battojutsu

After **straight vertical cut**, step back **≥6 shaku (180 cm+)** into Kumoi.
""",
    """
**雲居（くもい）** — 高く遠い大空。切っ先で天を刺すイメージ。

## 体勢

- 右肘 **伸ばす**；拳・刀は **中墨**
- 切っ先やや **後傾**
- 左拳は額より前に出さず — 額と左拳小指側が一直線
- 後足 **鈎足**

## 役割

- 攻撃；**誘い腹** の待ち位
- この位からの斬撃は **最速** とされる

## 変化

左右前足、**撞木足**、**点立** — いずれも **対面（刀者立）**

## 抜刀

**真っ向切り下ろし** の後、**六尺以上** 引いて雲居。
""",
    seiho=["nukiai", "nukidome", "ninotachigaeshi", "karamegaeshi", "gyakuto", "sodegaeshi"],
)

entry(
    "sekiun-no-kurai", "ten", "Sekiun-no-Kurai 切雲の位", "切雲の位",
    ["Setsuun-no-Kurai", "Raitokuzushi 雷刀崩"],
    ["截雲の位", "雷刀崩"],
    """
Sideways tilt **from Kumoi-no-Kurai**. **Sekiun (切雲)** — cut through clouds in the sky.

## Transition

From Kumoi: bend both elbows outward; sword diagonally back-right.

## Body

- Left foot forward → **Hanmi (半身 / Sosyadachi 槍者立)**
- Twist to face enemy at angle; **left elbow must not come forward**
- Left wrist aligned with left temple; forehead–left fist line preserved
- Back foot: **Kagiashi**

## Role

Offensive; frequent **makko (真っ向)** vertical cut as **Kotosya** (batto) or **Uchikata** (kenjutsu attacker).
""",
    """
**雲居** から刀を横に倒した位。**切雲** — 雲を切り裂く。

## 移行

雲居から両肘を横に開き、刀を右後方へ斜めに。

## 体勢

- 左前足 → **半身（槍者立）**
- 左肘を前に出さない；左腕と左こめかみの線
- 後足 **鈎足**

## 役割

攻位；**攻刀者**・**打方** の **真っ向** 斬撃に多用。
""",
    seiho=["nukiai", "nukidome", "ninotachigaeshi", "karamegaeshi", "gyakuto", "sodegaeshi"],
)

entry(
    "hasso-no-kurai", "ten", "Hasso-no-Kurai 八草の位", "八草の位",
    ["Kesa-no-Kurai 袈裟の位"],
    ["袈裟の位"],
    """
**Hasso (八草)** — tall grass; sword represents grass. Ideal for **Kesagake (袈裟懸け)**.

## In (陰) vs Yo (陽)

| Side | Hand placement |
|------|----------------|
| **In** (right) | Back of **left** hand on **right cheek** |
| **Yo** (left) | Back of **right** hand below **left ear** |

- Elbows natural (like holding a phone)
- Kissaki slightly back from vertical — do not let sword fall left/right
- **Hanmi** + **Kagiashi**

## Role

Best kurai for **rushing attack** — sword close to body, smooth movement. When inviting attack, front elbow may thrust forward.
""",
    """
**八草** — 高い草。刀は草に見立てる。**袈裟懸け** に適す。

## 陰・陽

| | 手の位置 |
|---|----------|
| **陰** | 左手の甲を **右頬** に |
| **陽** | 右手の甲を **左耳下** に |

- 肘は自然（携帯を持つ如く）
- 切っ先は垂直よりやや後傾
- **半身** + **鈎足**

## 役割

**突進攻撃** に最良。誘い時は前肘を突き出す形も。
""",
    seiho=["makihazushi", "yokemigaeshi"],
)

entry(
    "ogesa-no-kurai", "ten", "Ogesa-no-Kurai 大袈裟の位", "大袈裟の位",
    ["Syadachi 斜太刀", "Large Kesa-no-Kurai"],
    ["斜太刀", "大きな袈裟の位"],
    """
Large **Hasso-no-Kurai** — raise sword diagonally high from Hasso.

- **Hanmi** + **Kagiashi**
- Powerful slashing attacks
- **Kaisha-kenjutsu**: when helmet blocks Hasso, use Ogesa instead

## Battojutsu

After **Kesagake**, retreat **~180 cm+** into Ogesa.
""",
    """
**八草** から刀を斜め高く上げた位。**大（おお）** 袈裟。

- **半身** + **鈎足**
- 介者剣術：兜で八草が取れない時に用いる

## 抜刀

**袈裟懸け** の後 **六尺以上** 退いて大袈裟。
""",
    seiho=["makihazushi", "yokemigaeshi"],
)

entry(
    "mangetsu-no-kurai", "ten", "Mangetsu-no-Kurai 満月の位", "満月の位",
    ["Jodan-no-kamae"],
    ["上段の構え"],
    """
**Mangetsu (満月)** — full moon. Hide **blade**; show only **tsukagashira** or left fist like the moon.

- Sword at Nakazumi, above head
- Left fist not past forehead; forehead–fist line
- Left elbow not forward
- **Taimen**; back foot **Kagiashi** to **Chojiashi**
""",
    """
**満月** — 刃を見せず **柄頭** 或いは左拳のみを満月の如く見せる。

- 中墨上、頭上
- 左拳は額より前に出さない
- **対面**；後足 **鈎足**〜**丁字足**
""",
)

entry(
    "toriikuzushi-no-kurai", "ten", "Toriikuzushi-no-Kurai 鳥居崩の位", "鳥居崩の位",
    ["Variant of Torii-no-Kurai"],
    ["鳥居の位の変形"],
    """
Variant of **Torii-no-Kurai** (not fully detailed in this volume) — shrine gate **kasagi** horizontal line.

## Body

- Right fist above **right temple**
- Left **hirade (平手)** supports sword at **monouchi** (or thumb/index lift)
- **Hanmi** + **Chojiashi**

## Role

Defense that can **attack immediately**.
""",
    """
**鳥居の位** の **崩（くず）し** — 神社鳥居の **笠木** の如く。

- 右拳を右こめかみ真上
- 左手 **平手** で **物打** 付近を支える
- **半身** + **丁字足**

守りから即攻め可能。
""",
)

entry(
    "yokobue-no-tachi-ten", "ten", "Yokobue-no-Tachi (Ten) 横笛太刀・天", "横笛太刀（天の位）",
    ["Transverse flute stance — heaven tier"],
    ["天の位の横笛太刀"],
    """
Sword horizontal like blowing **shinobue (横笛)**. Variation of **Hasso-no-Kurai**.

## Body

- Kissaki to the side; both elbows bent; **mine on forearms**
- **Taimen**; **Kagiashi** to **Chojiashi**

## Hyoho — Shimpo / Hikari-no-Koto

- **Backlight**: blade covers both eyes; watch enemy through gap between blade and forearm
- Reflect light to dazzle enemy

## Tradition

Until **Yagyu Sekishusai**, only **In-no-Kurai** (edge left); **Yagyu Munenori** invented **Yo-no-Kurai**.

## Jutka

> 斜陽浴び横笛吹く躰の待（守り）の太刀  
> *Defensive flute posture bathed in slanting sun.*
""",
    """
**八草** の変形。刀を横に **篠笛** を吹く如く。

- **対面**；**鈎足**〜**丁字足**
- **心法・光の事**：逆光で目を覆い、刃と腕の隙から敵を見る

## 術歌

> 斜陽浴び横笛吹く躰の待（守り）の太刀
""",
)

entry(
    "tate-no-kurai-ten", "ten", "Tate-no-Kurai (Ten) 楯の位・天 — Ippo", "楯の位（天）— 一峯の位",
    ["Tatedachi", "Ippo-no-Kurai 一峯の位"],
    ["楯太刀", "一峯の位"],
    """
**Tate (楯)** — shield at **Nakazumi**.

## Ten tier — Ippo (一峯)

- Left hand mouth height; **tsuba** at face (eyes/mouth)
- Sword high like **one mountain peak**
- Elbows bent **outward** — invite cut to elbows ("grass on the mountain")
- **Taimen**; **Kagiashi** to **Chojiashi**
- Alternate: fist higher, elbow pointed **down** instead of out
""",
    """
**楯** — 中墨に盾の如く構える。

## 天の位 — 一峯

- 左手口の高さ；**鍔** は顔（目・口）
- **一峰** の如く高い山
- 肘を **外** に開き肘を誘う（山上の草）
- **対面**；**鈎足**〜**丁字足**
""",
)

entry(
    "jyatai-no-kurai-ten", "ten", "Jyatai-no-Kurai (Ten) 蛇躰の位・天", "蛇躰の位（天）",
    ["Snake body — heaven tier"],
    ["蛇躰 — 天"],
    """
**Jyatai (蛇躰)** — snake raising its head. Also **Chiburui (血振)**.

## Body (Ten)

- Right wrist bent out; kissaki toward floor
- Inside of both wrists together at **face center**
- Body leaned forward; hide behind sword
- **Taimen** + **Chojiashi**

## Note

Unusual form — confuses enemy **if** offense/defense from here is trained; otherwise empty threat. True for all kurai and techniques.
""",
    """
**蛇躰** — 蛇が頭を上げる形。**血振い** にも。

- 右首を外に折り切っ先床へ；両手首内側を合わせ顔中央
- 前傾し刀の後ろに身を隠す
- **対面** + **丁字足**

未知の位は敵も対処困難 — 十分な攻防稽古がなければ虚勢に終わる。
""",
)

entry(
    "nokihagakure-no-kurai", "ten", "Nokihagakure-no-Kurai 軒端隠の位", "軒端隠の位",
    ["Kasumi-no-kamae 霞の構え", "Nokiha family"],
    ["霞の構え", "軒端一系"],
    """
**Nokiha (軒端)** — eaves of a house. **Gakure (隠)** — hide under the eaves.

Part of **Nokiha-no-Kurai / Nokihadachi** (with Nozoki, Hagake, Ten/Shin/Chi variants).

## In / Yo

| | Hand | Kissaki targets |
|---|------|-----------------|
| **In** | Right hand back on **forehead** | Enemy's **left eye** |
| **Yo** | Left hand back on **forehead** | Enemy's **right eye** |

Forearm and sword in straight line (right for In, left for Yo). **Hanmi** + **Chojiashi**.

## Hyoho

- **Ame-no-koto** / **Ase-no-koto** — hand blocks rain and sweat (teko/sleeve)
- **Hikari-no-koto** — block sunlight
""",
    """
**軒端隠** — 軒端に隠れる如く。**軒端太刀** 一系。

## 陰・陽

| | 手 | 切っ先 |
|---|-----|--------|
| **陰** | 右手の甲を **額** に | 敵 **左眼** |
| **陽** | 左手の甲を **額** に | 敵 **右眼** |

**半身** + **丁字足**。雨・汗・光の兵法（**雨の事**、**汗の事**、**光の事**）。
""",
)

# --- SHIN NO KURAI ---

entry(
    "seigan-no-kurai", "shin", "Seigan-no-Kurai 青眼の位", "青眼の位",
    ["Seigan 静眼 (observe)", "Seigan 勢眼 (intensity)"],
    ["静眼", "勢眼"],
    """
Tenshinryu writes **青眼**. Other styles use many kanji (正眼, 晴眼, 星眼, etc.).

## Body

- **Tsukagashira** at **Suigetsu (水月)** height
- Kissaki between enemy's **eyes**
- Elbows slightly bent, not extended
- **Hanmi** + **Kagiashi** ( **Taimen** on Bajyodachi)

## Kanji nuance

| Writing | Meaning |
|---------|---------|
| **静眼** | Watch enemy **quietly** |
| **勢眼** | Show **momentum** — ready for immediate **Kojin (攻刃)** or aggressive opportunity |

## Role

Highly **defensive** — standard **zanshin** finish in twelve seiho after Kumoi/Sekiun chain.
""",
    """
天心流は **青眼** と表記。

## 体勢

- **柄頭** を **水月** の高さ
- 切っ先は敵 **両眼の間**
- 肘やや曲げ、伸ばさない
- **半身** + **鈎足**

## 静眼／勢眼

| | 意味 |
|---|------|
| **静眼** | 静かに見る |
| **勢眼** | 勢いを見せ、即応 |

**残心** の定番位。
""",
    seiho=["omokage", "nukiai", "nukidome", "makihazushi", "yokemigaeshi", "sodegaeshi", "shihogiri", "gyakuto", "marukibashi", "ninotachigaeshi", "karamegaeshi"],
)

entry(
    "katame-hazushi-seigan", "shin", "Katame Hazushi Seigan 片目外しの青眼", "片目外しの青眼",
    ["Seigan kuzushi", "Hidari Seigan Metsuke"],
    ["青眼崩の位", "左青眼目付の位"],
    """
From **Seigan**: tip at enemy's **left eye**; both fists to **left hip**; sword diagonal.

- **Katame (片目)** — one eye; **Hazushi (外し)** — shifted off center
- **Hanmi**; **Chojiashi** to **Kagiashi**

## Role

**Sasoigaeshi (誘い返)** — show weak point, invite attack, counter on their commit.

Used in **Nukidome** (tsume at throat after cut).
""",
    """
**青眼** から切っ先を敵 **左眼** へ；両拳 **左腰**；刀を斜めに。

**誘い返** — 弱みを見せ誘う。**抜留** の **詰め** に関連。
""",
    seiho=["nukidome"],
)

entry(
    "tate-no-kurai-shin", "shin", "Tate-no-Kurai (Shin) 楯の位・真 — Chuho", "楯の位（真）— 中峯",
    ["Tatedachi", "Chuho / Nakamin 中峯"],
    ["楯太刀", "中峯"],
    """
Shield at chest — **tsuba** centered on chest. Natural elbows, not forward.

- **Taimen**; **Kagiashi** to **Chojiashi**
- **Chuho (中峯)** — "middle peak" (low mountain vs Ten's Ippo)

Impregnable defense, easy transition to attack.
""",
    """
**鍔** が胸中央。**中峯** — 一峯より低い山。

堅守しつつ攻め移行しやすい。**対面**。
""",
)

entry(
    "jyatai-no-kurai-shin", "shin", "Jyatai-no-Kurai (Shin) 蛇躰の位・真", "蛇躰の位（真）",
    [],
    [],
    """
Same snake imagery as Ten tier; wrists at **chest center** (not face). Less forward lean than Ten version.

- **Taimen**; **Kagiashi** to **Chojiashi**
- **Chiburui** use
""",
    """
天の蛇躰より **前傾控えめ**；手首は **胸** 中央。**血振い**。
""",
)

entry(
    "nokiha-nozoki-no-kurai", "shin", "Nokiha Nozoki-no-Kurai 軒端覗の位", "軒端覗の位",
    ["Nokiha family"],
    ["軒端一系"],
    """
**Nozoki (覗)** — peeking from under eaves.

- Blade upward; kissaki at enemy; fist center at chest **Nakazumi**
- In: right forearm + sword straight line; Yo: left forearm + sword
- **Hanmi** + **Chojiashi**
""",
    """
**軒端覗** — 軒端から覗く。刃上、切っ先を敵に；拳中心は胸 **中墨**。**半身** + **丁字足**。
""",
)

entry(
    "katagake-no-kurai", "shin", "Katagake-no-Kurai 肩掛の位", "肩掛の位",
    [],
    [],
    """
**Katagake** — sword **mine** on shoulder. Basic: **Yo (陽)** side.

- Tsukagashira at Suigetsu; blade tilted slightly **out** (protect ears)
- **Hanmi** + **Kagiashi** (Taimen on Bajyodachi)

## Role

Low fatigue for long holds — **Zanshin**, especially after **Kesahazushi**. Used in **Marukibashi**, **Shihogiri**.
""",
    """
**峰** を肩に掛ける。**陽** が基本。

**残心** に優；**袈裟外** 後。**丸木橋**・**四方切** でも。
""",
    seiho=["marukibashi", "shihogiri"],
)

entry(
    "kisodezuka", "shin", "Kisodezuka 亀袖柄", "亀袖柄",
    ["Kisode", "Kame-no-kubi", "Kitozuka"],
    ["亀袖", "亀の首", "亀頭柄"],
    """
**Turtle in sleeve** — Seigan-like tsuka close to body; both elbows on **ribs**.

- **Taimen** + **Kagiashi**
- Foot width: **Shabokudachi** (one fist narrower than Roboku)

## Role

Endurance in long/cold fights; **maai** control; impregnable yet offensive.
""",
    """
**亀袖** — 拳を袖に隠した如く；肘を肋骨に。**間合** 制御；持久戦に有利。
""",
)

entry(
    "kaedegakure-no-kurai", "shin", "Kaedegakure-no-Kurai 楓隠の位", "楓隠の位",
    [],
    [],
    """
From **Suigetsu** line: left hand opens as **maple leaf (楓)** thrust forward to invite attack; sword hidden behind body.

- **Hanmi** + **Nenoashi**
- Foot width **Shabokudachi** (narrower than Suigetsu/Roboku)
- Right side tightened; sword fully hidden
""",
    """
**水月** 系から左手を **楓** の如く突き出し誘う；刀は体の後ろに隠す。**根ノ足**。
""",
)

entry(
    "yokobue-no-tachi-shin", "shin", "Yokobue-no-Tachi (Shin) 横笛太刀・真", "横笛太刀（真）",
    [],
    [],
    """
Shin-tier Yokobue — body slightly forward; tip lowered. Waiting kurai — enemy aims at fists/head.

- **Hanmi**; **Chojiashi** to **Kagiashi**
- Defends against Ten, Shin, and Chi line attacks
""",
    """
真の横笛 — 切っ先を下げ待つ。上・中・下段攻撃に防御可能。
""",
)

entry(
    "yunzei-shishi-no-mai", "shin", "Yunzei Shishi-no-Mai 弓勢獅子舞", "弓勢獅子舞",
    ["Bow power + lion dance"],
    ["弓勢・獅子舞"],
    """
**Yunzei (弓勢)** — bow-drawing power; body bent like bow. **Shishi-no-Mai** — lion dance unpredictability.

- **Koden** / **Kaisha-kenjutsu**; **Nukarumi (泥濘)** mud tactics
- Left forward; **Robokudachi** wide; mine on left shoulder (**Katagake**); twist right; extreme forward lean
- **Jijibaba-no-Koshi (爺婆腰)** — old bent back
- **Suijin-no-Ashi (酔人足)** + **Henten** — drunkard/lion movement around enemy In side
- Teaching: *"The form is not the form. Hold the sword and do not hold it."*

## Jutka

> 泥濘に誘いて曲木の獅子の舞い  
> *Lure enemy into mud; lion dance in Kyokubokudachi.*
""",
    """
**古伝泥濘** — 泥地戦。**爺婆腰** で極低姿勢。**酔人足**・**変転**。

## 術歌

> 泥濘に誘いて曲木の獅子の舞い
""",
)

# --- CHI NO KURAI ---

entry(
    "suigetsu-no-kurai", "chi", "Suigetsu-no-Kurai 水月の位", "水月の位",
    ["Yokoguruma", "Kurumadachi", "Hokoku / Minetani 峰谷"],
    ["横車", "車太刀", "峰谷の位"],
    """
**Suigetsu (水月)** — moon on water; Buddhist **ku (空)**; also solar plexus.

Waiting on water's surface — strike when enemy's foot **enters the water** (moonlight moment). Enemy's cut does not reach body.

- Tsukagashira at Suigetsu like Seigan; tip opened **outward** at side
- Show only tsukagashira/left fist; hide blade
- Full **Hanmi**, far forward lean; **Nenoashi**; right foot diagonal back
- **Minetani (峰谷)** — expose shoulder valley to enemy
""",
    """
**水月** — 水面に立ち待つ位。敵の足が水に入る瞬間を狙う。**峰谷** を見せる。
""",
)

entry(
    "jisuri-no-seigan", "chi", "Jisuri-no-Seigan 地摺の青眼", "地摺の青眼",
    [],
    [],
    """
Seigan with forward lean; **kissaki down** dragging ground (**Ji-suri 地摺**).

- Invites attack (vs Seigan restraining between eyes)
- Fists close to body; **Hanmi**; **Chojiashi** to **Kagiashi**
- Conserves energy in prolonged battle
""",
    """
**青眼** から切っ先を **地を摺る** 如く下げて誘う。持久戦で有利。
""",
)

entry(
    "chi-no-kurai-kuzushi", "chi", "Chi-no-Kurai-Kuzushi 地の位崩し", "地の位崩し",
    [],
    [],
    """
**Jisuri-no-Seigan** with tip turned **left/right** — or dropped from **Katame Hazushi Seigan**.

Tip **off center front** — easier to bait attack. Same waiting advantage as Jisuri; less fatigue in long fights.
""",
    """
**地摺の青眼** から切っ先を左右へ。**誘い** の待ち位。
""",
)

entry(
    "tsuka-otoshi-mune-no-to", "chi", "Tsuka Otoshi-mune-no-To 柄落胸刀", "柄落胸刀",
    [],
    [],
    """
Hilt dropped back; sword on **chest**. Impregnable defense.

- Full **Hanmi**, forward lean; **Nenoashi**
- Mine on **left shoulder**; see enemy beyond kissaki
- **Kaisha** armor effect; reduces target area in **suhada** too
""",
    """
柄を後ろに落とし胸刀。**介者**・**素肌** とも靶面を最小化。
""",
)

entry(
    "nokihagake-no-kurai", "chi", "Nokihagake-no-Kurai 軒端掛の位", "軒端掛の位",
    [],
    [],
    """
**Kake (掛)** — sitting on eaves edge; knees bent as if perched on eaves.

- Hands center at **Nakazumi**; left hand thumb + index only on tsuka
- **Hanmi**, far forward; **Nenoashi** to **Chojiashi**
- Deeper invite than **Chi-no-Kurai-Kuzushi** — sword further back/side
""",
    """
**軒端掛** — 軒端に腰掛ける如く。左手は親指と人差し指のみ。**深い誘い**。
""",
)

entry(
    "yokobue-no-tachi-chi", "chi", "Yokobue-no-Tachi (Chi) 横笛太刀・地", "横笛太刀（地）",
    [],
    [],
    """
Chi-tier Yokobue — waiting; no longer flute imagery. Impregnable vs all three height lines.
""",
    """
地の横笛 — 待ち位。三段防御に優れる。
""",
)

entry(
    "tate-no-kurai-chi", "chi", "Tate-no-Kurai (Chi) 楯の位・地", "楯の位（地）",
    [],
    [],
    """
**Inverted shield** — from Shin Tate, return sword right; tip to **ground**; diagonal down-right.

- Left open hand on tsukagashira at Nakazumi
- **Taimen**; **Chojiashi** to **Kagiashi**
- Instant draw/cut via **leverage** despite odd appearance
""",
    """
**逆楯** — 切っ先地面；左 **平手** で柄頭。**杠杆** で即抜刀。
""",
)

# --- HYOHO KOKOROE ---

entry(
    "aigane-no-kurai", "hyoho", "Aigane-no-Kurai 相鐘の位", "相鐘の位",
    ["Manego", "Dotai", "Itsuwari-no-Ken", "Utsushikagami", "Senbenbanka"],
    ["マネ碁", "同体", "偽りの剣", "写し鑑", "千変万化相鐘"],
    """
Mirror enemy's kurai like **Manego** in Go — copy their stance changes.

- **Aigane (相鐘)** — bells echoing same sound
- **Itsuwari-no-Ken (偽りの剣)** — Yagyu Munenori: pretend you know their style
- **Aiki-no-Kokoroe (相氣の心得)** — read enemy intent through shared form

Neutralizes planned advantage; counters odd stances.
""",
    """
敵の位を **写し** て同形に。**相氣の心得** — 敵の意図を探る。
""",
)

entry(
    "kyo-no-kurai", "hyoho", "Kyo-no-Kurai 虚の位", "虚の位",
    ["Obie-no-Koto", "Kyoshin 脅身"],
    ["怯えの事", "脅身の位"],
    """
**Kyo (虚)** — emptiness; pretend weakness (**Obie** — fear). Exploit enemy carelessness.

*Heiha Kidonari* — all warfare is deception. Public Bushido vs battlefield pragmatism.

Includes backing away in apparent fear (**Kyoshin-no-Kurai**).
""",
    """
**虚** — 弱みを装う。**兵者詭道也**。
""",
)

entry(
    "kyoshin-no-kurai", "hyoho", "Kyoshin-no-Kurai 虚身の位", "虚身の位",
    [],
    [],
    """
Feign injury/disability:

- Hidden thumb; splint arm (breakaway branch); pebble in tabi; carp-scale "blindness"; deaf-mute act; battle fatigue

## Jutka

> 虚躰の位で立ち相う誘い太刀
""",
    """
欠損・負傷を装う（拇指、肘当、小石、盲目、聾唖、疲労）。

## 術歌

> 虚躰の位で立ち相う誘い太刀
""",
)

entry(
    "fukyo-no-kurai", "hyoho", "Fukyo-no-Kurai 負境の位", "負境の位",
    [],
    [],
    """
**Desperation edge** — adrenaline at life-or-death (fire escape chest story). Don't give up; don't misjudge moment of death; enemy may also surge when cornered.
""",
    """
**負境** — 窮地で潜在能力が開花。敵も窮地では倍増しうる。
""",
)

entry(
    "majikiri-no-kurai", "hyoho", "Majikiri-no-Kurai 間じ切の位", "間じ切の位",
    ["Majikiri", "Utsurikawari"],
    ["間仕切り", "移り変わり"],
    """
**Majikiri (間じ切)** — divide space; change kurai mid-fight (**Utsurikawari**).

At **Kirima (截間)** — sudden kurai change triggers enemy reflex or false defense. Regain rhythm in stalemate. Mind warfare under lethal tension.
""",
    """
**截間** で位を変え敵の反射を誘発。膠着打破。
""",
)

# --- SANMI NO KURAI (standing bodies) ---

entry(
    "robokudachi", "sanmi", "Robokudachi 老木立", "老木立",
    ["Kyokubokudachi 曲木立", "Kodendachi 古伝立"],
    ["曲木立", "古伝立"],
    """
**Roboku (老木)** — old tree; **Kyokuboku (曲木)** — crooked tree bent over time. Standard standing body in Tenshinryu, derived from **Kaisha-Kenjutsu (介者剣術)** — swordsmanship in armor from the pre-Edo battlefield era.

## Body

- Feet **wide**; both knees **deeply** bent; hips **low**
- Lower center of gravity — posture of a tree bent for decades
- Guideline: ~**one fist** between front heel and back knee when back knee touches floor

## Training notes

Painful at first; movement feels restricted. With skill, posture becomes easier and footwork more flexible. Many **chi-tier** kurai (e.g. Suigetsu) use Roboku width as reference.

## Lineage context

**Koden (古伝)** — lore from before Edo; Kodendachi = standing for armored warfare. Contrasts with **Shabokudachi** (Edo / suhada) and **Chikubokudachi** (Owari Yagyu upright line).
""",
    """
**老木**・**曲木** — 長年曲った木の如く膝深く腰を落とす。介者剣術由来；天心流の標準立ち。

## 体

- 足幅広く、両膝深く曲げ腰低く
- 後膝を床につけた時、前踵と後膝の間 **約一拳**（目安）

## 稽古

初めは辛いが、習熟で足運びが柔らかくなる。地の位（例：水月）の足幅基準にもなる。

## 系譜

**古伝立** — 戦国・甲冑剣術の立ち。斜木立（江戸・素肌）・竹木立（尾張）と対比。
""",
)

entry(
    "shabokudachi", "sanmi", "Shabokudachi 斜木立", "斜木立",
    ["Edodachi 江戸立", "Yokyokudachi 謡曲立"],
    ["江戸立", "謡曲立"],
    """
**Shaboku (斜木)** — tree growing at an angle. Knees slightly bent; torso forward — gentler than Robokudachi. Associated with **Suhada-Kenjutsu (素肌剣術)** — unarmored Edo-period practice.

## Names

- **Edodachi (江戸立)** — antonym of **Owaridachi / Chikubokudachi** (Owari Yagyu line)
- **Yokyokudachi (謡曲立)** — forward lean like **Noh** actors

## Body

- Foot width **narrower than Robokudachi**: front heel and back knee in a **straight line** when back knee touches floor
- Less knee flexion and forward lean than Roboku

## Usage

Default width for many **shin-tier** kurai (e.g. Seigan, Katagake). Balances mobility with stable hanmi.
""",
    """
**斜木** — 斜めに生えた木。膝をやや曲げ上体を前傾；老木立より緩やか。**素肌剣術**・江戸柳生系の立ち。

## 別名

- **江戸立** — 尾張立（竹木立）の対
- **謡曲立** — 能役者の前傾

## 体

- 足幅は老木より狭く、後膝を床につけた時 **前踵と後膝が一直線**
- 真の位（例：正眼・肩掛）の標準足幅

## 稽古

老木・竹木との **三躰バランス** が実戦対応の基礎。
""",
)

entry(
    "chikubokudachi", "sanmi", "Chikubokudachi 竹木立", "竹木立",
    ["Chokubokudachi 直木立", "Owaridachi 尾張立", "Tsuttachi つったち"],
    ["直木立", "尾張立", "つったち"],
    """
**Chikuboku (竹木)** — stand straight like bamboo without bending knees and hips. Basic stance of **Owari Yagyu (尾張柳生)** via **Tsuttatsutarumi-no-Kurai (直立たる身の位)** after **Genna enbu (元和偃武)**.

## Names

- **Owaridachi (尾張立)** vs **Edodachi (江戸立 / Shabokudachi)**
- **Chokubokudachi (直木立)** — straight tree
- **Tsuttachi (つったち)** — upright posture name in Owari transmission

## Body

- Feet ~**shoulder-width**; knees lightly unlocked (not locked straight)
- Front-to-back: ~**one foot** (toe to heel)
- Back heel slightly raised when weight is forward

## Tactics

From Chikuboku, **drop posture** to reach **far maai** — spacing advantage. Cited in Yukansho / Yagyu Jubei tradition as best for **beginners' upper-body training** in the Genna era.

## Lineage

Yagyu Toshitoshi (利厳) brought Shinkageryu to Owari; Edo line (Munenori) favored Shaboku. Tenshinryu trains all three — no single "best" stand in real combat.
""",
    """
**竹木** — 竹の如く膝腰を大きく曲げず立つ。尾張柳生の **直立たる身の位**；元和偃武以降の基本立ち。

## 別名

- **尾張立** — 江戸立（斜木）の対
- **直木立**・**つったち**

## 体

- 両足肩幅、膝は軽く緩める（完全に伸ばし切らない）
- 前後幅は足一足分；重心前の時は後踵をやや上げる

## 戦術

ここから腰を落とせば **遠間** を取れる。初学者の上半身修練に最適（幽観書・柳生十兵衛伝承）。

## 系譜

利厳が尾張に新陰流を伝えた立ち。天心流は三躰を **バランス** よく稽古する。
""",
)


def update_catalog(lang: str, tier: str, catalog_file: str, section_title: str) -> None:
    path = WIKI / "wiki" / lang / "concepts" / "kurai" / catalog_file
    if not path.exists():
        return
    items = [(s, d) for s, d in sorted(KURAI.items(), key=lambda x: x[1]["name_en"]) if d["tier"] == tier]
    lines = [path.read_text(encoding="utf-8").split("## ")[0].rstrip()]
    lines.append(f"\n## {section_title}\n")
    if lang == "ja":
        lines.append("| 位 | 概要 |")
    else:
        lines.append("| Kurai | Summary |")
    lines.append("|-------|---------|")
    for slug, d in items:
        name = d["name_ja"] if lang == "ja" else d["name_en"]
        link = f"[[concepts/kurai/{slug}|{name}]]"
        body = d["ja_body"] if lang == "ja" else d["en_body"]
        summary_line = next((ln.strip() for ln in body.split("\n") if ln.strip()), name)
        summary = strip_md(summary_line)[:80]
        lines.append(f"| {link} | {summary}… |")
    see_also = "## 関連" if lang == "ja" else "## See also"
    lines.append(f"\n{see_also}\n")
    lines.append("- [[concepts/miden-kurai-no-koto]]\n")
    lines.append("- [[concepts/kurai/fundamentals]]\n")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    for slug, data in KURAI.items():
        write_page("en", slug, data)
        write_page("ja", slug, data)
    update_catalog("en", "ten", "ten-no-kurai.md", "Individual pages")
    update_catalog("en", "shin", "shin-no-kurai.md", "Individual pages")
    update_catalog("en", "chi", "chi-no-kurai.md", "Individual pages")
    update_catalog("en", "hyoho", "hyoho-kokoroe-no-kurai.md", "Individual pages")
    update_catalog("ja", "ten", "ten-no-kurai.md", "各ページ")
    update_catalog("ja", "shin", "shin-no-kurai.md", "各ページ")
    update_catalog("ja", "chi", "chi-no-kurai.md", "各ページ")
    update_catalog("ja", "hyoho", "hyoho-kokoroe-no-kurai.md", "各ページ")
    print(f"Generated {len(KURAI) * 2} kurai pages ({len(KURAI)} slugs)")


if __name__ == "__main__":
    main()
