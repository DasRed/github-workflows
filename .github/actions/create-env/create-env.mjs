import fs from 'node:fs';

const names = (process.env.VARIABLE_NAMES || '').split(',').map((value) => value.trim());
const secrets = JSON.parse(process.env.SECRETS_JSON || '{}');

if (names.length === 0) {
    process.exit(0);
}

const lines = names.map((name) => {
    if (typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(`Invalid variable name: ${name}`);
    }

    const value = secrets[name];
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Missing secret: ${name}`);
    }

    if (/[\r\n]/.test(value)) {
        throw new Error(`Multiline secret not supported: ${name}`);
    }

    return `${name}=${JSON.stringify(value)}`;
});

fs.writeFileSync('.env', `${lines.join('\n')}\n`, { mode: 0o600 });
