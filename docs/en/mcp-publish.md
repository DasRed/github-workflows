---
title:       MCP Server CI/CD
description: Reusable workflow for MCP servers: test, release, Docker image, deployment, entry in the MCP Registry and one combined notification to Home Assistant.
order:       20
slug:        mcp-publish
section:     Workflows
---

[`mcp-publish.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/mcp-publish.yml) is the
complete pipeline for an MCP server that runs as a Docker container. It does everything
[Node.js Docker CI/CD](node-docker.md) does and then adds the server to the
[official MCP Registry](https://registry.modelcontextprotocol.io). Only when both are done does it report the result
to Home Assistant. If the registry entry fails, you get a failure notification, not a success.

## Flow

1. **publish** – calls [Node.js Docker CI/CD](node-docker.md): test, build, release, Docker image and deployment. Its
   own notification is turned off (`notify: false`).
2. **mcp-registry** – only if a release was created, also when only the deployment failed:
    1. Checks out the release tag `v<version>`, i.e. the release commit of semantic-release.
    2. Checks that `version` in `server.json` and the tag of all Docker images (`registryType: oci`) match the release
       version. Otherwise the job fails with an error message.
    3. Downloads `mcp-publisher` in the given version and verifies its signature with cosign.
    4. Logs in via GitHub OIDC. No token or secret needed.
    5. Publishes `server.json` to the registry.
3. **notify** – always runs and reports the result of both jobs to Home Assistant, see
   [Home Assistant Notification](homeassistant-notify.md). A skipped registry entry, e.g. without a release, counts as
   success.

So test, release, image and deployment are maintained in one place only, in `node-docker.yml`.

## Requirements in the project

Everything from [Node.js Docker CI/CD](node-docker.md), plus:

- a `server.json` following the [registry schema](https://modelcontextprotocol.io/registry/quickstart)
- a name in the namespace `io.github.<owner>/…`, matching the owner of the repository
- for Docker images the label in the `Dockerfile` that confirms the name:

```dockerfile
LABEL io.modelcontextprotocol.server.name="io.github.DasRed/my-mcp"
```

If `server.json` sits in the root folder, the built-in [Semantic Release](semantic-release.md) sets the version
automatically and the project needs nothing for it. Only if the project still uses its own semantic-release, it needs
`@semantic-release/exec` as devDependency and a step in the release config that sets the version, plus `server.json`
in the assets of `@semantic-release/git`:

```json
[
    "@semantic-release/exec",
    {
        "prepareCmd": "jq --indent 4 --arg v ${nextRelease.version} '.version = $v | .packages |= map(if .registryType == \"oci\" then .identifier |= sub(\":[^:/@]+$\"; \"\") + \":\" + $v else . end)' server.json > server.json.tmp && mv server.json.tmp server.json"
    }
]
```

The step belongs after `@semantic-release/npm` and before `@semantic-release/git`.

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
  id-token:      write

jobs:
  pipeline:
    uses: DasRed/github-workflows/.github/workflows/mcp-publish.yml@v2
    secrets:
      dockhand-host:             ${{ secrets.DOCKHAND_HOST }}
      dockhand-token:            ${{ secrets.DOCKHAND_TOKEN }}
      homeassistant-webhook-url: ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
    with:
      environment:    production
      container-name: mcp-my-server
```

> [!IMPORTANT]
> `id-token: write` must be set in the calling workflow. Without it `mcp-publisher` gets no OIDC token and the login
> fails.

## Inputs

| Name                | Type    | Required | Default         | Description                                             |
|---------------------|---------|----------|-----------------|---------------------------------------------------------|
| `environment`       | string  | yes      |                 | Name of the Dockhand environment to deploy to           |
| `container-name`    | string  | no       | repository name | Name of the container to update                         |
| `node-version`      | string  | no       | `26`            | Node.js version for install, test and build             |
| `deploy`            | boolean | no       | `true`          | `false` only publishes the image and the registry entry |
| `changelog`         | boolean | no       | `true`          | Maintain `CHANGELOG.md` in the repository               |
| `release-docs`      | boolean | no       | `false`         | `docs:` commits trigger a patch release                 |
| `backmerge-branch`  | string  | no       | `develop`       | Branch for the backmerge, empty disables it             |
| `server-file`       | string  | no       | `server.json`   | Path of `server.json` in the repository                 |
| `publisher-version` | string  | no       | `v1.8.13`       | Release tag of `mcp-publisher`                          |

All inputs up to `backmerge-branch` are passed unchanged to [Node.js Docker CI/CD](node-docker.md).

## Secrets

| Name                        | Required | Description                                                          |
|-----------------------------|----------|----------------------------------------------------------------------|
| `dockhand-host`             | yes      | Base URL of the Dockhand server, e.g. `https://dockhand.example.com` |
| `dockhand-token`            | yes      | API token for Dockhand                                               |
| `homeassistant-webhook-url` | yes      | Full URL of the Home Assistant webhook                               |

## Outputs

| Name       | Description                                                                    |
|------------|--------------------------------------------------------------------------------|
| `released` | `true` if the run created a release and published the image, otherwise `false` |
| `version`  | Version of the release from `package.json`, empty without a release            |
| `image`    | Image name without tag, e.g. `ghcr.io/owner/repo`                              |

## Switching from the second job

Previously `mcp-publish.yml` ran as a second job after `node-docker.yml` and only got `version`. Now it replaces both
jobs: in `ci.yml`, `node-docker.yml` simply becomes `mcp-publish.yml`, the `mcp-registry` job goes away and
`id-token: write` moves to the `permissions` at the top of the workflow.

## Good to know

- **Any file name.** `mcp-publisher publish` accepts any path, hence `server-file`. The built-in semantic-release only
  sets the version in `server.json` in the root folder, though.
- **Each version only once.** The registry accepts every version only once. Running again for the same version fails.
- **The image must exist.** The registry checks the image and its label. That is why the entry is only made after the
  image.
- **Registry in preview.** On `invalid audience`, `mcp-publisher` is too old; raise `publisher-version`.
