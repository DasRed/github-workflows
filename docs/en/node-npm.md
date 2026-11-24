---
title:       Node.js npm CI/CD
description: Reusable workflow for test, build, release via semantic-release and publishing to npm (trusted publishing) and GitHub Packages, with notification.
order:       30
slug:        node-npm
section:     Workflows
---

[`node-npm.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/node-npm.yml) is the complete
pipeline for an npm package. It works like [Node.js Docker CI/CD](node-docker.md), but after a release it publishes
the package to npmjs.com and GitHub Packages instead of a Docker image. Each target can be turned off on its own. You
don't need an npm token: for npmjs.com the workflow uses trusted publishing via OIDC. The workflow brings
semantic-release itself, so the package needs no dependencies, configuration or scripts for it.

## Flow

1. **publish**
    - Checks out the repository with full history and sets up Node.js with npm cache.
    - Checks `package.json`: it needs a name, `private: true` is not allowed, and for GitHub Packages the package must
      live in the scope of the repository owner (`@<owner>/…`).
    - Runs `npm ci`, `npm run test --if-present` and `npm run build --if-present`.
    - On `main` or `master`: release via [Semantic Release](semantic-release.md).
    - If that created a stable release (`<major>.<minor>.<patch>`), it packs the package with `npm pack` and stores the
      tarball as an artifact.
2. **npmjs** – only after a release and with `publish-npm: true`: publishes the tarball to npmjs.com via trusted
   publishing. If npm on the runner is older than 11.5.1, the job installs the latest version first.
3. **github-packages** – only after a release and with `publish-github: true`: publishes the same tarball to GitHub
   Packages with the `GITHUB_TOKEN`.
4. **notify** – always runs and reports the result to Home Assistant, see
   [Home Assistant Notification](homeassistant-notify.md). A skipped target counts as success.

So both registries get exactly the tarball that was built in the `publish` job.

## Requirements in the project

- `package.json` with `name`, `version` and `repository.url`, plus a `package-lock.json`
- optionally the npm scripts `test` and `build`
- for GitHub Packages a package name in the scope of the repository owner in lowercase, e.g. `@dasred/my-package`

That's all. What semantic-release does (version, `CHANGELOG.md`, tag, GitHub release, backmerge) is described in
[Semantic Release](semantic-release.md). If you switch over from a package with its own semantic-release, you can
remove the dependencies `semantic-release` and `@semantic-release/*`, the `release` key, the scripts
`semantic-release`, `publish:check` and `prepublishOnly` and `publishConfig` from `package.json`.

### Trusted publisher on npmjs.com

npmjs.com only accepts the package from a registered trusted publisher. You add it once per package, either on
`https://www.npmjs.com/package/<package>/access` in the "Trusted Publisher" section or locally with the CLI:

```bash
npm trust github <package> --file ci.yml --repo <owner>/<repo> --allow-publish
```

| Field             | Value                                                                    |
|-------------------|--------------------------------------------------------------------------|
| Organization/User | Owner of the repository, e.g. `DasRed`                                   |
| Repository        | Name of the repository                                                   |
| Workflow filename | File name of the **calling** workflow, e.g. `ci.yml`, not `node-npm.yml` |
| Environment       | leave empty                                                              |
| Allowed actions   | enable `npm publish`                                                     |

> [!IMPORTANT]
> npm checks the workflow that started the run. With a reusable workflow that is the file in your project, not
> `node-npm.yml`. The fields are case-sensitive and are only validated when publishing.

> [!NOTE]
> You can only add the trusted publisher once the package exists on npmjs.com. Publish the first version locally with
> `npm publish --access public`. After adding it, a publish through the workflow has to happen within two days,
> otherwise the entry expires.

Afterwards you can pick "Require two-factor authentication and disallow tokens" under "Publishing access" in the
package settings. The workflow keeps publishing because it doesn't use a token.

## Usage

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

npmjs.com only, without GitHub Packages:

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
> The `permissions` in the calling workflow are required, even if you turn a target off. GitHub checks the permissions
> of all jobs at startup: write access for tags and releases, issues and pull requests for the semantic-release
> comments, `packages` for GitHub Packages and `id-token` for trusted publishing.

## Inputs

| Name               | Type    | Required | Default   | Description                                                 |
|--------------------|---------|----------|-----------|-------------------------------------------------------------|
| `publish-npm`      | boolean | no       | `true`    | Publish the package to npmjs.com                            |
| `publish-github`   | boolean | no       | `true`    | Publish the package to GitHub Packages                      |
| `npm-access`       | string  | no       | `public`  | Access level on npmjs.com, `public` or `restricted`         |
| `changelog`        | boolean | no       | `true`    | Maintain `CHANGELOG.md` in the repository                   |
| `backmerge-branch` | string  | no       | `develop` | Branch that gets the release merged back, empty disables it |
| `node-version`     | string  | no       | `26`      | Node.js version for install, test, build and publish        |

## Secrets

| Name                        | Required | Description                            |
|-----------------------------|----------|----------------------------------------|
| `homeassistant-webhook-url` | yes      | Full URL of the Home Assistant webhook |

## Outputs

| Name       | Description                                                       |
|------------|-------------------------------------------------------------------|
| `released` | `true` if the run created a release, otherwise `false`            |
| `version`  | Version of the release from `package.json`, empty without release |
| `package`  | Name of the package from `package.json`                           |

## Good to know

- **No release, no publish.** Commits without `feat:`, `fix:` or `perf:` create no release, so nothing is published.
  The run is still green.
- **Stable versions only.** Prereleases (e.g. `1.2.0-beta.1`) are not published.
- **`publishConfig` doesn't get in the way.** The workflow sets registry and access on the command line, which takes
  precedence over `publishConfig` in `package.json`. A package with `publishConfig.registry` pointing to GitHub
  Packages still ends up on npmjs.com as well.
- **No scripts when publishing.** Publishing a tarball runs no lifecycle scripts, so an old `prepublishOnly` with
  `npm run semantic-release` doesn't start a second release. `npm pack` does run `prepack` and `prepare`, though.
- **Re-running is safe.** If the version is already in a registry, the job skips publishing with a notice. That lets
  you restart single jobs after a failure.
- **Provenance:** With a public repository and a public package npmjs.com creates provenance automatically. GitHub
  Packages gets none.
- **Runner:** Trusted publishing only works on GitHub-hosted runners. All jobs run on `ubuntu-26.04`.
- **The Home Assistant notification can't be turned off**, the secret is required.
