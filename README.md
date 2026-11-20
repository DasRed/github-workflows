# github-workflows

Reusable GitHub Actions workflows and composite/JavaScript actions for Node.js projects that are released with
[semantic-release](https://github.com/semantic-release/semantic-release), shipped as Docker images to the GitHub
Container Registry and deployed via Dockhand.

## Contents

| Path                                    | Type              | Purpose                                                                 |
|-----------------------------------------|-------------------|-------------------------------------------------------------------------|
| `.github/workflows/node-docker.yml`     | Reusable workflow | Test, build, release, publish a Docker image, deploy and notify         |
| `.github/actions/dockhand-update`       | Action            | Update (re-pull and restart) a container through the Dockhand API       |
| `.github/actions/homeassistant-notify`  | Action            | Send the result of a workflow run to a Home Assistant webhook           |
| `.github/actions/create-env`            | Action            | Generate a `.env` file from GitHub secrets                              |
| `.github/workflows/_release.yml`        | Internal workflow | Releases this repository itself (not meant to be called)                |

## Node.js Docker CI/CD (`node-docker.yml`)

### What it does

1. **publish**
    - Checks out the repository with full history and sets up Node.js (npm cache enabled).
    - Runs `npm ci`, `npm run test --if-present` and `npm run build --if-present`.
    - On `main` or `master`: runs `npm run semantic-release --if-present`.
    - If the current commit is tagged `v<version>` (taken from `package.json`), it builds a multi-arch image
      (`linux/amd64`, `linux/arm64`) from `./Dockerfile` and pushes it to `ghcr.io/<owner>/<repo>` with the tags
      `<major>`, `<major>.<minor>`, `<version>` and `latest`.
2. **deploy** – only when an image was released and `deploy` is `true`: updates the container in the given
   Dockhand environment to the new `latest` image.
3. **notify** – always runs and reports the overall result to Home Assistant. A skipped deployment counts as success.

### Requirements for the calling repository

- A `package.json` with a `version` field and `package-lock.json`.
- A `semantic-release` npm script (and its configuration) if releases should be created.
- A `Dockerfile` in the repository root.
- Optional `test` and `build` npm scripts.

### Usage

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

The permissions above are required: the calling workflow limits what the `GITHUB_TOKEN` may do inside the reusable
workflow.

### Inputs

| Name             | Type    | Required | Default                 | Description                                          |
|------------------|---------|----------|-------------------------|------------------------------------------------------|
| `environment`    | string  | yes      |                         | Name of the Dockhand environment to deploy to        |
| `container-name` | string  | no       | name of the repository  | Name of the container to update                      |
| `node-version`   | string  | no       | `26`                    | Node.js version used for install, test and build     |
| `deploy`         | boolean | no       | `true`                  | Set to `false` to only publish the image             |

### Secrets

| Name                        | Required | Description                                                       |
|-----------------------------|----------|-------------------------------------------------------------------|
| `dockhand-host`             | yes      | Base URL of the Dockhand server, e.g. `https://dockhand.example.com` |
| `dockhand-token`            | yes      | Dockhand API token                                                |
| `homeassistant-webhook-url` | yes      | Full Home Assistant webhook URL                                   |

## Actions

### Dockhand Update

Looks up the environment by name (case-insensitive) and updates the container to the given image. The image is
re-pulled and the container is started after the update.

```yaml
- uses: DasRed/github-workflows/.github/actions/dockhand-update@v1
  with:
    host:           ${{ secrets.DOCKHAND_HOST }}
    token:          ${{ secrets.DOCKHAND_TOKEN }}
    environment:    production
    container_name: my-container
    image:          ghcr.io/owner/repo:latest
```

| Input            | Required | Description                                |
|------------------|----------|--------------------------------------------|
| `host`           | yes      | Dockhand server URL                        |
| `token`          | yes      | Dockhand API token                         |
| `environment`    | yes      | Dockhand environment name                  |
| `container_name` | yes      | Docker container name                      |
| `image`          | yes      | Full Docker image reference including tag  |

### Home Assistant Notification

Posts the result of the jobs listed in `needs` to a Home Assistant webhook. The run counts as successful when the
`publish` job succeeded and every other job either succeeded or was skipped.

```yaml
notify:
  needs:   [ publish, deploy ]
  if:      ${{ always() }}
  runs-on: ubuntu-latest
  permissions:
    contents: read
  steps:
    - uses: DasRed/github-workflows/.github/actions/homeassistant-notify@v1
      with:
        webhook_url:  ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
        job_results:  ${{ toJSON(needs) }}
        github_token: ${{ github.token }}
```

| Input          | Required | Description                                                   |
|----------------|----------|---------------------------------------------------------------|
| `webhook_url`  | yes      | Home Assistant webhook URL                                    |
| `job_results`  | yes      | The `needs` context as JSON                                   |
| `github_token` | no       | Token used to read the commit message from the GitHub API     |

Payload sent to the webhook:

```json
{
    "status":              "success",
    "repository":          "owner/repo",
    "commitMessage":       "feat: something\n\nbody",
    "commitMessageHeader": "feat: something",
    "sha":                 "…",
    "branch":              "main",
    "event":               "push",
    "workflow":            {
        "name":       "CI/CD",
        "runId":      123,
        "runAttempt": 1,
        "url":        "https://github.com/owner/repo/actions/runs/123"
    },
    "jobs":                {
        "publish": "success",
        "deploy":  "skipped"
    }
}
```

### Create .env

Writes a `.env` file (mode `0600`) containing the listed variables, taken from a JSON object of secrets. Fails if a
variable is missing, empty or contains a line break.

```yaml
- uses: DasRed/github-workflows/.github/actions/create-env@v1
  with:
    variables: DATABASE_URL,API_KEY
    secrets:   ${{ toJSON(secrets) }}
```

| Input       | Required | Description                                        |
|-------------|----------|----------------------------------------------------|
| `variables` | no       | Comma-separated list of variable names             |
| `secrets`   | yes      | JSON object containing the secret values           |

## Versioning

This repository is released with semantic-release based on
[Conventional Commits](https://www.conventionalcommits.org/). Every release creates a `v<major>.<minor>.<patch>` tag
and moves the floating tags `v<major>` and `v<major>.<minor>` to it.

- `@v1` – always the latest 1.x release (recommended)
- `@v1.3` – latest patch of a minor version
- `@v1.3.2` – one exact release

Pin a full commit SHA if you need an immutable reference.
