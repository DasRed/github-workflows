---
title: Node.js Docker CI/CD
description: Wiederverwendbarer Workflow für Test, Build, Release, Multi-Arch-Docker-Image in GHCR, Deployment per Dockhand und Meldung an Home Assistant.
order: 10
slug: node-docker
section: Workflows
---

[`node-docker.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/node-docker.yml) ist der
komplette Ablauf für ein Node.js-Projekt, das als Docker-Container läuft. Er besteht aus drei Jobs.

## Ablauf

1. **publish**
    - Checkt das Repository mit voller Historie aus und richtet Node.js mit npm-Cache ein.
    - Führt `npm ci`, `npm run test --if-present` und `npm run build --if-present` aus.
    - Auf `main` oder `master`: `npm run semantic-release --if-present`.
    - Zeigt der aktuelle Commit auf den Tag `v<version>` aus der `package.json`, entstand in diesem Lauf also ein
      Release, baut er ein Image für `linux/amd64` und `linux/arm64` aus dem `Dockerfile` und schiebt es nach
      `ghcr.io/<owner>/<repo>` mit den Tags `<major>`, `<major>.<minor>`, `<version>` und `latest`.
2. **deploy** – nur wenn ein Image veröffentlicht wurde und `deploy` auf `true` steht: aktualisiert den Container in
   der angegebenen Dockhand-Umgebung auf das neue `latest`-Image, siehe [Dockhand Update](dockhand-update.md).
3. **notify** – läuft immer und meldet das Ergebnis an Home Assistant, siehe
   [Home Assistant Notification](homeassistant-notify.md). Ein übersprungenes Deployment zählt als Erfolg.

## Voraussetzungen im Projekt

- `package.json` mit `version` und eine `package-lock.json`
- ein npm-Script `semantic-release` samt Konfiguration, wenn Releases entstehen sollen
- ein `Dockerfile` im Wurzelordner
- optional die npm-Scripts `test` und `build`

## Aufruf

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

> [!IMPORTANT]
> Die `permissions` im aufrufenden Workflow sind nötig. Sie begrenzen, was der `GITHUB_TOKEN` im wiederverwendbaren
> Workflow darf: Schreibrechte für Tags und Releases, Pakete für das Image, Issues und Pull Requests für die
> Kommentare von semantic-release.

## Inputs

| Name             | Typ     | Pflicht | Standard           | Beschreibung                                    |
|------------------|---------|---------|--------------------|-------------------------------------------------|
| `environment`    | string  | ja      |                    | Name der Dockhand-Umgebung für das Deployment   |
| `container-name` | string  | nein    | Name des Repos     | Name des Containers, der aktualisiert wird      |
| `node-version`   | string  | nein    | `26`               | Node.js-Version für Installation, Test und Build |
| `deploy`         | boolean | nein    | `true`             | `false` veröffentlicht nur das Image            |

## Secrets

| Name                        | Pflicht | Beschreibung                                                     |
|-----------------------------|---------|------------------------------------------------------------------|
| `dockhand-host`             | ja      | Basis-URL des Dockhand-Servers, z. B. `https://dockhand.example.com` |
| `dockhand-token`            | ja      | API-Token für Dockhand                                           |
| `homeassistant-webhook-url` | ja      | Vollständige URL des Home-Assistant-Webhooks                     |

## Gut zu wissen

- **Kein Release, kein Image.** Commits ohne `feat:`, `fix:` oder `perf:` erzeugen kein Release, also auch kein Image und kein
  Deployment. Der Lauf ist trotzdem grün.
- **`environment` und alle Secrets sind Pflicht**, auch mit `deploy: false`. Die Meldung an Home Assistant lässt sich
  nicht abschalten.
- **Runner:** Alle Jobs laufen auf `ubuntu-26.04`.
- **Cache:** Der Docker-Build nutzt den GitHub-Actions-Cache (`type=gha`), das beschleunigt Folge-Builds deutlich.
