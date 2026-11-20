function getInput(name) {
    const value = process.env[`INPUT_${name.toUpperCase()}`]?.trim();

    if (!value) {
        throw new Error(`Missing input: ${name}`);
    }

    return value;
}

async function request(url, options = {}) {
    const method = options.method ?? 'GET';

    console.log(`calling ${method} ${url}`);

    let response;

    try {
        response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(120_000),
        });
    }
    catch (error) {
        const cause = error.cause ?? error;

        throw new Error(`${method} ${url} failed: ` + `${cause.code ?? error.name}: ${cause.message}`);
    }

    if (!response.ok) {
        const message = (await response.text()).slice(0, 500);
        throw new Error(`Dockhand API error (${response.status}): ${message}`);
    }

    return response;
}

async function main() {
    const host            = getInput('host').replace(/\/+$/, '');
    const environmentName = getInput('environment').toLowerCase();
    const containerName   = getInput('container_name');
    const image           = getInput('image');
    const token           = getInput('token');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
    };

    // 1. request environments
    const response = await request(`${host}/api/environments`, {
        method: 'GET',
        headers,
    });

    const environments = await response.json();
    if (!Array.isArray(environments)) {
        throw new Error('Invalid environments response');
    }

    // 2. search environment by name
    const environment = environments.find((environment) => (environment.name ?? '').trim().toLowerCase() === environmentName);
    if (environment === undefined) {
        throw new Error(`Environment "${environmentName}" not found`);
    }

    console.log(`Environment: ${environmentName} (${environment.id})`);
    console.log(`Container: ${containerName}`);
    console.log(`Image: ${image}`);

    // 3. update container
    await request(`${host}/api/containers/${encodeURIComponent(containerName)}/update?env=${environment.id}`, {
        method: 'POST',
        headers,
        body:   JSON.stringify({
            image,
            name:             containerName,
            repullImage:      true,
            startAfterUpdate: true,
        }),
    });

    console.log('Container update completed successfully');
}

main().catch((error) => {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
});
