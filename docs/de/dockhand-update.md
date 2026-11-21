---
title: Dockhand Update
description: Action, die einen Docker-Container über die Dockhand-API mit einem neuen Image aktualisiert und neu startet.
order: 50
slug: dockhand-update
section: Actions
---

[`dockhand-update`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/dockhand-update) aktualisiert
einen Container über die API von Dockhand. Der Workflow
[Node.js Docker CI/CD](node-docker.md) nutzt sie im Job `deploy`; du kannst sie auch einzeln einsetzen.

## Ablauf

1. Lädt alle Umgebungen von `<host>/api/environments`.
2. Sucht die Umgebung nach ihrem Namen, ohne auf Groß- und Kleinschreibung zu achten.
3. Ruft `POST /api/containers/<name>/update` auf: Das Image wird neu gezogen und der Container danach gestartet.

Jede Anfrage hat ein Zeitlimit von zwei Minuten. Antwortet Dockhand mit einem Fehler, bricht die Action mit Status und
den ersten 500 Zeichen der Antwort ab.

## Aufruf

```yaml
- uses: DasRed/github-workflows/.github/actions/dockhand-update@v1
  with:
    host:           ${{ secrets.DOCKHAND_HOST }}
    token:          ${{ secrets.DOCKHAND_TOKEN }}
    environment:    production
    container_name: my-container
    image:          ghcr.io/owner/repo:latest
```

## Inputs

| Name             | Pflicht | Beschreibung                                   |
|------------------|---------|------------------------------------------------|
| `host`           | ja      | URL des Dockhand-Servers                       |
| `token`          | ja      | API-Token für Dockhand                         |
| `environment`    | ja      | Name der Dockhand-Umgebung                     |
| `container_name` | ja      | Name des Docker-Containers                     |
| `image`          | ja      | Vollständige Image-Referenz mit Tag            |

> [!NOTE]
> Die Inputs dieser Action schreiben sich mit Unterstrich (`container_name`), die des Workflows mit Bindestrich
> (`container-name`).
