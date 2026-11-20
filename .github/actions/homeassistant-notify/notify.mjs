import {readFile} from 'node:fs/promises';

function getInput(name, required = true) {
    const value = process.env[`INPUT_${name.toUpperCase()}`]?.trim();

    if (required && !value) {
        throw new Error(`Missing input: ${name}`);
    }

    return value ?? '';
}

async function getCommitMessage(event, token) {
    if (event.head_commit?.message) {
        return event.head_commit.message;
    }

    const repository = process.env.GITHUB_REPOSITORY;
    const sha        = process.env.GITHUB_SHA;
    const apiUrl     = process.env.GITHUB_API_URL ?? 'https://api.github.com';

    if (!token || !repository || !sha) {
        return null;
    }

    try {
        const response = await fetch(`${apiUrl}/repos/${repository}/commits/${sha}`, {
            signal:  AbortSignal.timeout(10000),
            headers: {
                Authorization: `Bearer ${token}`,
                Accept:        'application/vnd.github+json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const commit = await response.json();
        return commit.commit?.message ?? null;
    }
    catch (error) {
        console.warn(`Unable to retrieve commit message: ${error.message}`);
        return null;
    }
}

async function main() {
    const webhookUrl = getInput('webhook_url');
    const token      = getInput('github_token', false);
    const needs      = JSON.parse(getInput('job_results'));

    const jobs = Object.fromEntries(Object.entries(needs).map(([name, job]) => [
        name,
        job.result,
    ]));

    // Ein übersprungenes Deployment ist erlaubt,
    // beispielsweise wenn kein Release erstellt wurde.
    const success       = jobs.publish === 'success' && Object.values(jobs).every((result) => result === 'success' || result === 'skipped');
    const event         = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const repository    = process.env.GITHUB_REPOSITORY;
    const runId         = Number(process.env.GITHUB_RUN_ID);
    const commitMessage = await getCommitMessage(event, token);

    const body = {
        status:              success ? 'success' : 'failure',
        repository,
        commitMessage:       commitMessage,
        commitMessageHeader: commitMessage.split('\n').shift(),
        sha:                 process.env.GITHUB_SHA,
        branch:              process.env.GITHUB_REF_NAME,
        event:               process.env.GITHUB_EVENT_NAME,
        workflow:            {
            name:       process.env.GITHUB_WORKFLOW,
            runId:      runId,
            runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
            url:        `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${runId}`,
        },
        jobs,
    };

    console.log(`POST ${webhookUrl}`, body);

    const response = await fetch(webhookUrl, {
        method:  'POST',
        headers: {'Content-Type': 'application/json'},
        signal:  AbortSignal.timeout(15000),
        body:    JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Home Assistant webhook returned HTTP ${response.status}`);
    }

    console.log(`Home Assistant notified: ${repository} (${success ? 'success' : 'failure'})`);
}

main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
});
