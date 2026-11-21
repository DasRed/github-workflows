---
title: Home Assistant Notification
description: Action, die das Ergebnis eines Workflow-Laufs samt Commit und Job-Status als JSON an einen Home-Assistant-Webhook schickt.
order: 60
slug: homeassistant-notify
section: Actions
---

[`homeassistant-notify`](https://github.com/DasRed/github-workflows/tree/main/.github/actions/homeassistant-notify)
meldet das Ergebnis eines Laufs an einen Webhook in Home Assistant. Dort kannst du daraus eine Benachrichtigung, eine
Anzeige auf dem Dashboard oder eine Automation machen.

## Wann ein Lauf als erfolgreich gilt

Der Job `publish` muss erfolgreich sein, und jeder andere Job ist entweder erfolgreich oder übersprungen. Ein
übersprungenes Deployment, etwa weil es kein Release gab, ist also kein Fehler.

## Aufruf

```yaml
notify:
  needs:   [ publish, deploy ]
  if:      ${{ always() }}
  runs-on: ubuntu-latest
  permissions:
    contents: read
  steps:
    - uses: DasRed/github-workflows/.github/actions/homeassistant-notify@v1
      with:
        webhook_url:  ${{ secrets.HOMEASSISTANT_WEBHOOK_URL }}
        job_results:  ${{ toJSON(needs) }}
        github_token: ${{ github.token }}
```

## Inputs

| Name           | Pflicht | Beschreibung                                                    |
|----------------|---------|-----------------------------------------------------------------|
| `webhook_url`  | ja      | URL des Home-Assistant-Webhooks                                 |
| `job_results`  | ja      | Der `needs`-Kontext als JSON                                    |
| `github_token` | nein    | Token, um die Commit-Nachricht über die GitHub-API zu lesen     |

## Nachricht an den Webhook

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

`status` ist `success` oder `failure`.

## In Home Assistant

Leg eine Automation mit Webhook-Trigger an. Die Webhook-ID ergibt die URL
`https://<home-assistant>/api/webhook/<id>`, die du als Secret im Repository hinterlegst.

```yaml
triggers:
  - trigger:        webhook
    webhook_id:     github-ci
    allowed_methods: [ POST ]
    local_only:     false
actions:
  - action: notify.notify
    data:
      title:   "{{ trigger.json.repository }}: {{ trigger.json.status }}"
      message: "{{ trigger.json.commitMessageHeader }}"
```

> [!WARNING]
> Bei einem Lauf, der nicht durch einen Push ausgelöst wurde (etwa `workflow_dispatch`), holt die Action die
> Commit-Nachricht über die API. Fehlt dann `github_token` oder schlägt die Abfrage fehl, bricht sie ab. Gib
> `github_token` deshalb immer mit.
