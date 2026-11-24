---
title: Website Release
description: Action, die per leerem docs-Commit ein Release der Webseite auslöst, damit geänderte Projekt-Doku dort erscheint. Inputs, Token und Beispiel-Aufruf.
order: 90
slug: website-release
section: Actions
---

[`website-release`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/website-release) legt über
die GitHub-API einen leeren Commit `docs(<slug>): sync documentation` auf dem Release-Branch der Webseite an, ohne das
Repository zu klonen. semantic-release der Webseite wertet `docs` als Patch-Release, und der Build holt dabei die Doku
aller Projekte.

## Ablauf

1. Prüft den Slug: nur a–z, 0–9 und Bindestriche.
2. Liest den aktuellen Stand des Branches und legt darauf den leeren Commit an.
3. Setzt den Branch ohne Force auf den neuen Commit. Ist der Branch inzwischen weitergelaufen, weil zwei Projekte
   gleichzeitig auslösen, baut die Action den Commit auf dem neuen Stand neu. Höchstens drei Versuche.

Der Commit erscheint in der Zusammenfassung des Jobs mit Link.

## Aufruf

```yaml
- uses: DasRed/github-workflows/.github/actions/website-release@v2
  with:
    token: ${{ secrets.WEBSITE_RELEASE_TOKEN }}
    slug:  my-project
```

## Inputs und Outputs

| Input    | Pflicht | Standard                  | Beschreibung                                  |
|----------|---------|---------------------------|-----------------------------------------------|
| `token`  | ja      |                           | Token mit Schreibrecht auf das Repo der Webseite |
| `slug`   | ja      |                           | Slug des Projekts auf der Webseite            |
| `repo`   | nein    | `DasRed/marco-starker.de` | Repository der Webseite                       |
| `branch` | nein    | `main`                    | Release-Branch der Webseite                   |

| Output   | Beschreibung                  |
|----------|-------------------------------|
| `commit` | SHA des angelegten Commits    |

> [!IMPORTANT]
> Der Token darf nicht der `GITHUB_TOKEN` sein: Commits mit ihm starten keine Workflows, die CI der Webseite liefe
> nicht los. Nimm einen Fine-grained Token nur für das Repository der Webseite mit „Contents: Read and write“.

## Doku-Workflow eines Projekts

In Projekten rufst du die Action nicht selbst auf, sondern den Workflow [Docs](docs-workflow.md). Er prüft die
Doku mit [Docs Check](docs-check.md) und löst danach das Release aus.
