---
title: "Lektion 11. Die Runtime des Agenten beobachtbar machen"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/de/lectures/lecture-11-why-observability-belongs-inside-the-harness/index/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

[中文版本 →](../../../zh/lectures/lecture-11-why-observability-belongs-inside-the-harness/)

> Codebeispiele: [code/](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/de/lectures/lecture-11-why-observability-belongs-inside-the-harness/code/)
> Praxisprojekt: [Projekt 06. Vollständiger harness (Capstone)](./../../projects/project-06-runtime-observability-and-debugging/index.md)

# Lektion 11. Die Runtime des Agenten beobachtbar machen

## Welches Problem löst diese Lektion?

Du bittest einen Agenten, ein Feature zu implementieren. Er läuft 20 Minuten, ändert viele Dateien und sagt dann: "fertig, aber zwei Tests schlagen fehl." Du fragst, warum sie fehlschlagen: "nicht sicher, vielleicht ein Timing-Problem." Du fragst, welche kritischen Pfade geändert wurden: "ich schaue in den Code..."

Das liegt nicht an fehlender Agentenfähigkeit. Dein harness stellt nicht genug Beobachtbarkeit bereit. <strong>Ohne Beobachtbarkeit treffen Agenten Entscheidungen unter Unsicherheit, Bewertungen werden subjektiv, und retries werden blindes Herumprobieren.</strong> OpenAI und Anthropic definieren Zuverlässigkeit als Evidenzproblem: Der harness muss Runtime-Verhalten und Bewertungssignale in einer Form offenlegen, die die nächste Entscheidung leitet.

## Zentrale Konzepte

- <strong>Runtime-Beobachtbarkeit</strong>: Systemsignale wie Logs, Traces, Prozessereignisse und Health Checks. Beantwortet "was hat das System getan".
- <strong>Prozess-Beobachtbarkeit</strong>: Sichtbarkeit in Entscheidungsartefakte des harness, etwa Pläne, Bewertungsrubriken und Akzeptanzkriterien. Beantwortet "warum sollte diese Änderung akzeptiert werden".
- <strong>Task trace</strong>: Vollständiger Entscheidungsweg vom Start bis zur Fertigstellung, analog zu Request-Tracing in verteilten Systemen.
- <strong>Sprint contract</strong>: Kurzfristige Vereinbarung vor dem Coding, die Scope, Verifikationsstandards und Ausschlüsse festlegt.
- <strong>Evaluator-Rubrik</strong>: Wandelt Qualitätsbewertung von subjektivem Urteil in evidenzbasierte strukturierte Bewertung um.
- <strong>Geschichtete Beobachtbarkeit</strong>: System- und Prozess-Beobachtbarkeit werden gemeinsam entworfen und verstärken sich gegenseitig.

## Geschichtete Beobachtbarkeit

```mermaid
flowchart LR
    Contract["Zuerst die Aufgabe festhalten<br/>was ändern / was nicht ändern / Bestehenskriterien"] --> Generator["Generator"]
    Generator --> Signals["App-Logs, Traces<br/>und Health Checks während der Ausführung sammeln"]
    Contract --> Review["Ergebnis Punkt für Punkt prüfen<br/>Verhalten / Tests / Grenzen"]
    Signals --> Review
    Review --> Verdict["Fehlgeschlagenen Check zeigen<br/>und wo zu fixen ist"]
    Verdict --> Generator
```

## Warum das passiert

### Die echten Kosten fehlender Beobachtbarkeit

Wenn einem harness Beobachtbarkeit fehlt, treten vier Problemtypen systematisch auf:

<strong>"Korrekt" lässt sich nicht von "sieht korrekt aus" unterscheiden</strong>: Eine Funktion kann im Code-Review perfekt wirken. Zur Laufzeit erzeugt aber ein Edge-Case-Fehler falsche Ergebnisse. Nur Runtime-Traces zeigen, dass der tatsächliche Ausführungspfad von der Erwartung abweicht.

