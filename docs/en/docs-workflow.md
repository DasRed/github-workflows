---
title:       Docs
description: Reusable workflow that checks a project's docs against the contract and, after the merge, triggers a website release that picks up the new docs.
order:       40
slug:        docs-workflow
section:     Workflows
---

[`docs.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/docs.yml) brings a project's docs
onto [marco-starker.de](https://www.marco-starker.de). It doesn't depend on language or build system, so it fits
Java/Gradle mods too. The project only keeps a short call.

## Flow

One job **docs**:

1. Checks out the repository.
2. Checks the docs folder with [Docs Check](docs-check.md). The run stops on errors.
3. Except in pull requests: creates the empty commit `docs(<slug>): sync documentation` in the website repository with
   [Website Release](website-release.md). The website then builds a release with the docs of all projects.

So pull requests only get the check, the release follows with the merge to `main`.

## Call

`.github/workflows/docs.yml` in the project:

```yaml
name: Docs

on:
  push:
    branches: [ main ]
    paths:    [ 'docs/**' ]

  pull_request:
    paths:    [ 'docs/**' ]

  workflow_dispatch:

permissions:
  contents: read

jobs:
  docs:
    uses: DasRed/github-workflows/.github/workflows/docs.yml@v2
    secrets:
      website-release-token: ${{ secrets.WEBSITE_RELEASE_TOKEN }}
```

If the slug on the website differs from the repository name, pass it:

```yaml
    with:
      slug: my-project
```

## Inputs

| Name             | Type   | Required | Default                   | Description                            |
|------------------|--------|----------|---------------------------|----------------------------------------|
| `slug`           | string | no       | repository name           | Slug of the project on the website     |
| `path`           | string | no       | `docs`                    | Docs folder relative to the repository |
| `website-repo`   | string | no       | `DasRed/marco-starker.de` | Website repository                     |
| `website-branch` | string | no       | `main`                    | Release branch of the website          |

## Secrets

| Name                    | Required | Description                                                                  |
|-------------------------|----------|------------------------------------------------------------------------------|
| `website-release-token` | yes      | Fine-grained token with "Contents: Read and write" on the website repository |

> [!IMPORTANT]
> The token must not be the `GITHUB_TOKEN`: commits made with it don't start workflows, so the website's CI wouldn't
> run.

## Good to know

- **Only on docs changes.** The `paths` filter in the call keeps code commits from triggering a website release.
  `workflow_dispatch` allows a manual release.
- **Runner:** The job runs on `ubuntu-26.04`.
