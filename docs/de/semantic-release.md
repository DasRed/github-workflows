---
title:       Semantic Release
description: Action, die ein Node.js-Projekt per semantic-release released, ohne Abhängigkeiten oder Konfiguration im Projekt. Plugins, Inputs, Outputs, Beispiel.
order:       100
slug:        semantic-release
section:     Actions
---

[`semantic-release`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/semantic-release) released ein
Node.js-Projekt mit [semantic-release](https://github.com/semantic-release/semantic-release). semantic-release und alle
Plugins installiert die Action selbst aus ihrer eigenen `package-lock.json`. Im Projekt brauchst du dafür keine
Abhängigkeiten, keinen Schlüssel `release` und keine Scripts. Veröffentlicht wird nichts, das übernimmt der Workflow
danach. Genutzt wird die Action von [Node.js npm CI/CD](node-npm.md) und [Node.js Docker CI/CD](node-docker.md).

## Was ein Release macht

Die Plugins laufen in dieser Reihenfolge:

| Plugin                                      | Aufgabe                                                                                                      |
|---------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `@semantic-release/commit-analyzer`         | Art des Releases aus den Conventional Commits bestimmen, mit `release-docs: true` auch `docs` als Patch      |
| `@semantic-release/release-notes-generator` | Release Notes mit den Abschnitten Features, Bug Fixes, Performance und Documentation                         |
| `@semantic-release/changelog`               | `CHANGELOG.md` fortschreiben, nur mit `changelog: true`                                                      |
| `@semantic-release/npm`                     | Version in `package.json` und `package-lock.json` setzen, ohne Publish                                       |
| `server.json`                               | Version der `server.json` setzen, nur wenn die Datei existiert (siehe unten)                                 |
| `@semantic-release/git`                     | Release-Commit `chore(release): <version> [skip ci]` mit den Release Notes und den geänderten Dateien pushen |
| `@semantic-release/github`                  | GitHub-Release anlegen, keine Kommentare bei Fehlern                                                         |
| `@saithodev/semantic-release-backmerge`     | Release in `backmerge-branch` zurückmergen, nur wenn der Branch existiert                                    |

Commit-Analyse und Release Notes nutzen das Preset
[Conventional Commits](https://www.conventionalcommits.org/). Der Tag hat die Form `v<version>`.

## server.json für MCP-Server

Liegt im Wurzelordner eine `server.json` für die [MCP Registry](mcp-publish.md), setzt die Action bei jedem Release:

- `version` auf die neue Version
- den Tag jedes Docker-Images (`registryType: oci`), z. B. `ghcr.io/dasred/my-mcp:1.2.3`
- `version` des npm-Pakets (`registryType: npm`), dessen `identifier` dem Namen aus der `package.json` entspricht

Die Datei landet mit im Release-Commit, also auch auf `main` und im Tag. Ist sie kein gültiges JSON, bricht das
Release ab, bevor etwas passiert.

> [!NOTE]
> Hat das Projekt noch eine eigene semantic-release-Konfiguration, ersetzt die Action deren Plugins. Andere Angaben
> daraus, etwa `branches`, gelten weiter.

## Aufruf

Die Action braucht ein Checkout mit voller Historie und gespeicherten Zugangsdaten, einen Git-Benutzer für den
Release-Commit und Node.js ab 26.13:

```yaml
steps:
  - uses: actions/checkout@v6
    with:
      fetch-depth:         0
      persist-credentials: true

  - run: |
         git config user.name "github-actions[bot]"
         git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

  - uses: actions/setup-node@v6
    with:
      node-version: '26'

  - id:   release
    uses: DasRed/github-workflows/.github/actions/semantic-release@v2
    with:
      github-token: ${{ github.token }}

  - if:  steps.release.outputs.released == 'true'
    run: echo "Released ${{ steps.release.outputs.version }}"
```

Der Job braucht die Rechte `contents: write`, `issues: write` und `pull-requests: write`.

## Inputs

| Name               | Pflicht | Standard  | Beschreibung                                                                                    |
|--------------------|---------|-----------|-------------------------------------------------------------------------------------------------|
| `github-token`     | ja      |           | Token für GitHub-Release, Release-Commit und Tag                                                |
| `release-docs`     | nein    | `false`   | `docs:`-Commits lösen ein Patch-Release aus, z. B. für eine Webseite, die die Doku anzeigt      |
| `changelog`        | nein    | `true`    | `CHANGELOG.md` im Repository pflegen                                                            |
| `backmerge-branch` | nein    | `develop` | Branch, in den das Release zurückgemergt wird; fehlt er, entfällt der Schritt, leer schaltet ab |

## Outputs

| Name       | Beschreibung                                           |
|------------|--------------------------------------------------------|
| `released` | `true`, wenn ein Release entstanden ist, sonst `false` |
| `version`  | Version des Releases, leer ohne Release                |
| `git-tag`  | Tag des Releases, z. B. `v1.2.3`, leer ohne Release    |
| `channel`  | Kanal des Releases, leer für den Standardkanal         |

## Gut zu wissen

- **Versionen der Plugins** stehen in der
  [`package-lock.json`](https://github.com/DasRed/github-workflows/blob/main/.github/actions/semantic-release/package-lock.json)
  der Action. Ein Update dort gilt nach dem nächsten Release dieses Repositorys für alle Projekte mit `@v2`.
- **Installation:** Die Action installiert ihre Abhängigkeiten bei jedem Lauf mit `npm ci --ignore-scripts`, das
  dauert wenige Sekunden.
- **Lokal testen:** Ohne semantic-release im Projekt geht ein Dry-Run lokal nicht mehr per Script. Den Lauf siehst du
  im Log des Workflows.
