import {execFileSync} from 'node:child_process';
import {appendFileSync, existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import semanticRelease from 'semantic-release';

const SERVER_JSON_PLUGIN = fileURLToPath(new URL('./plugins/server-json.mjs', import.meta.url));

function setOutput(name, value) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function remoteBranchExists(branch) {
    try {
        execFileSync('git', ['ls-remote', '--exit-code', '--heads', 'origin', branch], {stdio: 'ignore'});
        return true;
    }
    catch {
        return false;
    }
}

export function createPlugins({changelog, releaseDocs, serverJson, packageName, backmergeFrom, backmergeTo}) {
    const assets  = ['package.json', 'package-lock.json'];
    const plugins = [
        ['@semantic-release/commit-analyzer', {
            preset:       'conventionalcommits',
            releaseRules: releaseDocs ? [{type: 'docs', release: 'patch'}] : [],
        }],
        ['@semantic-release/release-notes-generator', {
            preset:       'conventionalcommits',
            presetConfig: {
                types: [
                    {type: 'feat', section: 'Features'},
                    {type: 'fix', section: 'Bug Fixes'},
                    {type: 'perf', section: 'Performance'},
                    {type: 'docs', section: 'Documentation'},
                ],
            },
        }],
    ];

    if (changelog) {
        plugins.push(['@semantic-release/changelog', {changelogFile: 'CHANGELOG.md'}]);
        assets.push('CHANGELOG.md');
    }

    // only updates the version in package.json and package-lock.json, publishing is done by the workflow
    plugins.push(['@semantic-release/npm', {npmPublish: false}]);

    if (serverJson) {
        plugins.push([SERVER_JSON_PLUGIN, {packageName}]);
        assets.push('server.json');
    }

    plugins.push(
        ['@semantic-release/git', {
            assets,
            message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
        }],
        ['@semantic-release/github', {failComment: false}],
    );

    if (backmergeTo && backmergeTo !== backmergeFrom) {
        plugins.push(['@saithodev/semantic-release-backmerge', {
            backmergeBranches: [{from: backmergeFrom, to: backmergeTo}],
            backmergeStrategy: 'merge',
            mergeMode:         'theirs',
        }]);
    }

    return plugins;
}

async function main() {
    const cwd           = process.cwd();
    const changelog     = process.env.CHANGELOG === 'true';
    const releaseDocs   = process.env.RELEASE_DOCS === 'true';
    const serverJson    = existsSync(join(cwd, 'server.json'));
    const packageName   = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).name;
    const backmergeFrom = process.env.GITHUB_REF_NAME;
    let backmergeTo     = process.env.BACKMERGE_BRANCH?.trim() ?? '';

    if (backmergeTo && !remoteBranchExists(backmergeTo)) {
        console.log(`Branch ${backmergeTo} does not exist, skipping backmerge`);
        backmergeTo = '';
    }

    const plugins = createPlugins({changelog, releaseDocs, serverJson, packageName, backmergeFrom, backmergeTo});

    // options passed here replace the plugins of a release config in the project
    const result = await semanticRelease({plugins}, {
        cwd,
        env:    process.env,
        stdout: process.stdout,
        stderr: process.stderr,
    });

    if (!result || !result.nextRelease) {
        setOutput('released', 'false');
        return;
    }

    setOutput('released', 'true');
    setOutput('version', result.nextRelease.version);
    setOutput('git-tag', result.nextRelease.gitTag);
    setOutput('channel', result.nextRelease.channel ?? '');
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(`::error::${error.message}`);
        process.exitCode = 1;
    });
}
