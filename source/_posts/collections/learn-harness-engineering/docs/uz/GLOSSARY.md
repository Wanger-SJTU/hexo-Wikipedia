---
title: "Terminologik glossary — Harness Engineering"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/uz/GLOSSARY/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Terminologik glossary — Harness Engineering

Ushbu hujjat barcha tarjimalarda atamalar bir xil qoʻllanishini taʼminlaydi. Yangi maʼruza yoki loyiha tarjima qilinganda — avval shu hujjat bilan tekshirib chiqing, ixtiro qilmang.

<strong>Tartib:</strong> har bir atama uchun:
- <strong>EN</strong> — inglizcha asl
- <strong>UZ</strong> — standart oʻzbekcha tarjima (yoki `[saqlanadi]` — inglizcha qoldiriladi)
- <strong>Tafsif</strong> — qisqa izoh
- <strong>Qoʻllash</strong> — qachon, qayerda, qanday yozish

---

## 1. Markaziy tushunchalar (Core)

### Harness
- <strong>EN:</strong> Harness
- <strong>UZ:</strong> Harness *[saqlanadi — kalit atama]*
- <strong>Tafsif:</strong> Modeldan tashqaridagi barcha muhandislik infratuzilmasi — yoʻriqnomalar, vositalar, muhit, holat boshqaruvi, tekshiruv tizimi.
- <strong>Qoʻllash:</strong> Birinchi marta uchraganda — `harness (egar)` deb metafora bilan beriladi. Keyin oddiy `harness`. Suffikslar: `harnessʼga`, `harnessʼni`, `harnessʼlangan` (qoʻshma keng ishlatilmasin — "harnessga ega" afzal).

### Agent
- <strong>EN:</strong> AI agent / coding agent / agent
- <strong>UZ:</strong> Agent *[saqlanadi]*
- <strong>Tafsif:</strong> Avtonom kod yozish/oʻqish/tahrirlash imkoniyatiga ega LLM-asoslangan dastur (Codex, Claude Code va h.k.).
- <strong>Qoʻllash:</strong> Doim `agent` (kichik harf, tarjima qilinmaydi). "Sun'iy intellekt agenti" — birinchi marta keng kontekstda. Keyin shunchaki `agent`.

### Repository
- <strong>EN:</strong> Repository / repo
- <strong>UZ:</strong> Repozitoriy / repo *[saqlanadi]*
- <strong>Tafsif:</strong> Git boshqaruvidagi kod va hujjatlar majmuasi.
- <strong>Qoʻllash:</strong> Birinchi marta — `repozitoriy (repo)`. Keyin `repo`. Yopiq atamalar: `repo strukturasi`, `repo ildizi`, `repo tarixi`.

### Model
- <strong>EN:</strong> Model / LLM
- <strong>UZ:</strong> Model *[saqlanadi]*
- <strong>Tafsif:</strong> Til modeli (GPT-4o, Claude Opus, va h.k.) — agentning "miya"si.
- <strong>Qoʻllash:</strong> `model og'irliklari` (model weights) — texnik termin sifatida saqlanadi.

### Prompt
- <strong>EN:</strong> Prompt
- <strong>UZ:</strong> Prompt *[saqlanadi]*
- <strong>Tafsif:</strong> Foydalanuvchi tomonidan modelga beriladigan koʻrsatma matni.
- <strong>Qoʻllash:</strong> "system prompt", "user prompt" — inglizcha qoldiriladi. Suffikslar: `promptʼda`, `promptʼning`.

### Context window
- <strong>EN:</strong> Context window
- <strong>UZ:</strong> Kontekst oynasi *yoki* `context window` *[saqlanadi]*
- <strong>Tafsif:</strong> Modelning bir vaqt ichida koʻra oladigan matn hajmi (token bilan oʻlchanadi).
- <strong>Qoʻllash:</strong> Texnik kontekstda inglizcha. Tushuntirish kontekstida `kontekst oynasi` ishlatilishi mumkin.

---

## 2. Asosiy muvaffaqiyatsizlik turlari (Failure layers)

