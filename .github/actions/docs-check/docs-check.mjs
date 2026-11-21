import {appendFile, readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';

// Same rules as src/service/docs/DocsValidator.ts of marco-starker.de, which checks the docs again when it
// builds. Keep both in sync: the contract is docs-contract.md in the ai-instructions repository.
const LANGUAGES          = ['de', 'en'];
const IMAGE_EXTENSIONS   = ['gif', 'jpg', 'jpeg', 'png', 'svg', 'webp'];
const MAX_IMAGE_BYTES    = 500 * 1024;
const MAX_ANIMATED_BYTES = 2 * 1024 * 1024;
const ALLOWED_HTML       = /^<\/?(details|summary)(\s[^>]*)?>$/i;

function getInput(name, fallback) {
    const value = process.env[`INPUT_${name.toUpperCase()}`]?.trim();

    return value === undefined || value === '' ? fallback : value;
}

function extension(file) {
    return (file.split('.').pop() ?? '').toLowerCase();
}

function parseFrontmatter(source) {
    const text  = source.replace(/^﻿/, '').replaceAll('\r\n', '\n');
    const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
    if (match === null) {
        return {body: text, data: {}, found: false};
    }

    const data = {};
    for (const line of match[1].split('\n')) {
        const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
        if (pair === null) {
            continue;
        }

        const value   = pair[2].trim();
        const quoted  = value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')));
        data[pair[1]] = quoted ? value.slice(1, -1) : value.replace(/\s+#.*$/, '');
    }

    return {body: text.slice(match[0].length), data, found: true};
}

async function readFiles(root, folder = '') {
    const files = new Map();
    for (const entry of await readdir(path.join(root, folder), {withFileTypes: true})) {
        const relative = folder === '' ? entry.name : `${folder}/${entry.name}`;
        if (entry.isDirectory()) {
            for (const [file, data] of await readFiles(root, relative)) {
                files.set(file, data);
            }
        }
        else if (entry.isFile()) {
            files.set(relative, await readFile(path.join(root, relative)));
        }
    }

    return files;
}

function validateLink(error, file, line, language, image, text, href, files) {
    if (/^(https?:|mailto:|#)/.test(href)) {
        return;
    }

    if (image) {
        const asset = /^\.\.\/assets\/([^/]+)$/.exec(href);
        if (asset === null) {
            error(file, line, `images must be referenced as ../assets/<file>, got "${href}"`);
            return;
        }
        if (text.trim() === '') {
            error(file, line, `image "${href}" needs an alt text`);
        }

        const data = files.get(`assets/${asset[1]}`);
        if (data === undefined) {
            error(file, line, `image "${href}" does not exist`);
        }
        else if (data.length > (extension(asset[1]) === 'gif' ? MAX_ANIMATED_BYTES : MAX_IMAGE_BYTES)) {
            error(file, line, `image "${href}" is too large (${Math.round(data.length / 1024)} KB)`);
        }

        return;
    }

    const page = /^([^/#]+\.md)(#.*)?$/.exec(href);
    if (page === null) {
        error(file, line, `link "${href}" – links to other doc pages are relative (page.md), links to repository files absolute (https://github.com/…)`);
        return;
    }
    if (files.has(`${language}/${page[1]}`) === false) {
        error(file, line, `link "${href}" points to a page that does not exist`);
    }
}

function validatePage(error, file, source, files) {
    const {body, data, found} = parseFrontmatter(source);
    if (found === false) {
        error(file, 1, 'frontmatter missing');
        return null;
    }

    if ((data.title ?? '') === '') {
        error(file, 1, 'frontmatter "title" missing');
    }
    if ((data.description ?? '') === '') {
        error(file, 1, 'frontmatter "description" missing');
    }
    else if (data.description.length > 160) {
        error(file, 1, '"description" is longer than 160 characters');
    }
    if (/^-?\d+$/.test(data.order ?? '') === false) {
        error(file, 1, 'frontmatter "order" must be a whole number');
    }

    const name = file.split('/')[1].replace(/\.md$/, '');
    const slug = name === 'index' ? '' : (data.slug ?? name);
    if (slug !== '' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) === false) {
        error(file, 1, `slug "${slug}" may only contain a-z, 0-9 and hyphens`);
    }

    const language = file.split('/')[0];
    const offset   = source.split('\n').length - body.split('\n').length;
    let fenced     = false;
    body.split('\n').forEach((line, index) => {
        const at    = index + 1 + offset;
        const fence = /^\s*(```|~~~)(.*)$/.exec(line);
        if (fence !== null) {
            if (fenced === false && fence[2].trim() === '') {
                error(file, at, 'code block without language');
            }
            fenced = !fenced;
            return;
        }
        if (fenced) {
            return;
        }

        if (/^#\s/.test(line)) {
            error(file, at, 'no "# " heading, the title comes from the frontmatter');
        }

        const text = line.replace(/`[^`]*`/g, '');
        for (const tag of text.match(/<\/?[A-Za-z][^>]*>/g) ?? []) {
            if (ALLOWED_HTML.test(tag) === false && /^<https?:\/\//.test(tag) === false) {
                error(file, at, `HTML "${tag}" is not allowed (only <details> and <summary>)`);
            }
        }

        for (const link of text.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
            validateLink(error, file, at, language, link[1] === '!', link[2], link[3], files);
        }
    });

    return slug;
}

function validate(files, error) {
    const pages = Object.fromEntries(LANGUAGES.map((language) => [
        language,
        [...files.keys()].filter((file) => file.startsWith(`${language}/`) && file.endsWith('.md')).map((file) => file.slice(language.length + 1)),
    ]));

    for (const file of files.keys()) {
        const [folder, ...rest] = file.split('/');
        if (LANGUAGES.includes(folder) === false && folder !== 'assets') {
            error(file, null, 'only de/, en/ and assets/ are allowed in the docs folder');
        }
        else if (rest.length !== 1) {
            error(file, null, `no subfolders below ${folder}/`);
        }
        else if (folder === 'assets' && IMAGE_EXTENSIONS.includes(extension(file)) === false) {
            error(file, null, `assets must be images (${IMAGE_EXTENSIONS.join(', ')})`);
        }
        else if (folder !== 'assets' && file.endsWith('.md') === false) {
            error(file, null, `only Markdown files in ${folder}/, images belong in assets/`);
        }
    }

    for (const language of LANGUAGES) {
        if (pages[language].includes('index.md') === false) {
            error(`${language}/index.md`, null, 'missing');
        }
        for (const page of pages[language]) {
            for (const other of LANGUAGES.filter((entry) => entry !== language)) {
                if (pages[other].includes(page) === false) {
                    error(`${language}/${page}`, null, `missing in ${other}/ (every page needs both languages with the same file name)`);
                }
            }
        }

        const slugs = new Map();
        for (const page of pages[language].filter((entry) => entry.includes('/') === false)) {
            const file = `${language}/${page}`;
            const slug = validatePage(error, file, files.get(file)?.toString('utf8') ?? '', files);
            if (slug !== null) {
                if (slugs.has(slug)) {
                    error(file, 1, `slug "${slug}" is already used by ${slugs.get(slug)}`);
                }
                slugs.set(slug, file);
            }
        }
    }
}

function escape(value) {
    return String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

async function main() {
    const folder = getInput('path', 'docs').replace(/\/+$/, '');
    const root   = path.resolve(process.env.GITHUB_WORKSPACE ?? process.cwd(), folder);

    const info = await stat(root).catch(() => null);
    if (info === null || info.isDirectory() === false) {
        console.log(`::error::Docs folder "${folder}" not found`);
        process.exit(1);
    }

    const files  = await readFiles(root);
    const errors = [];
    validate(files, (file, line, message) => errors.push({file: `${folder}/${file}`, line, message}));

    const pages = [...files.keys()].filter((file) => file.endsWith('.md')).length;
    if (errors.length === 0) {
        console.log(`✓ ${folder}: ${pages} pages, ${files.size - pages} other files – all good`);
    }
    else {
        for (const {file, line, message} of errors) {
            console.log(`::error file=${escape(file)}${line === null ? '' : `,line=${line}`}::${escape(message)}`);
        }
        console.log(`✗ ${folder}: ${errors.length} problem(s) in ${pages} pages`);
    }

    if (process.env.GITHUB_STEP_SUMMARY) {
        const summary = errors.length === 0
            ? `### Docs check\n\n✓ \`${folder}\`: ${pages} pages, no problems.\n`
            : `### Docs check\n\n✗ \`${folder}\`: ${errors.length} problem(s)\n\n| File | Line | Problem |\n|---|---|---|\n${errors.map(({file, line, message}) => `| \`${file}\` | ${line ?? ''} | ${message.replaceAll('|', '\\|')} |`).join('\n')}\n`;
        await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }

    if (errors.length > 0) {
        process.exit(1);
    }
}

await main();