<strong>Bewertung wird Mystik</strong>: Ohne Rubriken und Akzeptanzkriterien verlassen sich Evaluatoren, ob Mensch oder Agent, auf implizite Annahmen. Dieselbe Ausgabe kann stark unterschiedlich bewertet werden. Qualitätsbewertung wird nicht reproduzierbar.

<strong>Retries werden blinde Vermutungen</strong>: Wenn der Agent nicht weiß, warum etwas fehlschlägt, ist die Retry-Richtung zufällig. Er kann irrelevante Codepfade reparieren, während die eigentliche Ursache unberührt bleibt. Jeder blinde retry kostet Tokens und Zeit.

<strong>Informationsklippe beim Handoff</strong>: Wenn unvollständige Arbeit an die nächste Session übergeben wird, muss die neue Session ohne Beobachtbarkeit den Systemzustand von Grund auf diagnostizieren. Anthropic beobachtet, dass diese redundante Diagnose 30-50 % der Sessionzeit verbrauchen kann.

### Ein realistisches Claude-Code-Szenario

Stell dir einen harness mit planner-generator-evaluator-Workflow vor, der "Dark Mode zur App hinzufügen" ausführt.

<strong>Ohne Beobachtbarkeit</strong>: Der planner liefert eine vage Beschreibung. Der generator implementiert Dark Mode auf dieser Basis, trifft aber die impliziten Erwartungen nicht. Der evaluator lehnt nach eigenen impliziten Standards ab, kann aber nicht konkret sagen, was falsch ist. Der generator versucht blind erneut. Der Zyklus wiederholt sich 3-4 Mal, dauert etwa 45 Minuten und liefert ein kaum akzeptables Ergebnis.

<strong>Mit vollständiger Beobachtbarkeit</strong>: Der planner liefert einen sprint contract mit zu ändernden Komponenten, Verifikationsstandards und Ausschlüssen. Der generator implementiert gemäß Vertrag. Runtime-Beobachtbarkeit zeichnet das Laden und Anwenden der Styles jeder Komponente auf. Der evaluator bewertet Dimension für Dimension anhand einer Rubrik und konkreter Evidenz. Eine Iteration liefert ein hochwertiges Ergebnis in etwa 15 Minuten.

3x Effizienzunterschied. Die einzige Änderung ist Beobachtbarkeit.

### Warum Agenten das nicht selbst lösen können

Vielleicht denkst du: "Kann der Agent nicht einfach eigene Logs ausgeben?" Die Probleme sind:

## 1. Der Agent weiß nicht, was er nicht weiß; er zeichnet Signale nicht proaktiv auf, deren Bedarf er nicht erkennt.

## 2. Logformate sind inkonsistent; verschiedene Sessions nutzen unterschiedliche Formate, was systematische Analyse verhindert.

3. Prozess-Beobachtbarkeit lässt sich nicht mit Logs lösen; sprint contracts und Bewertungsrubriken sind strukturierte Artefakte auf harness-Ebene.

## Wie man es richtig macht

### 1. Runtime-Signalsammlung in den harness einbauen

Verlass dich nicht darauf, dass der Agent eigene Logs ausgibt. Der harness sollte diese Signale automatisch sammeln:

- <strong>Anwendungslebenszyklus</strong>: Startup, ready, running, shutdown
- <strong>Featurepfad-Ausführung</strong>: Kritische Pfade mit Einstiegspunkten, Checkpoints und Ausgängen
- <strong>Datenfluss</strong>: Datenbewegungen zwischen Komponenten
- <strong>Ressourcennutzung</strong>: Abnormale Muster, etwa stetig wachsender Speicher
- <strong>Fehler und Ausnahmen</strong>: Vollständiger Kontext, nicht nur Fehlermeldungen

### 2. Sprint contracts implementieren

Vor jeder Aufgabe verhandeln generator und evaluator, möglicherweise verschiedene Aufrufe desselben Agenten, einen Vertrag:

```markdown
# Sprint Contract: Dark Mode Support

## Scope
- Modify the theme toggle component
- Update global CSS variables
- Add dark mode tests

## Verification Standards
- Visual regression tests pass for each component
- Main flow end-to-end tests pass
- No flash of unstyled content (FOUC)

## Exclusions
- Not handling print styles
- Not handling third-party component dark mode
```