### Capability Gap
- <strong>EN:</strong> Capability Gap
- <strong>UZ:</strong> Capability Gap (imkoniyatlar tafovuti)
- <strong>Tafsif:</strong> Modelning benchmark natijalari va haqiqiy vazifalardagi natijalari oʻrtasidagi farq.
- <strong>Qoʻllash:</strong> Birinchi marta — toʻliq atama (qavs ichida tarjima). Keyin — `Capability Gap` yoki `imkoniyatlar tafovuti`.

### Verification Gap
- <strong>EN:</strong> Verification Gap
- <strong>UZ:</strong> Verification Gap (tekshiruv tafovuti)
- <strong>Tafsif:</strong> Agentning oʻz natijasiga ishonchi va haqiqiy toʻgʻrilik oʻrtasidagi farq.
- <strong>Qoʻllash:</strong> Atamani saqlang; tarjimasi qavsda. Suffikslar: `verification gapʼingiz`.

### Harness-Induced Failure
- <strong>EN:</strong> Harness-Induced Failure
- <strong>UZ:</strong> Harness-Induced Failure (harness keltirib chiqargan muvaffaqiyatsizlik)
- <strong>Tafsif:</strong> Modelda imkoniyat bor, lekin muhitda nuqson tufayli yiqilish.
- <strong>Qoʻllash:</strong> Toʻliq atama saqlanadi. Tarjimaga "harness sabab" deb yozmang — "harness keltirib chiqargan" toʻgʻri.

### Context Pressure
- <strong>EN:</strong> Context pressure
- <strong>UZ:</strong> Kontekst bosimi (context pressure)
- <strong>Tafsif:</strong> Kontekst haddan tashqari gavjumlashganda agent ishni erta yakunlashga, tekshiruvni qisqartirishga yoki soddaroq yoʻlni tanlashga moyil boʻladigan kurs atamasi.
- <strong>Qoʻllash:</strong> Birinchi marta toʻliq, keyin `kontekst bosimi`.

### Five Failure Layers (Beshta muvaffaqiyatsizlik qatlami)

Bularning tarjimasi har joyda bir xil boʻlsin:

## 1. **Task specification** → `vazifa spetsifikatsiyasi`

## 2. **Context provision** → `kontekst taʼminoti`

## 3. **Execution environment** → `bajarilish muhiti`

## 4. **Verification feedback** → `tekshiruv qayta aloqasi`

## 5. **State management** → `holat boshqaruvi`


> <strong>Diqqat:</strong> "feedback" har joyda bir xil tarjima qilinmaydi:
> - "verification feedback" → `tekshiruv qayta aloqasi`
> - "feedback loop" → `qayta aloqa sikli`
> - "runtime feedback" → `runtime fikr-mulohaza` *yoki* `runtime qayta aloqa`

---

## 3. Jarayon va metodologiya (Process)

### Diagnostic Loop
- <strong>EN:</strong> Diagnostic Loop
- <strong>UZ:</strong> Diagnostik sikl (diagnostic loop)
- <strong>Tafsif:</strong> Bajarish → muvaffaqiyatsizlikni kuzatish → qatlamga bogʻlash → tuzatish → qaytadan bajarish.
- <strong>Qoʻllash:</strong> `Diagnostik sikl` — asosiy. Inglizcha qavsda birinchi marta.

### Definition of Done (DoD)
- <strong>EN:</strong> Definition of Done / DoD
- <strong>UZ:</strong> Definition of Done (bajarilganlik mezonlari) / DoD
- <strong>Tafsif:</strong> Mashina tekshirishi mumkin boʻlgan tugatish shartlari toʻplami.
- <strong>Qoʻllash:</strong>
  - Birinchi marta toʻliq.
  - Keyin <strong>DoD</strong> abbreviature OK.
  - Tarjimada <strong>bajarilganlik mezonlari</strong> ishlatiladi (NOT "tugatildi taʼrifi", NOT "tugatish mezonlari").

### Initialization phase
- <strong>EN:</strong> Initialization / Init phase
- <strong>UZ:</strong> Inisializatsiya / inisializatsiya bosqichi
- <strong>Tafsif:</strong> Agent ish boshlashidan oldin loyiha bilan tanishish va muhitni sozlash bosqichi.
- <strong>Qoʻllash:</strong> `init.sh` — fayl nomi, tarjima qilinmaydi.

