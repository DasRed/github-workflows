---
title:       MCP Server CI/CD
description: Wiederverwendbarer Workflow für MCP-Server: Test, Release, Docker-Image, Deployment, Eintrag in die MCP Registry und eine gemeinsame Meldung an Home Assistant.
order:       20
slug:        mcp-publish
section:     Workflows
---

[`mcp-publish.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/mcp-publish.yml) ist der
komplette Ablauf für einen MCP-Server, der als Docker-Container läuft. Er macht alles, was
[Node.js Docker CI/CD](node-docker.md) macht, und trägt den Server danach in die
[offizielle MCP Registry](https://registry.modelcontextprotocol.io) ein. Erst wenn beides durch ist, meldet er das
Ergebnis an Home Assistant. Schlägt der Eintrag in die Registry fehl, bekommst du also eine Fehlermeldung und keine
Erfolgsmeldung.

## Ablauf

1. **publish** – ruft [Node.js Docker CI/CD](node-docker.md) auf: Test, Build, Release, Docker-Image und Deployment.
   Dessen eigene Meldung ist abgeschaltet (`notify: false`).
2. **mcp-registry** – nur wenn ein Release entstanden ist, auch wenn nur das Deployment fehlgeschlagen ist:
    1. Checkt den Release-Tag `v<version>` aus, also den Release-Commit von semantic-release.
    2. Prüft, ob `version` in der `server.json` und der Tag aller Docker-Images (`registryType: oci`) zur
       Release-Version passen. Sonst bricht der Job mit einer Fehlermeldung ab.
    3. Lädt `mcp-publisher` in der angegebenen Version und prüft die Signatur mit cosign.
    4. Meldet sich per GitHub OIDC an. Ein Token oder Secret ist nicht nötig.
    5. Trägt die `server.json` in die Registry ein.
3. **notify** – läuft immer und meldet das Ergebnis beider Jobs an Home Assistant, siehe
   [Home Assistant Notification](homeassistant-notify.md). Ein übersprungener Registry-Eintrag, etwa ohne Release,
   zählt als Erfolg.

Test, Release, Image und Deployment pflegst du also nur an einer Stelle, in `node-docker.yml`.

## Voraussetzungen im Projekt

Alles aus [Node.js Docker CI/CD](node-docker.md), dazu:

- eine `server.json` nach dem [Schema der Registry](https://modelcontextprotocol.io/registry/quickstart)
- ein Name im Namespace `io.github.<owner>/…`, passend zum Besitzer des Repositorys
- bei Docker-Images das Label im `Dockerfile`, das den Namen bestätigt:

```dockerfile
LABEL io.modelcontextprotocol.server.name="io.github.DasRed/my-mcp"
```

Liegt die `server.json` im Wurzelordner, setzt das eingebaute [Semantic Release](semantic-release.md) die Version
automatisch, im Projekt brauchst du dafür nichts. Nur wenn das Projekt noch sein eigenes semantic-release nutzt,
braucht es `@semantic-release/exec` als devDependency und in der Release-Konfiguration einen Schritt, der die Version
setzt, plus `server.json` in den Assets von `@semantic-release/git`:

```json
[
    "@semantic-release/exec",
    {
        "prepareCmd": "jq --indent 4 --arg v ${nextRelease.version} '.version = $v | .packages |= map(if .registryType == \"oci\" then .identifier |= sub(\":[^:/@]+$\"; \"\") + \":\" + $v else . end)' server.json > server.json.tmp && mv server.json.tmp server.json"
    }
]
```

Der Schritt gehört hinter `@semantic-release/npm` und vor `@semantic-release/git`.

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
  id-token:      write

jobs:
  pipeline:
    uses: DasRed/github-workflows/.github/workflows/mcp-publish.yml@v2
    secrets:
      dockhand-host:             ${{ secrets.DOCKHAND_HOST }}
      dockhand-token:            ${{ secrets.DOCKHAND_TOKEN }}
      homeassistant-webhook-url: ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
    with:
      environment:    production
      container-name: mcp-my-server
```

> [!IMPORTANT]
> `id-token: write` muss im aufrufenden Workflow stehen. Ohne diese Berechtigung bekommt `mcp-publisher` kein
> OIDC-Token und die Anmeldung schlägt fehl.

## Inputs

| Name                | Typ     | Pflicht | Standard       | Beschreibung                                          |
|---------------------|---------|---------|----------------|-------------------------------------------------------|
| `environment`       | string  | ja      |                | Name der Dockhand-Umgebung für das Deployment         |
| `container-name`    | string  | nein    | Name des Repos | Name des Containers, der aktualisiert wird            |
| `node-version`      | string  | nein    | `26`           | Node.js-Version für Installation, Test und Build      |
| `deploy`            | boolean | nein    | `true`         | `false` veröffentlicht nur Image und Registry-Eintrag |
| `changelog`         | boolean | nein    | `true`         | `CHANGELOG.md` im Repository pflegen                  |
| `release-docs`      | boolean | nein    | `false`        | `docs:`-Commits lösen ein Patch-Release aus           |
| `backmerge-branch`  | string  | nein    | `develop`      | Branch für den Backmerge, leer schaltet ab            |
| `server-file`       | string  | nein    | `server.json`  | Pfad der `server.json` im Repository                  |
| `publisher-version` | string  | nein    | `v1.8.13`      | Release-Tag von `mcp-publisher`                       |

Alle Inputs bis `backmerge-branch` gibt der Workflow unverändert an [Node.js Docker CI/CD](node-docker.md) weiter.

## Secrets

| Name                        | Pflicht | Beschreibung                                                         |
|-----------------------------|---------|----------------------------------------------------------------------|
| `dockhand-host`             | ja      | Basis-URL des Dockhand-Servers, z. B. `https://dockhand.example.com` |
| `dockhand-token`            | ja      | API-Token für Dockhand                                               |
| `homeassistant-webhook-url` | ja      | Vollständige URL des Home-Assistant-Webhooks                         |

## Outputs

| Name       | Beschreibung                                                                              |
|------------|-------------------------------------------------------------------------------------------|
| `released` | `true`, wenn der Lauf ein Release erzeugt und das Image veröffentlicht hat, sonst `false` |
| `version`  | Version des Releases aus der `package.json`, leer ohne Release                            |
| `image`    | Name des Images ohne Tag, z. B. `ghcr.io/owner/repo`                                      |

## Umstieg vom zweiten Job

Bisher lief `mcp-publish.yml` als zweiter Job hinter `node-docker.yml` und bekam nur `version`. Jetzt ersetzt er
beide Jobs: In der `ci.yml` wird aus `node-docker.yml` einfach `mcp-publish.yml`, der Job `mcp-registry` fällt weg,
und `id-token: write` wandert in die `permissions` oben im Workflow.

## Gut zu wissen

- **Dateiname frei wählbar.** `mcp-publisher publish` nimmt jeden Pfad, deshalb gibt es `server-file`. Die Version
  setzt das eingebaute semantic-release aber nur in `server.json` im Wurzelordner.
- **Eine Version nur einmal.** Die Registry nimmt jede Version nur einmal an. Ein erneuter Lauf für dieselbe Version
  schlägt fehl.
- **Image muss existieren.** Die Registry prüft das Image samt Label. Deshalb läuft der Eintrag erst nach dem Image.
- **Registry in der Vorschau.** Bei `invalid audience` ist `mcp-publisher` zu alt, dann `publisher-version` erhöhen.
