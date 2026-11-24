---
title: Create .env
description: GitHub Action that creates a .env file for Docker or the build from selected secrets and rejects missing or multi-line values. Call, inputs and checks.
order: 70
slug: create-env
section: Actions
---

[`create-env`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/create-env) writes a `.env` with
the variables you select, taking the values from the repository secrets. Handy when a build or test needs
configuration from a `.env`.

## Call

```yaml
- uses: DasRed/github-workflows/.github/actions/create-env@v2
  with:
    variables: DATABASE_URL,API_KEY
    secrets:   ${{ toJSON(secrets) }}
```

Result in the working folder, with file mode `0600`:

```dotenv
DATABASE_URL="postgres://…"
API_KEY="…"
```

## Inputs

| Name        | Required | Description                                      |
|-------------|----------|--------------------------------------------------|
| `variables` | yes      | Variable names, separated by commas              |
| `secrets`   | yes      | Object with the secret values as JSON            |

## Checks

The action stops if

- a name is not a valid variable name (letters, digits, underscore, not starting with a digit),
- a secret is missing or empty,
- a value contains a line break.

Values are written in double quotes, special characters are escaped as in JSON.

> [!IMPORTANT]
> `variables` is marked optional in `action.yml`, but an empty value leads to the error "Invalid variable name".
> Always pass at least one variable.
