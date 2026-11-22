# github-workflows

Reusable GitHub Actions workflows and actions for Node.js projects that are released with
[semantic-release](https://github.com/semantic-release/semantic-release), shipped as Docker images to the GitHub
Container Registry and deployed via Dockhand – plus actions to check project docs and publish them on
[marco-starker.de](https://www.marco-starker.de).

Documentation: https://www.marco-starker.de/en/projects/github-workflows/docs
(Deutsch: https://www.marco-starker.de/de/projekte/github-workflows/doku)

## Contents

| Path                                   | Type              | Purpose                                                         |
|----------------------------------------|-------------------|-----------------------------------------------------------------|
| `.github/workflows/node-docker.yml`    | Reusable workflow | Test, build, release, publish a Docker image, deploy and notify |
| `.github/actions/dockhand-update`      | Action            | Update a container through the Dockhand API                     |
| `.github/actions/homeassistant-notify` | Action            | Send the result of a workflow run to a Home Assistant webhook   |
| `.github/actions/create-env`           | Action            | Generate a `.env` file from GitHub secrets                      |
| `.github/actions/docs-check`           | Action            | Check a `docs/` folder against the docs contract                |
| `.github/actions/website-release`      | Action            | Release the website so it picks up the changed docs            |
| `.github/workflows/_release.yml`       | Internal workflow | Releases this repository itself                                 |
| `.github/workflows/_docs.yml`          | Internal workflow | Checks and publishes the docs of this repository                |

## Quick start

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

Inputs, secrets and examples for every workflow and action are in the documentation.

## Versioning

Released with semantic-release. `@v1` always points to the latest 1.x release, `@v1.3` to the latest patch of a minor
version, `@v1.3.2` to one exact release.

## License

[MIT](LICENSE)
