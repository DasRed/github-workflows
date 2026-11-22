---
title:       MCP Registry Publish
description: Wiederverwendbarer Workflow, der einen MCP-Server nach einem Release in die offizielle MCP Registry einträgt.
order:       20
slug:        mcp-publish
section:     Workflows
---

[`mcp-publish.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/mcp-publish.yml) trägt einen
MCP-Server in die [offizielle MCP Registry](https://registry.modelcontextprotocol.io) ein. Er läuft nach
[Node.js Docker CI/CD](node-docker.md) und nur dann, wenn dort ein Release entstanden ist.

## Ablauf

1. Checkt den Release-Tag `v<version>` aus, also den Release-Commit von semantic-release.
2. Prüft, ob `version` in der `server.json` und der Tag aller Docker-Images (`registryType: oci`) zur Release-Version
   passen. Sonst bricht der Lauf mit einer Fehlermeldung ab.
3. Lädt `mcp-publisher` in der angegebenen Version und prüft die Signatur mit cosign.
4. Meldet sich per GitHub OIDC an. Ein Token oder Secret ist nicht nötig.
5. Trägt die `server.json` in die Registry ein.

Die Version in der `server.json` setzt semantic-release im Projekt, genau wie in der `package.json`. Sie landet also im
Release-Commit `chore(release): <version>`.

## Voraussetzungen im Projekt

- eine `server.json` nach dem [Schema der Registry](https://modelcontextprotocol.io/registry/quickstart)
- ein Name im Namespace `io.github.<owner>/…`, passend zum Besitzer des Repositorys
- bei Docker-Images das Label im `Dockerfile`, das den Namen bestätigt:

```dockerfile
LABEL io.modelcontextprotocol.server.name="io.github.DasRed/my-mcp"
```

- `@semantic-release/exec` als devDependency und in der Release-Konfiguration ein Schritt, der die Version setzt, plus
  `server.json` in den Assets von `@semantic-release/git`:

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

Der Workflow hängt sich als zweiter Job an `node-docker.yml`:

```yaml
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

  mcp-registry:
    needs: pipeline
    if:    needs.pipeline.outputs.released == 'true'
    uses:  DasRed/github-workflows/.github/workflows/mcp-publish.yml@v1
    permissions:
      contents: read
      id-token: write
    with:
      version: ${{ needs.pipeline.outputs.version }}
```

> [!IMPORTANT]
> `id-token: write` muss im aufrufenden Job stehen. Ohne diese Berechtigung bekommt `mcp-publisher` kein OIDC-Token und
> die Anmeldung schlägt fehl.

## Inputs

| Name                | Typ    | Pflicht | Standard      | Beschreibung                        |
|---------------------|--------|---------|---------------|-------------------------------------|
| `version`           | string | ja      |               | Version des Releases, z. B. `1.2.3` |
| `server-file`       | string | nein    | `server.json` | Pfad der Datei im Repository        |
| `publisher-version` | string | nein    | `v1.8.13`     | Release-Tag von `mcp-publisher`     |

## Gut zu wissen

- **Dateiname frei wählbar.** `mcp-publisher publish` nimmt jeden Pfad, deshalb gibt es `server-file`.
- **Eine Version nur einmal.** Die Registry nimmt jede Version nur einmal an. Ein erneuter Lauf für dieselbe Version
  schlägt fehl.
- **Image muss existieren.** Die Registry prüft das Image samt Label. Deshalb läuft der Job erst nach `node-docker.yml`.
- **Registry in der Vorschau.** Bei `invalid audience` ist `mcp-publisher` zu alt, dann `publisher-version` erhöhen.