### Handoff
- <strong>EN:</strong> Handoff
- <strong>UZ:</strong> Topshirish (handoff)
- <strong>Tafsif:</strong> Bir sessiyadan keyingisiga, yoki agentdan odamga ish holatini topshirish.
- <strong>Qoʻllash:</strong> `claude-progress.md` — handoff fayli, nomi saqlanadi.

### Session
- <strong>EN:</strong> Session
- <strong>UZ:</strong> Sessiya *[saqlanadi]*
- <strong>Tafsif:</strong> Bir agent ishlashining boshidan oxirigacha boʻlgan davri.
- <strong>Qoʻllash:</strong> `koʻp sessiyali`, `sessiyalar oraligʻi`, `sessiyalararo`.

### Diagnostic loop attribution
- <strong>EN:</strong> Attribute failure to layer
- <strong>UZ:</strong> Muvaffaqiyatsizlikni qatlamga bogʻlash
- <strong>Qoʻllash:</strong> "atribut qilish" kalka — ishlatmang. "Bogʻlash" yoki "tegishli qatlamga ajratish".

---

## 4. Infratuzilma fayllari (Files)

Quyidagi fayl nomlari <strong>doim saqlanadi</strong> — tarjima qilinmaydi:

| Fayl | Vazifasi |
|------|----------|
| `AGENTS.md` | Agent uchun loyiha boʻyicha asosiy yoʻriqnoma |
| `CLAUDE.md` | Claude Code uchun maxsus yoʻriqnoma |
| `feature_list.json` | Loyiha funksiyalari roʻyxati |
| `init.sh` | Inisializatsiya skripti |
| `claude-progress.md` | Sessiyalar oraligʻi handoff fayli |

---

## 5. Sifat va tekshiruv (Quality)

### Test
- <strong>EN:</strong> Test / unit test / integration test / E2E test
- <strong>UZ:</strong> Test *[saqlanadi]*
- <strong>Qoʻllash:</strong> `unit test`, `integration test`, `end-to-end test` — inglizcha. `pytest`, `vitest` — fayl nomi sifatida.

### Lint
- <strong>EN:</strong> Lint / linter
- <strong>UZ:</strong> Lint *[saqlanadi]*
- <strong>Qoʻllash:</strong> "lint toza" (clean lint), "lint xatolari" (lint errors).

### Type check
- <strong>EN:</strong> Type check / type checking
- <strong>UZ:</strong> Type check *[saqlanadi]*
- <strong>Qoʻllash:</strong> <strong>NOT</strong> "tip tekshiruvi" — yarim-tarjima. Toʻliq inglizcha qoldiriladi (mypy, tsc, pyright kontekstlarida).

### End-to-end testing
- <strong>EN:</strong> End-to-end testing / E2E
- <strong>UZ:</strong> End-to-end testlash / E2E test
- <strong>Tafsif:</strong> Toʻliq pipeline (boshidan oxirigacha) test.
- <strong>Qoʻllash:</strong> `E2E` qisqartmasi keyingi marotabalarda OK.

### Observability
- <strong>EN:</strong> Observability
- <strong>UZ:</strong> Kuzatuvchanlik (observability)
- <strong>Tafsif:</strong> Tizim ichida nima sodir boʻlayotganini kuzatish va tushunish imkoniyati.
- <strong>Qoʻllash:</strong> `kuzatuvchanlik` — texnik atama. Keng oʻzbek tilida kam ishlatiladi, shuning uchun birinchi marta toʻliq inglizcha qavsda.

### Pipeline
- <strong>EN:</strong> Pipeline / CI pipeline
- <strong>UZ:</strong> Pipeline *[saqlanadi]*

### Benchmark
- <strong>EN:</strong> Benchmark / SWE-bench
- <strong>UZ:</strong> Benchmark *[saqlanadi]*
- <strong>Qoʻllash:</strong> `SWE-bench Verified`, `benchmark natijalari`. Tarjima qilinmaydi.

