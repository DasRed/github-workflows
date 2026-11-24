---
title:       Overview
description: Reusable GitHub workflows and actions for Node.js projects – release, Docker image or npm package, deployment via Dockhand, notification and docs.
order:       0
section:     Getting started
---

`github-workflows` keeps the CI/CD building blocks of my Node.js projects in one place. A project calls the workflow
with a few lines and gets test, build, release via semantic-release, a Docker image in the GitHub Container Registry,
deployment via Dockhand and a notification to Home Assistant. npm packages get published to npmjs.com and GitHub
Packages instead of an image and a deployment. On top of that there are actions that let projects check their docs and
bring them onto marco-starker.de.

## Contents

| Building block                                         | Kind              | Purpose                                                      |
|--------------------------------------------------------|-------------------|--------------------------------------------------------------|
| [Node.js Docker CI/CD](node-docker.md)                 | reusable workflow | Test, build, release, Docker image, deployment, notification |
| [MCP Server CI/CD](mcp-publish.md)                     | reusable workflow | Like Node.js Docker CI/CD, plus the MCP Registry entry       |
| [Node.js npm CI/CD](node-npm.md)                       | reusable workflow | Test, build, release, publish to npm and GitHub Packages     |
| [Docs](docs-workflow.md)                               | reusable workflow | Check docs and bring them onto the website via a release     |
| [Dockhand Update](dockhand-update.md)                  | action            | Update a container through the Dockhand API                  |
| [Home Assistant Notification](homeassistant-notify.md) | action            | Send the result of a run to a Home Assistant webhook         |
| [Create .env](create-env.md)                           | action            | Generate a `.env` from GitHub secrets                        |
| [Docs Check](docs-check.md)                            | action            | Check `docs/` against the docs contract                      |
| [Website Release](website-release.md)                  | action            | Trigger a website release so new docs show up                |
| [Semantic Release](semantic-release.md)                | action            | Release via semantic-release without setup in the project    |

Next to them lives `.github/workflows/_release.yml`. It releases this repository itself and is not meant to be
called.

## Quick start

`.github/workflows/ci.yml` in a project with a `Dockerfile` and semantic-release:

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
    uses: DasRed/github-workflows/.github/workflows/node-docker.yml@v2
    secrets:
      dockhand-host:             ${{ secrets.DOCKHAND_HOST }}
      dockhand-token:            ${{ secrets.DOCKHAND_TOKEN }}
      homeassistant-webhook-url: ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
    with:
      environment:    production
      container-name: my-container
```

## Versioning

The repository is released with semantic-release based on
[Conventional Commits](https://www.conventionalcommits.org/). Every release gets a `v<major>.<minor>.<patch>` tag, and
the floating tags `v<major>` and `v<major>.<minor>` are moved to it.

| Reference | Meaning                                     |
|-----------|---------------------------------------------|
| `@v2`     | always the latest 2.x release (recommended) |
| `@v2.3`   | latest patch of a minor version             |
| `@v2.3.2` | exactly one release                         |

Pin the full commit SHA if you need a reference that never changes.

> [!NOTE]
> The building blocks are tailored to my environment: Dockhand for deployment, Home Assistant for notifications and
> marco-starker.de as the docs target. Others can use them if they run the same services, or take them as a template.

## Switching from v1

- **MCP servers:** [MCP Server CI/CD](mcp-publish.md) is now the complete pipeline and replaces the two jobs
  `node-docker.yml` + `mcp-publish.yml`. Its section "Switching from the second job" shows the new `ci.yml`.
- **semantic-release:** [Node.js Docker CI/CD](node-docker.md) brings semantic-release itself. Projects with their own
  `semantic-release` script keep working unchanged; how to remove it from the project is described there under "Own
  semantic-release".
- **Docs:** The project's `docs.yml` now calls the [Docs](docs-workflow.md) workflow instead of chaining the actions
  itself.
- Replace `@v1` with `@v2` everywhere.

## Status

Actively maintained since November 2026, version 2.
