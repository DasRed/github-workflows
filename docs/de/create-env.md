---
title: Create .env
description: GitHub Action, die aus ausgewählten Secrets eine .env-Datei für Docker oder den Build erzeugt und fehlende oder mehrzeilige Werte abweist. Aufruf und Inputs.
order: 70
slug: create-env
section: Actions
---

[`create-env`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/create-env) schreibt eine `.env`
mit den Variablen, die du auswählst, und nimmt die Werte aus den Secrets des Repositorys. Das ist praktisch, wenn ein
Build oder Test Konfiguration aus einer `.env` braucht.

## Aufruf

```yaml
- uses: DasRed/github-workflows/.github/actions/create-env@v1
  with:
    variables: DATABASE_URL,API_KEY
    secrets:   ${{ toJSON(secrets) }}
```

Ergebnis im Arbeitsordner, mit Dateirechten `0600`:

```dotenv
DATABASE_URL="postgres://…"
API_KEY="…"
```

## Inputs

| Name        | Pflicht | Beschreibung                                         |
|-------------|---------|------------------------------------------------------|
| `variables` | ja      | Namen der Variablen, durch Komma getrennt            |
| `secrets`   | ja      | Objekt mit den Secret-Werten als JSON                |

## Prüfungen

Die Action bricht ab, wenn

- ein Name kein gültiger Variablenname ist (Buchstaben, Ziffern, Unterstrich, nicht mit Ziffer beginnend),
- ein Secret fehlt oder leer ist,
- ein Wert einen Zeilenumbruch enthält.

Die Werte stehen in doppelten Anführungszeichen, Sonderzeichen werden wie in JSON maskiert.

> [!IMPORTANT]
> `variables` ist im `action.yml` zwar als optional markiert, ein leerer Wert führt aber zum Fehler
> „Invalid variable name“. Gib immer mindestens eine Variable an.