### Runtime
- <strong>EN:</strong> Runtime
- <strong>UZ:</strong> Runtime *[saqlanadi]*
- <strong>Qoʻllash:</strong> "runtime xatoliklari" (runtime errors), "runtime fikr-mulohaza" (runtime feedback).

---

## 6. Loyihalar va arxitektura (Architecture)

### System of Record (SoR)
- <strong>EN:</strong> System of Record / SoR
- <strong>UZ:</strong> Yagona haqiqat manbai (system of record)
- <strong>Tafsif:</strong> Tizim holatining yagona, ishonchli manbai (3-maʼruza markaziy tushunchasi).
- <strong>Qoʻllash:</strong> Birinchi marta toʻliq. Keyin `SoR` yoki `yagona haqiqat manbai`. NOT "yozuv tizimi" (kalka).

### Feature list
- <strong>EN:</strong> Feature list
- <strong>UZ:</strong> Funksiyalar roʻyxati / feature list
- <strong>Qoʻllash:</strong> Loyihaning rasmiy `feature_list.json` fayliga ishora qilganda — atama saqlanadi. Umumiy maʼnoda — `funksiyalar roʻyxati`.

### Workspace
- <strong>EN:</strong> Workspace / agent-readable workspace
- <strong>UZ:</strong> Ish maydoni / agent oʻqiy oladigan ish maydoni
- <strong>Qoʻllash:</strong> Loyiha-2 nomi.

### Tech stack
- <strong>EN:</strong> Tech stack
- <strong>UZ:</strong> Tech stack *[saqlanadi]*
- <strong>Qoʻllash:</strong> <strong>NOT</strong> "texnologik stak" (yarim-tarjima). Inglizcha qoldiriladi: `loyihaning tech stack'i`.

### Tool
- <strong>EN:</strong> Tool / tools / tooling
- <strong>UZ:</strong> Vosita / vositalar
- <strong>Tafsif:</strong> Agent foydalanadigan dasturiy vositalar (shell, file editor, test runner, va h.k.).
- <strong>Qoʻllash:</strong> <strong>Doim</strong> `vosita` deb tarjima qilinadi (NOT preserved English). "Vosita" oʻzbekchada "tool" ning tabiiy ekvivalenti. Mermaid block'larda ham `Vositalar`. Texnik kompozit atamalar (`tool calling`, `tool use`) — toʻliq inglizcha qoldirilishi mumkin.

### Architecture decision record (ADR)
- <strong>EN:</strong> ADR / Architecture Decision Record
- <strong>UZ:</strong> Arxitektura qarorlari yozuvlari (ADR)
- <strong>Qoʻllash:</strong> Birinchi marta toʻliq, keyin ADR.

---

## 7. Agent xatti-harakati (Agent behavior)

### Overreach / Under-finish
- <strong>EN:</strong> Agents overreach and under-finish
- <strong>UZ:</strong> Agentlar haddan oshib, oxirigacha yetmaydi
- <strong>Tafsif:</strong> Agent skopdan tashqariga chiqib ketadi va asosiy vazifani tugatmaydi (7-maʼruza).

### Declare victory too early
- <strong>EN:</strong> Declare victory too early
- <strong>UZ:</strong> Vaqtidan oldin gʻalabani eʼlon qilish *yoki* `vaqtidan oldin "tugadim" deyish`
- <strong>Qoʻllash:</strong> Idiomatik. "Gʻalaba eʼlon qilish" — kalka boʻlsa-da, oʻzbekchada tushunarli.

### Scope control
- <strong>EN:</strong> Scope control
- <strong>UZ:</strong> Skoup nazorati (scope control)
- <strong>Tafsif:</strong> Agent vazifa chegarasidan chiqmasligini taʼminlash.

### Self-verification
- <strong>EN:</strong> Self-verification
- <strong>UZ:</strong> Oʻz-oʻzini tekshirish
- <strong>Qoʻllash:</strong> "self-verification" inglizcha qavsda birinchi marta.

