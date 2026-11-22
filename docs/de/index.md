---
title:       Überblick
description: Wiederverwendbare GitHub-Workflows und Actions für Node.js-Projekte – Release, Docker-Image, Deployment per Dockhand, Benachrichtigung und Doku.
order:       0
section:     Einstieg
---

`github-workflows` bündelt die CI/CD-Bausteine meiner Node.js-Projekte an einer Stelle. Ein Projekt ruft den
Workflow mit wenigen Zeilen auf und bekommt Test, Build, Release per semantic-release, ein Docker-Image in der GitHub
Container Registry, das Deployment per Dockhand und eine Meldung an Home Assistant. Dazu kommen Actions, mit denen
Projekte ihre Doku prüfen und auf marco-starker.de bringen.

## Inhalt

| Baustein                                               | Art                         | Zweck                                                       |
|--------------------------------------------------------|-----------------------------|-------------------------------------------------------------|
| [Node.js Docker CI/CD](node-docker.md)                 | wiederverwendbarer Workflow | Test, Build, Release, Docker-Image, Deployment, Meldung     |
| [MCP Registry Publish](mcp-publish.md)                 | wiederverwendbarer Workflow | MCP-Server nach einem Release in die MCP Registry eintragen |
| [Dockhand Update](dockhand-update.md)                  | Action                      | Container über die Dockhand-API aktualisieren               |
| [Home Assistant Notification](homeassistant-notify.md) | Action                      | Ergebnis eines Laufs an einen Home-Assistant-Webhook        |
| [Create .env](create-env.md)                           | Action                      | `.env` aus GitHub-Secrets erzeugen                          |
| [Docs Check](docs-check.md)                            | Action                      | `docs/` gegen den Doku-Vertrag prüfen                       |
| [Website Release](website-release.md)                  | Action                      | Release der Webseite auslösen, damit neue Doku erscheint    |

Daneben liegt `.github/workflows/_release.yml`. Er released dieses Repository selbst und ist nicht zum Aufrufen
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
    uses: DasRed/github-workflows/.github/workflows/node-docker.yml@v1
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
| `@v1`     | immer das neueste 1.x-Release (empfohlen) |
| `@v1.3`   | neuester Patch einer Minor-Version        |
| `@v1.3.2` | genau ein Release                         |

Brauchst du eine Referenz, die sich nie ändert, nimm die volle Commit-SHA.

> [!NOTE]
> Die Bausteine sind auf meine Umgebung zugeschnitten: Dockhand für das Deployment, Home Assistant für Meldungen und
> marco-starker.de als Ziel der Doku. Andere können sie nutzen, wenn sie dieselben Dienste einsetzen, oder als Vorlage.

## Status

Aktiv gepflegt seit November 2026, Version 1.
