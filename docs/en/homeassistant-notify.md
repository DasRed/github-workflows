---
title: Home Assistant Notification
description: GitHub Action that sends the result of a workflow run, with commit and job states, as JSON to a Home Assistant webhook. Inputs, payload and automation example.
order: 60
slug: homeassistant-notify
section: Actions
---

[`homeassistant-notify`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/homeassistant-notify)
reports the result of a run to a webhook in Home Assistant. There you can turn it into a notification, a dashboard
entry or an automation.

## When a run counts as successful

The `publish` job must succeed, and every other job either succeeded or was skipped. A skipped deployment, e.g.
because there was no release, is therefore not an error.

## Call

```yaml
notify:
  needs:   [ publish, deploy ]
  if:      ${{ always() }}
  runs-on: ubuntu-latest
  permissions:
    contents: read
  steps:
    - uses: DasRed/github-workflows/.github/actions/homeassistant-notify@v2
      with:
        webhook_url:  ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
        job_results:  ${{ toJSON(needs) }}
        github_token: ${{ github.token }}
```

## Inputs

| Name           | Required | Description                                                  |
|----------------|----------|--------------------------------------------------------------|
| `webhook_url`  | yes      | Home Assistant webhook URL                                   |
| `job_results`  | yes      | The `needs` context as JSON                                  |
| `github_token` | no       | Token used to read the commit message from the GitHub API    |

## Payload sent to the webhook

```json
{
    "status":              "success",
    "repository":          "owner/repo",
    "commitMessage":       "feat: something\n\nbody",
    "commitMessageHeader": "feat: something",
    "sha":                 "…",
    "branch":              "main",
    "event":               "push",
    "workflow":            {
        "name":       "CI/CD",
        "runId":      123,
        "runAttempt": 1,
        "url":        "https://github.com/owner/repo/actions/runs/123"
    },
    "jobs":                {
        "publish": "success",
        "deploy":  "skipped"
    }
}
```

`status` is `success` or `failure`.

## In Home Assistant

Create an automation with a webhook trigger. The webhook ID gives the URL `https://<home-assistant>/api/webhook/<id>`,
which you store as a secret in the repository.

```yaml
triggers:
  - trigger:         webhook
    webhook_id:      github-ci
    allowed_methods: [ POST ]
    local_only:      false
actions:
  - action: notify.notify
    data:
      title:   "{{ trigger.json.repository }}: {{ trigger.json.status }}"
      message: "{{ trigger.json.commitMessageHeader }}"
```

> [!WARNING]
> For a run not triggered by a push (e.g. `workflow_dispatch`) the action reads the commit message through the API.
> If `github_token` is missing then, or the request fails, the action stops. So always pass `github_token`.