### Grounded Q&A
- <strong>EN:</strong> Grounded Q&A / Grounded answers
- <strong>UZ:</strong> Asoslangan savol-javob (grounded Q&A)
- <strong>Tafsif:</strong> Javob har bir tasdiq uchun manba (kod yoki hujjatda) bilan asoslangan.

---

## 8. Uslubiy atamalar (Style)

### Bare environment
- <strong>EN:</strong> Bare environment / no support
- <strong>UZ:</strong> Qoʻshimcha tuzilmasiz muhit *yoki* `harness'siz muhit`
- <strong>Qoʻllash:</strong> <strong>NOT</strong> "yalangʻoch muhit" (kalka). Toʻgʻri rendering — `qoʻshimcha tuzilmasiz`.

### Out of the box
- <strong>EN:</strong> Out of the box
- <strong>UZ:</strong> Boshlangʻich holatda *yoki* `qutidan chiqqan zahoti`
- <strong>Qoʻllash:</strong> "qutidan tashqarida" — kalka, ishlatmang.

### Reach for your wallet
- <strong>EN:</strong> Reach for your wallet
- <strong>UZ:</strong> Pul sarflashga shoshilmoq
- <strong>Qoʻllash:</strong> <strong>NOT</strong> "hamyonga qoʻl urmoq" (kalka — oʻzbekchada bunday ibora yoʻq).

### Time to upgrade
- <strong>EN:</strong> Time to upgrade / Time to X
- <strong>UZ:</strong> X vaqti keldi *(NOT "X-ga vaqt keldi")*
- <strong>Misol:</strong> "Time to upgrade" → "Yangiroq modelga oʻtish vaqti keldi" (NOT "Yaxshilashga vaqt keldi").

### Looks reasonable
- <strong>EN:</strong> Code that looks reasonable
- <strong>UZ:</strong> Yuzaki qaraganda mantiqli koʻringan kod
- <strong>Qoʻllash:</strong> <strong>NOT</strong> "koʻrinishidan oqilona" (kalka).

### Run (experiment)
- <strong>EN:</strong> First run / second run / independent run
- <strong>UZ:</strong> Birinchi sinov / ikkinchi sinov / mustaqil sinov
- <strong>Qoʻllash:</strong> <strong>NOT</strong> "yugurish" (sport maʼnosida noʻgʻri). `Sinov` — texnik tajriba.

### Gimmick
- <strong>EN:</strong> Gimmick
- <strong>UZ:</strong> Hiyla *yoki* `effekt uchun qilingan ish`
- <strong>Qoʻllash:</strong> <strong>NOT</strong> "oʻyin" (oʻyin = game, boshqa maʼno).

### Down-to-earth
- <strong>EN:</strong> Down-to-earth example
- <strong>UZ:</strong> Hayotiy misol
- <strong>Qoʻllash:</strong> <strong>NOT</strong> "amaliy misol" (juda umumiy).

