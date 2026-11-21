---
title: Node.js Docker CI/CD
description: Reusable workflow for test, build, release, multi-arch Docker image in GHCR, deployment via Dockhand and notification to Home Assistant.
order: 10
slug: node-docker
section: Workflows
---

[`node-docker.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/node-docker.yml) is the
complete pipeline for a Node.js project that runs as a Docker container. It consists of three jobs.

## Flow

1. **publish**
    - Checks out the repository with full history and sets up Node.js with npm cache.
    - Runs `npm ci`, `npm run test --if-present` and `npm run build --if-present`.
    - On `main` or `master`: `npm run semantic-release --if-present`.
    - If the current commit carries the tag `v<version>` from `package.json`, i.e. this run created a release, it
      builds an image for `linux/amd64` and `linux/arm64` from the `Dockerfile` and pushes it to
      `ghcr.io/<owner>/<repo>` with the tags `<major>`, `<major>.<minor>`, `<version>` and `latest`.
2. **deploy** – only when an image was published and `deploy` is `true`: updates the container in the given Dockhand
   environment to the new `latest` image, see [Dockhand Update](dockhand-update.md).
3. **notify** – always runs and reports the result to Home Assistant, see
   [Home Assistant Notification](homeassistant-notify.md). A skipped deployment counts as success.

## Requirements in the project

- `package.json` with `version` and a `package-lock.json`
- an npm script `semantic-release` with its configuration if releases should be created
- a `Dockerfile` in the root folder
- optionally the npm scripts `test` and `build`

## Call

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
> The `permissions` in the calling workflow are required. They limit what the `GITHUB_TOKEN` may do inside the
> reusable workflow: write access for tags and releases, packages for the image, issues and pull requests for the
> comments of semantic-release.

## Inputs

| Name             | Type    | Required | Default            | Description                                      |
|------------------|---------|----------|--------------------|--------------------------------------------------|
| `environment`    | string  | yes      |                    | Name of the Dockhand environment to deploy to    |
| `container-name` | string  | no       | repository name    | Name of the container to update                  |
| `node-version`   | string  | no       | `26`               | Node.js version for install, test and build      |
| `deploy`         | boolean | no       | `true`             | `false` only publishes the image                 |

## Secrets

| Name                        | Required | Description                                                         |
|-----------------------------|----------|---------------------------------------------------------------------|
| `dockhand-host`             | yes      | Base URL of the Dockhand server, e.g. `https://dockhand.example.com` |
| `dockhand-token`            | yes      | Dockhand API token                                                  |
| `homeassistant-webhook-url` | yes      | Full URL of the Home Assistant webhook                              |

## Good to know

- **No release, no image.** Commits without `feat:`, `fix:` or `perf:` create no release, hence no image and no
  deployment. The run is still green.
- **`environment` and all secrets are required**, even with `deploy: false`. The Home Assistant notification cannot
  be switched off.
- **Runner:** all jobs run on `ubuntu-26.04`.
- **Cache:** the Docker build uses the GitHub Actions cache (`type=gha`), which speeds up later builds considerably.
