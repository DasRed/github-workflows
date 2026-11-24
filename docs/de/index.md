---
title:       Überblick
description: Wiederverwendbare GitHub-Workflows und Actions für Node.js-Projekte – Release, Docker-Image oder npm-Paket, Deployment per Dockhand, Meldung und Doku.
order:       0
section:     Einstieg
---

`github-workflows` bündelt die CI/CD-Bausteine meiner Node.js-Projekte an einer Stelle. Ein Projekt ruft den
Workflow mit wenigen Zeilen auf und bekommt Test, Build, Release per semantic-release, ein Docker-Image in der GitHub
Container Registry, das Deployment per Dockhand und eine Meldung an Home Assistant. npm-Pakete bekommen statt Image
und Deployment ein Publish nach npmjs.com und GitHub Packages. Dazu kommen Actions, mit denen Projekte ihre Doku prüfen
und auf marco-starker.de bringen.

## Inhalt

| Baustein                                               | Art                         | Zweck                                                      |
|--------------------------------------------------------|-----------------------------|------------------------------------------------------------|
| [Node.js Docker CI/CD](node-docker.md)                 | wiederverwendbarer Workflow | Test, Build, Release, Docker-Image, Deployment, Meldung    |
| [MCP Server CI/CD](mcp-publish.md)                     | wiederverwendbarer Workflow | wie Node.js Docker CI/CD, dazu Eintrag in die MCP Registry |
| [Node.js npm CI/CD](node-npm.md)                       | wiederverwendbarer Workflow | Test, Build, Release, Publish nach npm und GitHub Packages |
| [Docs](docs-workflow.md)                               | wiederverwendbarer Workflow | Doku prüfen und per Release auf die Webseite bringen       |
| [Dockhand Update](dockhand-update.md)                  | Action                      | Container über die Dockhand-API aktualisieren              |
| [Home Assistant Notification](homeassistant-notify.md) | Action                      | Ergebnis eines Laufs an einen Home-Assistant-Webhook       |
| [Create .env](create-env.md)                           | Action                      | `.env` aus GitHub-Secrets erzeugen                         |
| [Docs Check](docs-check.md)                            | Action                      | `docs/` gegen den Doku-Vertrag prüfen                      |
| [Website Release](website-release.md)                  | Action                      | Release der Webseite auslösen, damit neue Doku erscheint   |
| [Semantic Release](semantic-release.md)                | Action                      | Release per semantic-release ohne Setup im Projekt         |

Daneben liegt `.github/workflows/_release.yml`. Er released dieses Repository selbst, mit der Action
[Semantic Release](semantic-release.md) aus dem eigenen Stand statt `@v2`, und ist nicht zum Aufrufen
gedacht.

## Schnellstart

`.github/workflows/ci.yml` in einem Projekt mit `Dockerfile` und semantic-release:

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]

  workflow_dispatch:

permissions:
  contents:      write
  packages:      write
  issues:        write
  pull-requests: write

jobs:
  pipeline:
    uses: DasRed/github-workflows/.github/workflows/node-docker.yml@v2
    secrets:
      dockhand-host:             ${{ secrets.DOCKHAND_HOST }}
      dockhand-token:            ${{ secrets.DOCKHAND_TOKEN }}
      homeassistant-webhook-url: ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
    with:
      environment:    production
      container-name: my-container
```

## Versionierung

Das Repository wird per semantic-release nach
[Conventional Commits](https://www.conventionalcommits.org/) veröffentlicht. Jedes Release bekommt einen Tag
`v<major>.<minor>.<patch>`, und die mitlaufenden Tags `v<major>` und `v<major>.<minor>` werden darauf verschoben.

| Referenz  | Bedeutung                                 |
|-----------|-------------------------------------------|
| `@v2`     | immer das neueste 2.x-Release (empfohlen) |
| `@v2.3`   | neuester Patch einer Minor-Version        |
| `@v2.3.2` | genau ein Release                         |

Brauchst du eine Referenz, die sich nie ändert, nimm die volle Commit-SHA.

> [!NOTE]
> Die Bausteine sind auf meine Umgebung zugeschnitten: Dockhand für das Deployment, Home Assistant für Meldungen und
> marco-starker.de als Ziel der Doku. Andere können sie nutzen, wenn sie dieselben Dienste einsetzen, oder als Vorlage.

## Umstieg von v1

- **MCP-Server:** [MCP Server CI/CD](mcp-publish.md) ist jetzt der komplette Ablauf und ersetzt die zwei Jobs
  `node-docker.yml` + `mcp-publish.yml`. Der Abschnitt „Umstieg vom zweiten Job“ dort zeigt die neue `ci.yml`.
- **semantic-release:** [Node.js Docker CI/CD](node-docker.md) bringt semantic-release selbst mit. Projekte mit eigenem
  Script `semantic-release` laufen unverändert weiter; wie du es aus dem Projekt entfernst, steht dort unter „Eigenes
  semantic-release“.
- **Doku:** Die `docs.yml` im Projekt ruft jetzt den Workflow [Docs](docs-workflow.md) auf, statt die Actions selbst
  zu verketten.
- Überall `@v1` durch `@v2` ersetzen.

## Status

Aktiv gepflegt seit November 2026, Version 2.
