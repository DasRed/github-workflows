---
title:       Docs
description: Wiederverwendbarer Workflow, der die Doku eines Projekts gegen den Vertrag prüft und nach dem Merge ein Release der Webseite mit der neuen Doku auslöst.
order:       40
slug:        docs-workflow
section:     Workflows
---

[`docs.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/docs.yml) bringt die Doku eines
Projekts auf [marco-starker.de](https://www.marco-starker.de). Er ist unabhängig von Sprache und Build-System, passt
also auch für Java/Gradle-Mods. Im Projekt bleibt nur ein kurzer Aufruf.

## Ablauf

Ein Job **docs**:

1. Checkt das Repository aus.
2. Prüft den Doku-Ordner mit [Docs Check](docs-check.md). Bei Fehlern bricht der Lauf ab.
3. Außer in Pull Requests: legt mit [Website Release](website-release.md) den leeren Commit
   `docs(<slug>): sync documentation` im Repo der Webseite an. Die Webseite baut daraufhin ein Release mit der Doku
   aller Projekte.

In Pull Requests läuft also nur die Prüfung, das Release folgt mit dem Merge auf `main`.

## Aufruf

`.github/workflows/docs.yml` im Projekt:

```yaml
name: Docs

on:
  push:
    branches: [ main ]
    paths:    [ 'docs/**' ]

  pull_request:
    paths:    [ 'docs/**' ]

  workflow_dispatch:

permissions:
  contents: read

jobs:
  docs:
    uses: DasRed/github-workflows/.github/workflows/docs.yml@v2
    secrets:
      website-release-token: ${{ secrets.WEBSITE_RELEASE_TOKEN }}
```

Weicht der Slug auf der Webseite vom Namen des Repositorys ab, gib ihn mit an:

```yaml
    with:
      slug: my-project
```

## Inputs

| Name             | Typ    | Pflicht | Standard                  | Beschreibung                       |
|------------------|--------|---------|---------------------------|------------------------------------|
| `slug`           | string | nein    | Name des Repos            | Slug des Projekts auf der Webseite |
| `path`           | string | nein    | `docs`                    | Ordner der Doku, relativ zum Repo  |
| `website-repo`   | string | nein    | `DasRed/marco-starker.de` | Repository der Webseite            |
| `website-branch` | string | nein    | `main`                    | Release-Branch der Webseite        |

## Secrets

| Name                    | Pflicht | Beschreibung                                                                |
|-------------------------|---------|-----------------------------------------------------------------------------|
| `website-release-token` | ja      | Fine-grained Token mit „Contents: Read and write“ auf das Repo der Webseite |

> [!IMPORTANT]
> Der Token darf nicht der `GITHUB_TOKEN` sein: Commits mit ihm starten keine Workflows, die CI der Webseite liefe
> nicht los.

## Gut zu wissen

- **Nur bei Änderungen an der Doku.** Der Filter `paths` im Aufruf sorgt dafür, dass Code-Commits kein Release der
  Webseite auslösen. `workflow_dispatch` erlaubt ein Release von Hand.
- **Runner:** Der Job läuft auf `ubuntu-26.04`.
