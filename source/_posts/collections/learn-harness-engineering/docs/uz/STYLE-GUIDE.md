---
title: Oʻzbekcha tarjima uslub qoʻllanmasi
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/uz/STYLE-GUIDE/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# Oʻzbekcha tarjima uslub qoʻllanmasi

Ushbu hujjat `docs/uz/` ostidagi barcha tarjimalar uchun majburiy. LQA tekshiruvi shu qoidalarga muvofiq oʻtkaziladi.

## 1. Orfografiya

### Maxsus belgilar

| Notoʻgʻri | Toʻgʻri | Belgi (Unicode) |
|-----------|---------|-----------------|
| `o'` | `oʻ` | U+02BB MODIFIER LETTER TURNED COMMA |
| `O'` | `Oʻ` | U+02BB |
| `g'` | `gʻ` | U+02BB |
| `G'` | `Gʻ` | U+02BB |
| `ma'ruza`, `sun'iy`, `e'lon` | `maʼruza`, `sunʼiy`, `eʼlon` | U+02BC MODIFIER LETTER APOSTROPHE |
| `"matn"` (toʻgʻri tirnoq) | `“matn”` | U+201C / U+201D |

### Qoida

- Unli + apostrof (`oʻ`, `gʻ`) uchun <strong>ʻ</strong> (U+02BB).
- Undosh + apostrof (so'z ichida `maʼruza`, `sanʼat`, `taʼlim`, `eʼlon`, `sunʼiy`) uchun <strong>ʼ</strong> (U+02BC).
- Lotin tirnoqlari `"…"` matn ichida `“…”` (egma) bilan almashtiriladi.
- HTML atributlaridagi tirnoqlar (`class="card"`) <strong>toʻgʻri</strong> qoldiriladi.
- Kod bloklari ichida sintaksis tirnoqlari (mermaid `["matn"]`, JSON, va h.k.) <strong>toʻgʻri</strong> qoldiriladi.

### Tipik so'z imlosi xatolari (avto-tekshiriladi)

| Notoʻgʻri | Toʻgʻri |
|-----------|---------|
| `qaer`, `qaerda`, `qaerga`, `qaerdan` | `qayer`, `qayerda`, `qayerga`, `qayerdan` |
| `etarli`, `etadi`, `etib` (so'z boshida) | `yetarli`, `yetadi`, `yetib` |
| `xayron`, `xafa`, `xolat`, `xokim` | `hayron`, `hafa`, `holat`, `hokim` |
| `havf`, `havola` (xato sifatida) | `xavf` (danger), `havola` (link — mana shu toʻgʻri) |
| `hoxlamoq`, `xoxlamoq` | `xohlamoq` |
| `nahot`, `naxot` | `naxot` (so'roq), aksincha `nahotki` ham toʻgʻri |
| `xech`, `xeshta` | `hech`, `hechta` |
| `muzlatgich` *(LQA xato tavsiya etishi mumkin)* | `muzlatkich` — toʻgʻri imlo |

## 2. Lugʻat (Glossary)

### Texnik atamalar — saqlanadi (asl holida)

`Harness`, `agent`, `prompt`, `repository`, `pull request`, `commit`, `endpoint`, `pipeline`, `runtime`, `context window`, `lint`, `test`, `type check`, `benchmark`, `feature list`, `init`, `Markdown`, `JSON`, `API`, `IPC`, `Electron`, `React`, `TypeScript`, `Codex`, `Claude Code`, `OpenAI`, `Anthropic`.

Bu soʻzlar tarjima qilinmaydi va <strong>kursivga olinmaydi</strong> (matn ichida tabiiy yozilishi).

### Standart tarjimalar

| Inglizcha | Oʻzbekcha |
|-----------|-----------|
| reliable | ishonchli |
| failure | muvaffaqiyatsizlik / yiqilish |
| verification | tekshiruv / verifikatsiya |
| environment | muhit |
| state management | holat boshqaruvi |
| feedback | qaytma aloqa / fikr-mulohaza |
| observability | kuzatuvchanlik |
| capability | imkoniyat / qobiliyat |
| reliability | ishonchlilik |
| handoff | topshirish |
| boundary | chegara |
| layer | qatlam |
| primitive | primitiv (asosiy birlik) |
| skill issue | mahorat masalasi |
| workspace | ish maydoni |
| session | sessiya |
| ground truth | haqiqiy holat / yagona haqiqat |
| system of record | yagona haqiqat manbai |
| template | <strong>andoza</strong> (NOT shablon) |
| guide / guideline | yoʻriqnoma |
| convention | konvensiya |
| dependency | bogʻliqlik / kutubxona |

### Atamalar terminologiyasi

Maxsus terminlar (Capability Gap, Verification Gap, Diagnostic Loop va h.k.) birinchi marta uchraganida:

```
**Capability Gap (Imkoniyatlar tafovuti)**
```

Keyingi joylarda toʻliq inglizcha atama yoki oʻzbekcha tarjima — qaysi biri kontekstga mos kelsa.

## 3. Stilistika

### Uslub

- <strong>Suhbatdosh, professional ohang.</strong> Akademik quruq emas, lekin xolislik saqlanadi.
- <strong>Ikkinchi shaxs koʻplik</strong>: "siz qiling", "tekshiring", "yarating" (hurmat shakli).
- <strong>Bir xil terminologiya</strong> matn boʻyicha. Bir atama uchun bir tarjima.
- <strong>Faol nisbat</strong> afzal: "agent kod yozadi" — "kod agent tomonidan yoziladi" emas.
- <strong>Uzun jumlalarni boʻling.</strong> Inglizcha 30+ soʻzli jumlalarni 2-3 ga ajrating.
- <strong>Kalkani tashlang.</strong> Soʻzma-soʻz emas, maʼno boʻyicha.

### Punktuatsiya

- Tire (`—`) U+2014 — fikr ajratish, izoh kiritish.
- Egma tirnoq `“ ”` faqat keltirma va qisqa iboralar uchun.
- Inline kod `` ` `` saqlanadi (`AGENTS.md`, `pip install`).
- Roʻyxatlarda nuqta-vergul yoki nuqta — bir uslubda.

### Sarlavhalar

- `# H1` — sahifaning yagona asosiy sarlavhasi.
- `##` va `###` — kichik harf bilan boshlanadi (faqat birinchi soʻz va atoqli otlar).
- Sarlavha yakunida nuqta yoʻq.

### Havolalar

- Inglizcha manba sarlavhalari <strong>tarjima qilinadi</strong> (havola matni).
- URL oʻzgarmaydi.
- Repo ichidagi havolalar `/uz/` ga yoʻnaltiriladi.

## 4. Saqlanadigan elementlar

Tarjimada <strong>oʻzgarmaydigan</strong> narsalar:

- Kod bloklari — har qanday til (`ts`, `python`, `bash`, `mermaid`).
- HTML teglari va atributlari.
- Inline kod: `` `AGENTS.md` ``, `` `pytest` ``.
- URL'lar.
- Frontmatter (`---` blok).
- Markdown sintaksisi.

## 5. Maqsadli auditoriya

Oʻquvchi — oʻrtacha-yuqori darajadagi dasturchi, ingliz tilida texnik atamalarni biladi. Shu sababli inglizcha terminologiyani saqlash maqbul, lekin matn oqim oʻzbekcha boʻlishi shart.
