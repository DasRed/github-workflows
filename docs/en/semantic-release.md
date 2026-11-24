---
title:       Semantic Release
description: Action that releases a Node.js project with semantic-release without any dependencies or configuration in the project. Plugins, inputs, outputs.
order:       100
slug:        semantic-release
section:     Actions
---

[`semantic-release`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/semantic-release) releases a
Node.js project with [semantic-release](https://github.com/semantic-release/semantic-release). The action installs
semantic-release and all plugins itself from its own `package-lock.json`. The project needs no dependencies, no
`release` key and no scripts for it. Nothing gets published; the workflow does that afterwards. The action is used by
[Node.js npm CI/CD](node-npm.md) and [Node.js Docker CI/CD](node-docker.md).

## What a release does

The plugins run in this order:

| Plugin                                      | Task                                                                                                       |
|---------------------------------------------|------------------------------------------------------------------------------------------------------------|
| `@semantic-release/commit-analyzer`         | Determine the release type from the Conventional Commits, with `release-docs: true` also `docs` as patch   |
| `@semantic-release/release-notes-generator` | Release notes with the sections Features, Bug Fixes, Performance and Documentation                         |
| `@semantic-release/changelog`               | Update `CHANGELOG.md`, only with `changelog: true`                                                         |
| `@semantic-release/npm`                     | Set the version in `package.json` and `package-lock.json`, no publishing                                   |
| `server.json`                               | Set the version in `server.json`, only if the file exists (see below)                                      |
| `@semantic-release/git`                     | Push the release commit `chore(release): <version> [skip ci]` with the release notes and the changed files |
| `@semantic-release/github`                  | Create the GitHub release, no comments on failure                                                          |
| `@saithodev/semantic-release-backmerge`     | Merge the release back into `backmerge-branch` if that branch exists                                       |

Commit analysis and release notes use the [Conventional Commits](https://www.conventionalcommits.org/) preset. The
tag has the form `v<version>`.

## server.json for MCP servers

If the root folder contains a `server.json` for the [MCP Registry](mcp-publish.md), the action sets on every release:

- `version` to the new version
- the tag of every Docker image (`registryType: oci`), e.g. `ghcr.io/dasred/my-mcp:1.2.3`
- `version` of the npm package (`registryType: npm`) whose `identifier` matches the name in `package.json`

The file is part of the release commit, so it ends up on `main` and in the tag as well. If it isn't valid JSON, the
release stops before anything happens.

> [!NOTE]
> If the project still has its own semantic-release configuration, the action replaces its plugins. Other settings
> from it, such as `branches`, still apply.

## Usage

The action needs a checkout with full history and persisted credentials, a Git user for the release commit and
Node.js 26.13 or later:

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

The job needs the permissions `contents: write`, `issues: write` and `pull-requests: write`.

## Inputs

| Name               | Required | Default   | Description                                                                     |
|--------------------|----------|-----------|---------------------------------------------------------------------------------|
| `github-token`     | yes      |           | Token for the GitHub release, the release commit and the tag                    |
| `release-docs`     | no       | `false`   | `docs:` commits trigger a patch release, e.g. for a website that shows the docs |
| `changelog`        | no       | `true`    | Maintain `CHANGELOG.md` in the repository                                       |
| `backmerge-branch` | no       | `develop` | Branch that gets the release merged back; skipped if missing, empty disables it |

## Outputs

| Name       | Description                                          |
|------------|------------------------------------------------------|
| `released` | `true` if a release was created, otherwise `false`   |
| `version`  | Version of the release, empty without a release      |
| `git-tag`  | Tag of the release, e.g. `v1.2.3`, empty without one |
| `channel`  | Channel of the release, empty for the default one    |

## Good to know

- **Plugin versions** are pinned in the action's
  [`package-lock.json`](https://github.com/DasRed/github-workflows/blob/main/.github/actions/semantic-release/package-lock.json).
  An update there applies to all projects on `@v2` after the next release of this repository.
- **Installation:** The action installs its dependencies on every run with `npm ci --ignore-scripts`, which takes a
  few seconds.
- **Testing locally:** Without semantic-release in the project there's no local dry-run script anymore. You see the
  run in the workflow log.
