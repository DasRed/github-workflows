---
title: Website Release
description: Action that triggers a website release with an empty docs commit so changed project docs appear there, plus the docs workflow for projects.
order: 90
slug: website-release
section: Actions
---

[`website-release`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/website-release) creates an
empty commit `docs(<slug>): sync documentation` on the release branch of the website through the GitHub API, without
cloning the repository. semantic-release of the website treats `docs` as a patch release, and the build fetches the
docs of all projects.

## Flow

1. Checks the slug: only a–z, 0–9 and hyphens.
2. Reads the current head of the branch and creates the empty commit on top.
3. Moves the branch to the new commit without force. If the branch moved on in between because two projects trigger
   at the same time, the action rebuilds the commit on the new head. At most three attempts.

The commit appears in the job summary with a link.

## Call

```yaml
- uses: DasRed/github-workflows/.github/actions/website-release@v1
  with:
    token: ${{ secrets.WEBSITE_RELEASE_TOKEN }}
    slug:  my-project
```

## Inputs and outputs

| Input    | Required | Default                   | Description                                  |
|----------|----------|---------------------------|----------------------------------------------|
| `token`  | yes      |                           | Token with write access to the website repo  |
| `slug`   | yes      |                           | Slug of the project on the website           |
| `repo`   | no       | `DasRed/marco-starker.de` | Website repository                           |
| `branch` | no       | `main`                    | Release branch of the website                |

| Output   | Description                   |
|----------|-------------------------------|
| `commit` | SHA of the created commit     |

> [!IMPORTANT]
> The token must not be the `GITHUB_TOKEN`: commits created with it start no workflows, so the website CI would not
> run. Use a fine-grained token limited to the website repository with "Contents: Read and write".

## Docs workflow of a project

Both docs actions together in `.github/workflows/docs.yml` of a project:

```yaml
name: Docs

on:
  push:
    branches: [ main ]
    paths:    [ 'docs/**' ]

  pull_request:
    paths:    [ 'docs/**' ]

  workflow_dispatch:

jobs:
  docs:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6

      - uses: DasRed/github-workflows/.github/actions/docs-check@v1

      - uses: DasRed/github-workflows/.github/actions/website-release@v1
        if:   github.event_name != 'pull_request'
        with:
          token: ${{ secrets.WEBSITE_RELEASE_TOKEN }}
          slug:  my-project
```

In pull requests only the [check](docs-check.md) runs; the release follows the merge to `main`.
