---
title: "Vorlagen-Leitfaden"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/de/resources/templates/index/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Vorlagen-Leitfaden

Diese Vorlagen sind bereit, in Ihr eigenes Projekt kopiert zu werden. Jede erfüllt
einen bestimmten Zweck im Workflow des Agenten. Bearbeiten Sie die Inhalte, um sie
an die Befehle, Pfade, Feature-Namen und Verifikationsschritte Ihres Projekts
anzupassen.

## Erste Schritte

Kopieren Sie diese vier Dateien zuerst in Ihr Projektverzeichnis:

## 1. `AGENTS.md` oder `CLAUDE.md`

## 2. `init.sh`

## 3. `claude-progress.md`

## 4. `feature_list.json`


Fügen Sie die restlichen Dateien hinzu, wenn Ihr Projekt wächst.

---

## AGENTS.md

Die Haupt-Instruktionsdatei. Dies ist das Erste, was der Agent liest, wenn er eine
Sitzung startet. Sie definiert die Betriebsregeln: was vor dem Schreiben von Code
zu tun ist, wie gearbeitet wird und wie abgeschlossen wird.

<strong>Verwendung:</strong>

- In Ihr Projektverzeichnis kopieren
- Die Start-Workflow-Schritte durch Ihre tatsächlichen Projektpfade und -befehle ersetzen
- Die Arbeitsregeln an die Konventionen Ihres Teams anpassen
- Den Abschnitt zur Definition von Fertig beibehalten -- er ist der wichtigste Teil

<strong>Was sie für den Agenten tut:</strong>

- Sagt ihm, dass er Fortschritt und Feature-Status lesen soll, bevor er mit der Arbeit beginnt
- Zwingt ihn, an nur einem Feature gleichzeitig zu arbeiten
- Verlangt Nachweise, bevor etwas als fertig markiert wird
- Definiert, wie ein sauberes Sitzungsende aussieht

Verwenden Sie `AGENTS.md` für Codex oder andere Agenten. Verwenden Sie `CLAUDE.md`,
wenn Sie mit Claude Code arbeiten -- die Struktur ist dieselbe, nur formatiert für
Claudes Instruktionsstil.

## init.sh

Das Startskript. Führt Abhängigkeitsinstallation, Verifikation und Ausgabe des
Startbefehls aus -- alles in einem Durchgang.

<strong>Verwendung:</strong>

- In Ihr Projektverzeichnis kopieren
- Diese drei Variablen oben bearbeiten:
  - `INSTALL_CMD` -- Ihr Abhängigkeits-Installationsbefehl (z. B. `npm install`, `pip install -r requirements.txt`)
  - `VERIFY_CMD` -- Ihr grundlegender Verifikationsbefehl (z. B. `npm test`, `pytest`)
  - `START_CMD` -- Ihr Dev-Server-Startbefehl (z. B. `npm run dev`)
- Ausführbar machen: `chmod +x init.sh`

<strong>Was es tut:</strong>

## 1. Gibt das aktuelle Verzeichnis aus (damit Sie bestätigen können, dass es am richtigen Ort läuft)

## 2. Installiert Abhängigkeiten

## 3. Führt den Verifikationsbefehl aus

## 4. Gibt den Startbefehl aus (oder führt ihn aus, wenn `RUN_START_COMMAND=1` gesetzt ist)


Wenn die Verifikation fehlschlägt, sollte der Agent anhalten und die Baseline
korrigieren, bevor er etwas anderes tut.

## claude-progress.md

Das Fortschrittslog. Jede Sitzung schreibt in diese Datei, und jede neue Sitzung
liest sie zuerst.

<strong>Verwendung:</strong>

- In Ihr Projektverzeichnis kopieren
- Den Abschnitt "Aktueller verifizierter Zustand" mit Ihren Projektinformationen ausfüllen
- Nach jeder Sitzung den Sitzungs-Eintrag aktualisieren

<strong>Bedeutung der einzelnen Felder:</strong>

- <strong>Aktueller verifizierter Zustand</strong> -- die einzige Wahrheitsquelle für den Projektstand
  - `Repository-Root-Verzeichnis` -- wo das Projekt liegt
  - `Standard-Startpfad` -- der Befehl, um das Projekt zu starten
  - `Standard-Verifikationspfad` -- der Befehl, um Tests auszuführen
  - `Höchste Priorität unfertiges Feature` -- woran die nächste Sitzung arbeiten sollte
  - `Aktueller Blocker` -- alles, was feststeckt
