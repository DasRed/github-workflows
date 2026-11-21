---
title: Docs Check
description: Action, die den docs-Ordner eines Projekts mit denselben Regeln prüft wie der Build von marco-starker.de.
order: 80
slug: docs-check
section: Actions
---

[`docs-check`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/docs-check) prüft die Doku eines
Projekts, bevor sie auf [marco-starker.de](https://www.marco-starker.de) erscheint. Die Regeln sind dieselben, die die
Webseite beim Build anwendet. Ist die Prüfung grün, nimmt auch der Build der Webseite die Doku an.

## Was geprüft wird

- **Ordner:** nur `de/`, `en/` und `assets/`, keine Unterordner. In `assets/` liegen nur Bilder (`gif`, `jpg`,
  `jpeg`, `png`, `svg`, `webp`).
- **Seiten:** `de/index.md` und `en/index.md` sind vorhanden, jede Seite gibt es in beiden Sprachen mit gleichem
  Dateinamen.
- **Frontmatter:** `title`, `description` (höchstens 160 Zeichen) und `order` als ganze Zahl. `slug` ist optional,
  enthält nur a–z, 0–9 und Bindestriche und ist je Sprache eindeutig.
- **Markdown:** keine `# `-Überschrift im Text, jeder Codeblock nennt seine Sprache, HTML nur `<details>` und
  `<summary>`.
- **Links:** Links auf andere Seiten sind relativ (`page.md`) und zeigen auf eine vorhandene Seite.
- **Bilder:** referenziert als `../assets/<datei>`, vorhanden, mit Alt-Text und unter 500 KB (GIF bis 2 MB).

Die vollständigen Regeln stehen im
[Doku-Vertrag](https://github.com/DasRed/ai-instructions/blob/main/website-marco-starker.de/docs-contract.md).

## Aufruf

```yaml
- uses: actions/checkout@v6
- uses: DasRed/github-workflows/.github/actions/docs-check@v1
```

## Inputs

| Name   | Pflicht | Standard | Beschreibung                                |
|--------|---------|----------|---------------------------------------------|
| `path` | nein    | `docs`   | Ordner der Doku, relativ zum Repository     |

## Ergebnis

Jedes Problem erscheint als Annotation an Datei und Zeile und als Tabelle in der Zusammenfassung des Jobs. Gibt es
mindestens ein Problem, schlägt der Schritt fehl.

```text
✗ docs: 2 problem(s) in 8 pages
```

## Lokal prüfen

Die Action ist ein einzelnes Node-Skript ohne Abhängigkeiten. Aus einem Klon dieses Repositorys heraus prüfst du
einen Doku-Ordner auch ohne GitHub:

```bash
GITHUB_WORKSPACE=~/Web/private/my-project node .github/actions/docs-check/docs-check.mjs
```

Mit `INPUT_PATH=handbook` prüfst du einen anderen Ordner als `docs`.
