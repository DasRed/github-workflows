---
title:       Node.js npm CI/CD
description: Wiederverwendbarer Workflow für Test, Build, Release per semantic-release und Publish nach npm (Trusted Publishing) und GitHub Packages, mit Meldung.
order:       30
slug:        node-npm
section:     Workflows
---

[`node-npm.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/node-npm.yml) ist der komplette
Ablauf für ein npm-Paket. Er funktioniert wie [Node.js Docker CI/CD](node-docker.md), veröffentlicht nach einem Release
aber kein Docker-Image, sondern das Paket auf npmjs.com und in GitHub Packages. Beide Ziele lassen sich einzeln
abschalten. Ein npm-Token brauchst du nicht: Für npmjs.com nutzt der Workflow Trusted Publishing per OIDC.
semantic-release bringt der Workflow selbst mit, im Paket brauchst du dafür weder Abhängigkeiten noch Konfiguration
oder Scripts.

## Ablauf

1. **publish**
    - Checkt das Repository mit voller Historie aus und richtet Node.js mit npm-Cache ein.
    - Prüft die `package.json`: ein Name muss da sein, `private: true` ist nicht erlaubt, und für GitHub Packages muss
      das Paket im Scope des Repo-Besitzers liegen (`@<owner>/…`).
    - Führt `npm ci`, `npm run test --if-present` und `npm run build --if-present` aus.
    - Auf `main` oder `master`: Release per [Semantic Release](semantic-release.md).
    - Entstand dabei ein stabiles Release (`<major>.<minor>.<patch>`), packt er das Paket mit `npm pack` und legt das
      Tarball als Artefakt ab.
2. **npmjs** – nur nach einem Release und mit `publish-npm: true`: veröffentlicht das Tarball auf npmjs.com per
   Trusted Publishing. Ist npm im Runner älter als 11.5.1, installiert der Job vorher die aktuelle Version.
3. **github-packages** – nur nach einem Release und mit `publish-github: true`: veröffentlicht dasselbe Tarball in
   GitHub Packages mit dem `GITHUB_TOKEN`.
4. **notify** – läuft immer und meldet das Ergebnis an Home Assistant, siehe
   [Home Assistant Notification](homeassistant-notify.md). Ein übersprungenes Ziel zählt als Erfolg.

Beide Registries bekommen also genau das Tarball, das im Job `publish` entstanden ist.

## Voraussetzungen im Projekt

- `package.json` mit `name`, `version` und `repository.url`, dazu eine `package-lock.json`
- optional die npm-Scripts `test` und `build`
- für GitHub Packages einen Paketnamen im Scope des Repo-Besitzers in Kleinbuchstaben, z. B. `@dasred/my-package`

Mehr nicht. Was semantic-release macht (Version, `CHANGELOG.md`, Tag, GitHub-Release, Backmerge), steht bei
[Semantic Release](semantic-release.md). Steigst du von einem Paket mit eigenem semantic-release um, kannst du die
Abhängigkeiten `semantic-release` und `@semantic-release/*`, den Schlüssel `release`, die Scripts `semantic-release`,
`publish:check` und `prepublishOnly` sowie `publishConfig` aus der `package.json` entfernen.

### Trusted Publisher auf npmjs.com

npmjs.com nimmt das Paket nur von einem eingetragenen Trusted Publisher an. Den legst du einmal pro Paket an, entweder
auf `https://www.npmjs.com/package/<paket>/access` im Abschnitt „Trusted Publisher“ oder lokal per CLI:

```bash
npm trust github <paket> --file ci.yml --repo <owner>/<repo> --allow-publish
```

| Feld              | Wert                                                                          |
|-------------------|-------------------------------------------------------------------------------|
| Organization/User | Besitzer des Repositorys, z. B. `DasRed`                                      |
| Repository        | Name des Repositorys                                                          |
| Workflow filename | Dateiname des **aufrufenden** Workflows, z. B. `ci.yml`, nicht `node-npm.yml` |
| Environment       | leer lassen                                                                   |
| Allowed actions   | `npm publish` aktivieren                                                      |

> [!IMPORTANT]
> npm prüft den Workflow, der den Lauf gestartet hat. Bei einem wiederverwendbaren Workflow ist das die Datei in deinem
> Projekt, nicht `node-npm.yml`. Die Felder unterscheiden Groß- und Kleinschreibung und werden erst beim Publish geprüft.

> [!NOTE]
> Den Trusted Publisher kannst du erst anlegen, wenn das Paket auf npmjs.com existiert. Die erste Version
> veröffentlichst du deshalb einmal lokal mit `npm publish --access public`. Nach dem Anlegen muss innerhalb von zwei
> Tagen ein Publish über den Workflow laufen, sonst verfällt der Eintrag.

Danach kannst du in den Paket-Einstellungen unter „Publishing access“ die Option „Require two-factor authentication and
disallow tokens“ wählen. Der Workflow veröffentlicht weiter, weil er kein Token nutzt.

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
    uses: DasRed/github-workflows/.github/workflows/node-npm.yml@v2
    secrets:
      homeassistant-webhook-url: ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
```

Nur auf npmjs.com, ohne GitHub Packages:

```yaml
jobs:
  pipeline:
    uses: DasRed/github-workflows/.github/workflows/node-npm.yml@v2
    secrets:
      homeassistant-webhook-url: ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
    with:
      publish-github: false
```

> [!IMPORTANT]
> Die `permissions` im aufrufenden Workflow sind nötig, auch wenn du ein Ziel abschaltest. GitHub prüft die Rechte
> aller Jobs schon beim Start: Schreibrechte für Tags und Releases, Issues und Pull Requests für die Kommentare von
> semantic-release, `packages` für GitHub Packages und `id-token` für Trusted Publishing.

## Inputs

| Name               | Typ     | Pflicht | Standard  | Beschreibung                                                    |
|--------------------|---------|---------|-----------|-----------------------------------------------------------------|
| `publish-npm`      | boolean | nein    | `true`    | Paket auf npmjs.com veröffentlichen                             |
| `publish-github`   | boolean | nein    | `true`    | Paket in GitHub Packages veröffentlichen                        |
| `npm-access`       | string  | nein    | `public`  | Sichtbarkeit auf npmjs.com, `public` oder `restricted`          |
| `changelog`        | boolean | nein    | `true`    | `CHANGELOG.md` im Repository pflegen                            |
| `backmerge-branch` | string  | nein    | `develop` | Branch, in den das Release zurückgemergt wird, leer schaltet ab |
| `node-version`     | string  | nein    | `26`      | Node.js-Version für Installation, Test, Build und Publish       |

## Secrets

| Name                        | Pflicht | Beschreibung                                 |
|-----------------------------|---------|----------------------------------------------|
| `homeassistant-webhook-url` | ja      | Vollständige URL des Home-Assistant-Webhooks |

## Outputs

| Name       | Beschreibung                                                   |
|------------|----------------------------------------------------------------|
| `released` | `true`, wenn der Lauf ein Release erzeugt hat, sonst `false`   |
| `version`  | Version des Releases aus der `package.json`, leer ohne Release |
| `package`  | Name des Pakets aus der `package.json`                         |

## Gut zu wissen

- **Kein Release, kein Publish.** Commits ohne `feat:`, `fix:` oder `perf:` erzeugen kein Release, also wird auch
  nichts veröffentlicht. Der Lauf ist trotzdem grün.
- **Nur stabile Versionen.** Prereleases (z. B. `1.2.0-beta.1`) werden nicht veröffentlicht.
- **`publishConfig` stört nicht.** Registry und Sichtbarkeit setzt der Workflow per Kommandozeile, das hat Vorrang vor
  `publishConfig` in der `package.json`. Ein Paket mit `publishConfig.registry` auf GitHub Packages landet also
  trotzdem auch auf npmjs.com.
- **Keine Scripts beim Publish.** Ein Tarball zu veröffentlichen führt keine Lifecycle-Scripts aus, ein altes
  `prepublishOnly` mit `npm run semantic-release` startet also kein zweites Release. `npm pack` führt `prepack` und
  `prepare` aber aus.
- **Wiederholen ist sicher.** Liegt die Version schon in einer Registry, überspringt der Job das Publish mit einem
  Hinweis. So kannst du nach einem Fehler einzelne Jobs neu starten.
- **Provenance:** Bei öffentlichem Repository und öffentlichem Paket erzeugt npmjs.com die Provenance automatisch.
  GitHub Packages bekommt keine.
- **Runner:** Trusted Publishing geht nur auf GitHub-gehosteten Runnern. Alle Jobs laufen auf `ubuntu-26.04`.
- **Die Meldung an Home Assistant lässt sich nicht abschalten**, das Secret ist Pflicht.