- <strong>Sitzungs-Eintrag</strong> -- ein Eintrag pro Sitzung
  - `Ziel` -- was Sie vorhatten zu tun
  - `Abgeschlossen` -- was tatsächlich erledigt wurde
  - `Verifikation ausgeführt` -- welche Tests ausgeführt wurden
  - `Nachweise erfasst` -- welche Beweise dokumentiert wurden
  - `Commits` -- was committet wurde
  - `Bekannte Risiken` -- was kaputt sein könnte
  - `Nächste beste Aktion` -- wo die nächste Sitzung beginnen sollte

## feature_list.json

Der Feature-Tracker. Eine maschinenlesbare Liste aller Features, die der Agent
implementieren muss, zusammen mit Status, Verifikationsschritten und Nachweisen.

<strong>Verwendung:</strong>

- In Ihr Projektverzeichnis kopieren
- Die Beispielfeatures durch Ihre eigenen ersetzen
- Jedes Feature benötigt:
  - `id` -- eine kurze eindeutige Kennung
  - `priority` -- Ganzzahl, niedriger = höhere Priorität
  - `area` -- welcher Teil der App (z. B. "chat", "import", "search")
  - `title` -- kurze Beschreibung
  - `user_visible_behavior` -- was der Benutzer sehen soll, wenn es funktioniert
  - `status` -- einer von `not_started`, `in_progress`, `blocked`, `passing`
  - `verification` -- Schritt-für-Schritt-Anleitung zur Bestätigung, dass es funktioniert
  - `evidence` -- dokumentierter Nachweis, dass die Verifikation bestanden hat (vom Agenten ausgefüllt)
  - `notes` -- jeglicher zusätzlicher Kontext

<strong>Statusregeln:</strong>

- `not_started` -- noch nicht angefasst
- `in_progress` -- das aktuell bearbeitete Feature (nur eines gleichzeitig)
- `blocked` -- kann aufgrund eines dokumentierten Problems nicht fortgesetzt werden
- `passing` -- Verifikation bestanden und Nachweise sind dokumentiert

Der Agent sollte zu jedem Zeitpunkt nur ein Feature im Status `in_progress` haben.

## session-handoff.md

Eine kompakte Übergabenotiz zwischen Sitzungen. Verwenden Sie diese, wenn eine
Sitzung endet und Sie möchten, dass die nächste schnell anknüpfen kann.

<strong>Verwendung:</strong>

- In Ihr Projektverzeichnis kopieren
- Am Ende jeder Sitzung ausfüllen (oder den Agenten ausfüllen lassen)

<strong>Was jeder Abschnitt abdeckt:</strong>

- <strong>Aktuell verifiziert</strong> -- was als funktionierend bestätigt ist und welche Verifikation lief
- <strong>Änderungen dieser Sitzung</strong> -- welcher Code oder welche Infrastruktur sich geändert hat
- <strong>Noch kaputt oder unverifiziert</strong> -- bekannte Probleme und riskante Bereiche
- <strong>Nächste beste Aktion</strong> -- was die nächste Sitzung tun sollte und was nicht angefasst werden sollte
- <strong>Befehle</strong> -- Start-, Verifikations- und Debug-Befehle zur schnellen Referenz

Diese Datei ist optional für kleine Sitzungen. Sie wird wichtig, wenn Sitzungen lang
sind oder das Projekt mehrere aktive Bereiche hat.

## clean-state-checklist.md

Eine Checkliste, die vor dem Beenden jeder Sitzung durchzugehen ist. Stellt sicher,
dass das Repo in einem guten Zustand ist, damit die nächste Sitzung sauber starten kann.

<strong>Verwendung:</strong>

- In Ihr Projektverzeichnis kopieren
- Vor dem Schließen einer Sitzung durchgehen
- Der Agent sollte diese Punkte auch als Teil seiner Sitzungsabschluss-Routine prüfen

<strong>Was sie prüft:</strong>

- Standard-Start funktioniert noch
- Standard-Verifikation läuft noch
- Fortschrittslog ist aktualisiert
- Feature-Liste spiegelt den tatsächlichen Zustand wider (keine falschen `passing`-Einträge)
- Keine halbfertige Arbeit undokumentiert gelassen
- Nächste Sitzung kann ohne manuelle Korrekturen fortgesetzt werden

## evaluator-rubric.md

Ein Bewertungsbogen zur Überprüfung der Agenten-Ausgabequalität. Verwenden Sie diesen
nach einer Sitzung oder bei Projektmeilensteinen, um zu bewerten, ob die Arbeit den
Anforderungen entspricht.

<strong>Verwendung:</strong>

- In Ihr Projektverzeichnis kopieren
- Nach einer Sitzung (oder mehreren Sitzungen) die Arbeit des Agenten über sechs Dimensionen bewerten
- Jede Dimension wird mit 0-2 bewertet

<strong>Die sechs Dimensionen:</strong>

