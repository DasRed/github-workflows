---
title:       MCP Registry Publish
description: Reusable workflow that publishes an MCP server to the official MCP Registry after a release.
order:       20
slug:        mcp-publish
section:     Workflows
---

[`mcp-publish.yml`](https://github.com/DasRed/github-workflows/blob/main/.github/workflows/mcp-publish.yml) publishes an
MCP server to the [official MCP Registry](https://registry.modelcontextprotocol.io). It runs after
[Node.js Docker CI/CD](node-docker.md) and only if that run created a release.

## Flow

1. Checks out the release tag `v<version>`, i.e. the release commit of semantic-release.
2. Checks that `version` in `server.json` and the tag of all Docker images (`registryType: oci`) match the release
   version. Otherwise the run fails with an error.
3. Downloads `mcp-publisher` in the given version and verifies its signature with cosign.
4. Logs in via GitHub OIDC. No token or secret is needed.
5. Publishes `server.json` to the registry.

semantic-release sets the version in `server.json` in the project, just like in `package.json`. It ends up in the
release commit `chore(release): <version>`.

## Requirements in the project

- a `server.json` following the [registry schema](https://modelcontextprotocol.io/registry/quickstart)
- a name in the namespace `io.github.<owner>/…`, matching the owner of the repository
- for Docker images the label in the `Dockerfile` that confirms the name:

```dockerfile
LABEL io.modelcontextprotocol.server.name="io.github.DasRed/my-mcp"
```

- `@semantic-release/exec` as devDependency and a step in the release config that sets the version, plus
  `server.json` in the assets of `@semantic-release/git`:

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

The workflow runs as a second job after `node-docker.yml`:

```yaml
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

  mcp-registry:
    needs: pipeline
    if:    needs.pipeline.outputs.released == 'true'
    uses:  DasRed/github-workflows/.github/workflows/mcp-publish.yml@v1
    permissions:
      contents: read
      id-token: write
    with:
      version: ${{ needs.pipeline.outputs.version }}
```

> [!IMPORTANT]
> `id-token: write` must be set on the calling job. Without it `mcp-publisher` gets no OIDC token and the login fails.

## Inputs

| Name                | Type   | Required | Default       | Description                          |
|---------------------|--------|----------|---------------|--------------------------------------|
| `version`           | string | yes      |               | Version of the release, e.g. `1.2.3` |
| `server-file`       | string | no       | `server.json` | Path of the file in the repository   |
| `publisher-version` | string | no       | `v1.8.13`     | Release tag of `mcp-publisher`       |

## Good to know

- **Any file name.** `mcp-publisher publish` accepts any path, hence `server-file`.
- **Each version only once.** The registry accepts every version only once. Running again for the same version fails.
- **The image must exist.** The registry checks the image and its label. That is why the job runs after `node-docker.yml`.
- **Registry in preview.** On `invalid audience`, `mcp-publisher` is too old; raise `publisher-version`.