### Wallet/money idioms
- "burn money/budget" → `pul sarflash`
- "expensive option" → `qimmat variant`
- "ROI-yuqori" — saqlanadi (ROI'ga ega)

---

## 9. Punktuatsiya va imlo (Orthography)

| Notoʻgʻri | Toʻgʻri | Eslatma |
|-----------|---------|---------|
| `o'`, `O'`, `g'`, `G'` | `oʻ`, `Oʻ`, `gʻ`, `Gʻ` | U+02BB |
| `ma'ruza`, `sun'iy`, `e'lon`, `ta'lim` | `maʼruza`, `sunʼiy`, `eʼlon`, `taʼlim` | U+02BC |
| `"matn"` (matn ichida) | `"matn"` | Egma tirnoq |
| HTML `class="..."` | `class="..."` | Toʻgʻri tirnoq |
| `qaer`, `qaerda` | `qayer`, `qayerda` | Imloviy xato |
| `senariy` | `ssenariy` | Russian-borrowed, double s |
| `etarli` (so'z boshida) | `yetarli` | y kerak |
| `xayron`, `xolat`, `xokim` | `hayron`, `holat`, `hokim` | h/x adashishi |
| `xech` | `hech` | h, NOT x |
| `shablon` | `andoza` | Lugʻat tanlovi |
| `tip tekshiruvi` | `type check` | Ingliz texnik atamani saqlang |

---

## 10. Saqlanadigan inglizcha atamalar — toʻliq roʻyxat

Quyidagilar <strong>hech qachon tarjima qilinmaydi</strong> (oʻzbekcha matn ichida ham inglizcha yoziladi):

Harness`, `agent`, `prompt`, `repository`, `repo`, `pull request`, `PR`, `commit`, `endpoint`, `pipeline`, `runtime`, `context window`, `lint`, `test`, `type check`, `benchmark`, `feature list`, `init`, `tech stack`, `framework`, `Markdown`, `JSON`, `YAML`, `JSONL`, `API`, `IPC`, `Electron`, `React`, `TypeScript`, `Codex`, `Claude Code`, `OpenAI`, `Anthropic`, `LLM`, `SDK`, `CLI`, `IDE`, `IDE-extension`, `MCP`, `webhook`, `mock`, `stub`, `branch`, `merge`, `rebase`, `diff`, `staging`, `production`, `deploy`, `build`, `dev`, `prod`.

<strong>Diqqat — saqlanmaydigan, tarjima qilinadigan atamalar:</strong>
- `tool` → <strong>vosita</strong> (NOT preserved English)
- `template` → <strong>andoza</strong> (NOT shablon, NOT preserved English)
- `subsystem` → <strong>quyi tizim</strong> (defissiz)
- `framework` → <strong>freymvork</strong> (oʻzbek transliteratsiyasi, NOT preserved English)
- `isometric model control` → <strong>izometrik model boshqaruvi</strong> (birinchi marta qavsda tushuntirish: "modelni oʻzgarmas saqlab, harness komponentlarini birma-bir olib tashlab tekshirish usuli")
- `package manager` izoh: "X vs Y" → "X yoki Y" (NOT "X oʻrniga Y", NOT "X va Y orasida")

Suffikslar bilan: `harnessʼga`, `Codexʼni`, `OpenAIʼning`, `repoʼda`, `endpointʼlar` (lotin atamadan keyin `ʼ` belgisi qoʻyiladi).

---

## 11. Suffikslar va grammatik birikma

Inglizcha ot ortidan oʻzbekcha qoʻshimcha:
- Egalik kelishigi: `OpenAIʼning`, `Anthropicʼning` (NOT `OpenAIning`)
- Tushum: `Codexʼni`, `agentʼni`
- Joʻnalish: `harnessʼga`, `repoʼga`
- Oʻrin: `repoʼda`, `endpointʼda`
- Chiqish: `repoʼdan`, `kontekstʼdan`
- Koʻplik: `agentlar`, `endpointʼlar`, `harnessʼlar`

<strong>Qoida:</strong> Lotin asosli (oʻzbek bo'lmagan) ot va oʻzbek qoʻshimchasi orasida `ʼ` (U+02BC) qoʻyiladi.

Istisno: oddiy ko'plik `lar/lar` — `ʼ`siz ham koʻp uchraydi (`agentlar` toʻgʻri, `agentʼlar` ham toʻgʻri). Bir xillik uchun: koʻplikda `ʼ`siz, qolgan kelishiklarda `ʼ` bilan.

---

## 12. Yangi atama uchragan paytda

Tarjimon yangi atamaga duch kelganda:

## 1. Avval ushbu glossary'ni qidirib chiqing.

## 2. Mavjud bo'lmasa — quyidagi tartibda yondashing:

   - <strong>Texnik atama</strong> (dasturlash, AI, devops) → inglizcha saqlang.
   - <strong>Umumiy soʻz</strong> → tabiiy oʻzbek tarjimasini bering.
   - <strong>Idioma/metafora</strong> → mazmunan, kalkasiz.
## 3. Yangi qaror — bu hujjatga qoʻshing (Pull Request orqali).

## 4. Toʻgʻri ma'noni LQA agent yordamida tasdiqlang.


---

*Versiya: 0.1 — bunday tarjima boshlanishida tayyorlangan. Har bir maʼruza/loyiha tarjimasidan keyin kengaytiriladi.*
