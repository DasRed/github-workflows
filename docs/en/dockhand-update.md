---
title: Dockhand Update
description: GitHub Action that updates a Docker container with a new image through the Dockhand API and restarts it, for example after a release. Flow, call and inputs.
order: 50
slug: dockhand-update
section: Actions
---

[`dockhand-update`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/dockhand-update) updates a
container through the Dockhand API. The [Node.js Docker CI/CD](node-docker.md) workflow uses it in its `deploy` job;
you can also use it on its own.

## Flow

1. Loads all environments from `<host>/api/environments`.
2. Looks up the environment by name, case-insensitive.
3. Calls `POST /api/containers/<name>/update`: the image is pulled again and the container is started afterwards.

Every request has a two-minute timeout. If Dockhand answers with an error, the action stops with the status and the
first 500 characters of the response.

## Call

```yaml
- uses: DasRed/github-workflows/.github/actions/dockhand-update@v1
  with:
    host:           ${{ secrets.DOCKHAND_HOST }}
    token:          ${{ secrets.DOCKHAND_TOKEN }}
    environment:    production
    container_name: my-container
    image:          ghcr.io/owner/repo:latest
```

## Inputs

| Name             | Required | Description                                  |
|------------------|----------|----------------------------------------------|
| `host`           | yes      | Dockhand server URL                          |
| `token`          | yes      | Dockhand API token                           |
| `environment`    | yes      | Dockhand environment name                    |
| `container_name` | yes      | Docker container name                        |
| `image`          | yes      | Full image reference including tag           |

> [!NOTE]
> The inputs of this action use underscores (`container_name`), those of the workflow use hyphens
> (`container-name`).