## 1. **Korrektheit** -- entspricht die Implementierung dem Zielverhalten?

## 2. **Verifikation** -- wurden die erforderlichen Prüfungen tatsächlich mit Nachweisen ausgeführt?

## 3. **Umfangdisziplin** -- ist der Agent innerhalb des ausgewählten Features geblieben?

## 4. **Zuverlässigkeit** -- übersteht das Ergebnis einen Neustart oder erneute Ausführung?

## 5. **Wartbarkeit** -- sind Code und Dokumentation klar genug für die nächste Sitzung?

## 6. **Übergabebereitschaft** -- kann eine neue Sitzung nur mit Repo-Artefakten fortgesetzt werden?


<strong>Schlussfolgerungsoptionen:</strong>

- Akzeptieren -- erfüllt die Anforderungen
- Überarbeiten -- benötigt Korrekturen vor der Akzeptanz
- Blockieren -- grundlegende Probleme, die zuerst gelöst werden müssen

<strong>Wichtig: Der Evaluator muss kalibriert werden.</strong> Im Standardzustand sind Agenten
schlechte Selbstbewerter -- sie identifizieren Probleme und reden sich dann in eine
Genehmigung. Sie müssen iterieren:

## 1. Den Evaluator auf einen abgeschlossenen Sprint anwenden.

## 2. Seine Bewertungen mit Ihrem eigenen menschlichen Urteil vergleichen.

## 3. Wo sie abweichen, die Rubrik spezifischer zu Bestehen/Fehler-Kriterien machen.

## 4. Erneut ausführen und die Übereinstimmung prüfen.

## 5. Wiederholen, bis der Evaluator konsistent mit dem menschlichen Review übereinstimmt.


Planen Sie 3-5 Kalibrierungsrunden. Dokumentieren Sie jede Änderung, damit Sie
verfolgen können, was die Übereinstimmung verbessert hat.

## quality-document.md

Eine Qualitätsmomentaufnahme, die jede Produktdomäne und jede Architektur-Schicht in
Ihrem Projekt bewertet. Verfolgt die Codebasis-Gesundheit über die Zeit, nicht nur
die Ausgabe einzelner Sitzungen.

<strong>Verwendung:</strong>

- In Ihr Projektverzeichnis kopieren
- Vor Beginn einer Sitzung: lesen, um zu verstehen, wo die Codebasis am schwächsten ist
- Nach einer Sitzung: Noten basierend auf den Änderungen aktualisieren
- Über die Zeit: Momentaufnahmen vergleichen, um zu sehen, welche Harness-Änderungen
  die Codebasis-Gesundheit tatsächlich verbessert haben

<strong>Was bewertet wird:</strong>

- <strong>Produktdomänen</strong> (z. B. Dokumentimport, Q&A-Ablauf, Indexierung): jede Domäne erhält

```text
  eine Note (A-D) für Verifikationsstatus, Agenten-Lesbarkeit, Teststabilität und
  wesentliche Lücken
```

- <strong>Architektur-Schichten</strong> (z. B. Hauptprozess, Preload, Renderer, Services): jede
  Schicht erhält eine Note für Grenzdurchsetzung und Agenten-Lesbarkeit

<strong>Warum es wichtig ist:</strong>

Die Evaluator-Rubrik bewertet einzelne Agenten-Ausgaben. Das Qualitätsdokument bewertet
die Codebasis selbst. Sie beantworten unterschiedliche Fragen:

- Evaluator-Rubrik: "Hat der Agent in dieser Sitzung gute Arbeit geleistet?"
- Qualitätsdokument: "Wird das Projekt mit der Zeit stärker oder schwächer?"

<strong>Wann aktualisieren:</strong>

- Nach jeder bedeutenden Sitzung
- Vor Benchmark-Vergleichen
- Nach Aufräum- oder Vereinfachungsdurchläufen
- Bei Onboarding eines neuen Agenten oder Modells in das Projekt

<strong>Harness-Vereinfachungs-Bezug:</strong>

Das Qualitätsdokument unterstützt auch die Harness-Vereinfachung. Jede Harness-Komponente
codiert eine Annahme darüber, was das Modell nicht kann. Wenn sich Modelle verbessern,
veralten diese Annahmen. Um zu prüfen, ob eine Komponente noch benötigt wird:

## 1. Eine Qualitätsdokument-Momentaufnahme erstellen.

## 2. Eine Harness-Komponente entfernen.

## 3. Die Benchmark-Aufgabensuite ausführen.

## 4. Eine weitere Momentaufnahme erstellen.

## 5. Vergleichen -- wenn die Noten nicht gefallen sind, war die Komponente Overhead.

   Wenn doch, wiederherstellen.