### 3. Eine Evaluator-Rubrik einführen

Mache aus "ist es gut oder nicht" eine quantifizierbare Bewertung:

```markdown
# Scoring Rubric

| Dimension | A | B | C | D |
|-----------|---|---|---|---|
| Code correctness | All tests pass | Main flow passes | Partial pass | Build fails |
| Architecture compliance | Fully compliant | Minor deviations | Obvious deviations | Serious violations |
| Test coverage | Main + edge cases | Main flow only | Only skeleton | No tests |
```

### 4. Mit OpenTelemetry standardisieren

Erzeuge einen trace für jede harness-Session, einen span für jede Aufgabe und sub-spans für jeden Verifikationsschritt. Standardattribute annotieren wichtige Informationen. So integrieren sich Beobachtbarkeitsdaten in Tools wie Jaeger oder Zipkin.

## Praxisfall

Ein harness mit planner-generator-evaluator-Workflow führt "Dark Mode Support hinzufügen" aus:

<strong>Nicht beobachtbare Version</strong>: 3-4 blinde retry-Runden, 45 Minuten, kaum akzeptables Ergebnis. Der evaluator sagt "fühlt sich nicht richtig an", kann aber nicht konkret werden. Der generator verschwendet Zeit in falschen Richtungen.

<strong>Voll beobachtbare Version</strong>:
- Sprint contract klärt Scope, Standards und Ausschlüsse
- Runtime-Traces zeichnen das Laden der Styles jeder Komponente auf
- Bewertungsrubrik liefert strukturierte Bewertung pro Dimension
- Eine Iteration liefert hochwertige Ergebnisse in 15 Minuten

3x Effizienzgewinn, stabilere Qualität, reproduzierbare Bewertungen.

## Wichtigste Erkenntnisse

- <strong>Beobachtbarkeit ist eine Architektur-Eigenschaft des harness</strong>, keine nachträglich hinzugefügte Funktion.
- <strong>Beide Beobachtbarkeitsschichten sind wesentlich</strong>: Runtime-Signale erklären "was passiert ist", Prozessartefakte erklären "warum es so gemacht wurde".
- <strong>Sprint contracts richten früh aus</strong> und verhindern vorhersehbare Ablehnungen durch evaluator.
- <strong>Rubriken machen Bewertung reproduzierbar</strong>, sodass verschiedene Evaluatoren ähnliche Scores liefern.
- <strong>Fehlende Beobachtbarkeit verschwendet 30-50 % der Sessionzeit für redundante Diagnose.</strong>

## Weiterführende Literatur

- [Observability Engineering - Charity Majors](https://www.honeycomb.io/blog/observability-engineering-book) — Theorie und Praxis moderner observability engineering
- [Dapper - Google (Sigelman et al.)](https://research.google/pubs/pub36356/) — wegweisende Praxis in großskaligem Distributed Tracing
- [Harness Design - Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Einführung von sprint contracts und evaluator rubrics
- [Site Reliability Engineering - Google](https://sre.google/sre-book/table-of-contents/) — systematische Anwendung von Beobachtbarkeit in Produktionssystemen

## Übungen

1. <strong>Observability-Gap-Analyse</strong>: Prüfe deinen aktuellen harness auf System- und Prozess-Beobachtbarkeit. Finde Systemzustände, die mit bestehenden Signalen nicht unterscheidbar sind, und schlage Ergänzungen vor.

2. <strong>Sprint-contract-Praxis</strong>: Schreibe einen sprint contract für eine reale Aufgabe. Lass den Agenten danach arbeiten und vergleiche Effizienz und Qualität mit und ohne Vertrag.

3. <strong>Task-trace-Konstruktion</strong>: Zeichne jeden Schritt eines Agenten während einer vollständigen Coding-Aufgabe auf. Annotiere mit OpenTelemetry-Konventionen und analysiere Informationsengpässe.
