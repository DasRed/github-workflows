---
title: Website Release
description: Action, die per leerem docs-Commit ein Release der Webseite auslöst, damit geänderte Projekt-Doku dort erscheint, plus der Doku-Workflow für Projekte.
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
- uses: DasRed/github-workflows/.github/actions/website-release@v1
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

Beide Doku-Actions zusammen in `.github/workflows/docs.yml` eines Projekts:

```yaml
name: Docs

on:
  push:
    branches: [ main ]
    paths:    [ 'docs/**' ]

  pull_request:
    paths:    [ 'docs/**' ]

  workflow_dispatch:

jobs:
  docs:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6

      - uses: DasRed/github-workflows/.github/actions/docs-check@v1

      - uses: DasRed/github-workflows/.github/actions/website-release@v1
        if:   github.event_name != 'pull_request'
        with:
          token: ${{ secrets.WEBSITE_RELEASE_TOKEN }}
          slug:  my-project
```

In Pull Requests läuft nur die [Prüfung](docs-check.md), das Release folgt mit dem Merge auf `main`.
