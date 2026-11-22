---
title:       Overview
description: Reusable GitHub workflows and actions for Node.js projects – release, Docker image, deployment via Dockhand, notification and docs.
order:       0
section:     Getting started
---

`github-workflows` keeps the CI/CD building blocks of my Node.js projects in one place. A project calls the workflow
with a few lines and gets test, build, release via semantic-release, a Docker image in the GitHub Container Registry,
deployment via Dockhand and a notification to Home Assistant. On top of that there are actions that let projects check
their docs and bring them onto marco-starker.de.

## Contents

| Building block                                         | Kind              | Purpose                                                      |
|--------------------------------------------------------|-------------------|--------------------------------------------------------------|
| [Node.js Docker CI/CD](node-docker.md)                 | reusable workflow | Test, build, release, Docker image, deployment, notification |
| [MCP Registry Publish](mcp-publish.md)                 | reusable workflow | Publish an MCP server to the MCP Registry after a release    |
| [Dockhand Update](dockhand-update.md)                  | action            | Update a container through the Dockhand API                  |
| [Home Assistant Notification](homeassistant-notify.md) | action            | Send the result of a run to a Home Assistant webhook         |
| [Create .env](create-env.md)                           | action            | Generate a `.env` from GitHub secrets                        |
| [Docs Check](docs-check.md)                            | action            | Check `docs/` against the docs contract                      |
| [Website Release](website-release.md)                  | action            | Trigger a website release so new docs show up                |

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
    uses: DasRed/github-workflows/.github/workflows/node-docker.yml@v1
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
| `@v1`     | always the latest 1.x release (recommended) |
| `@v1.3`   | latest patch of a minor version             |
| `@v1.3.2` | exactly one release                         |

Pin the full commit SHA if you need a reference that never changes.

> [!NOTE]
> The building blocks are tailored to my environment: Dockhand for deployment, Home Assistant for notifications and
> marco-starker.de as the docs target. Others can use them if they run the same services, or take them as a template.

## Status

Actively maintained since November 2026, version 1.
