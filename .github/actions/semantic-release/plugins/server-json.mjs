import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const FILE = 'server.json';

async function read(cwd) {
    return JSON.parse(await readFile(join(cwd, FILE), 'utf8'));
}

// fails before the release starts if server.json is not valid JSON
export async function verifyConditions(pluginConfig, {cwd}) {
    await read(cwd);
}

// sets the version of the MCP server and the tag of its OCI image, and the version of its own npm package
export async function prepare(pluginConfig, {cwd, nextRelease, logger}) {
    const server  = await read(cwd);
    const version = nextRelease.version;

    server.version = version;

    if (Array.isArray(server.packages)) {
        server.packages = server.packages.map((entry) => {
            if (entry.registryType === 'oci') {
                return {...entry, identifier: `${entry.identifier.replace(/:[^:/@]+$/, '')}:${version}`};
            }

            if (entry.registryType === 'npm' && entry.identifier === pluginConfig.packageName) {
                return {...entry, version};
            }

            return entry;
        });
    }

    await writeFile(join(cwd, FILE), `${JSON.stringify(server, null, 4)}\n`);
    logger.log('Set version %s in %s', version, FILE);
}
