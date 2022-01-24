import {ListTagsResponse, NodeVersion, PhpVersion, WebServerType} from './model';
import compareVersions from 'compare-versions';
import Docker from 'dockerode';
import axios from 'axios';
import {spawn} from 'child_process';
import {getInput} from "@actions/core";
import {context, getOctokit} from "@actions/github";
// @ts-ignore
import {createClientV2} from 'docker-registry-client';

(async () => {
    try {
        const phpRegex = new RegExp(process.argv[2] || '^(?:(7\\.[1-9])|([8-9]\\.\\d+))-(apache|fpm)$');
        const client = createClientV2({'name': 'php'});
        const phpVersions: PhpVersion[] = (await getTags(client)).tags.map(it => {
            const match = phpRegex.exec(it);
            return {
                tag: it,
                version: match && match[1],
                webServer: it.includes('-fpm') ? WebServerType.NGINX : WebServerType.APACHE,
            } as PhpVersion;
        }).filter(it => it.version);

        const nodeVersions = await getNodeLtsVersions();

        const docker = new Docker();

        for (let phpVersion of phpVersions) {
            const imageTags = await buildImages(docker, phpVersion, nodeVersions)
            await createOrUpdateRelease(phpVersion, imageTags)
        }
    } catch (e) {
        console.error('Build failed: ', e);
        process.exit(typeof e == 'number' ? e : 1);
    }
})();

async function createOrUpdateRelease(phpVersion: PhpVersion, imageTags: string[]) {
    const githubToken = getInput("token", {required: false});
    if (githubToken) {
        const octokit = getOctokit(githubToken);
        const { owner, repo } = context.repo;

        const target_commitish = getInput('commitish', { required: false }) || context.sha;
        const tag = `php${phpVersion.version}`
        const existingRelease = await octokit.repos.getReleaseByTag({owner, repo, tag}).then(response => response.data).catch(err => {
            if (err?.status === 404) {
                return null
            }
            throw err;
        })

        const body = `Available tags for \`${tag}\`:\n\n` + imageTags.join('\n')

        if (existingRelease === null) {
            octokit.repos.createRelease({
                owner,
                repo,
                tag_name: tag,
                target_commitish,
                name: tag,
                body
            })
        } else {
            octokit.repos.updateRelease({
                owner,
                repo,
                tag_name: tag,
                target_commitish,
                name: tag,
                body,
                release_id: existingRelease.id
            })
        }
    } else {
        console.warn('No INPUT_TOKEN specified, skipping creating release')
    }
}

async function buildImages(docker: Docker, phpVersion: PhpVersion, nodeVersions: NodeVersion[]) {
    console.log('Building images for ' + phpVersion.tag);
    const images = [];
    // Build non-debug images
    for (let nodeVersion of nodeVersions) {
        images.push(
            await buildAndPushImage(docker, phpVersion, nodeVersion, false, false),
            await buildAndPushImage(docker, phpVersion, nodeVersion, true, false),
            await buildAndPushImage(docker, phpVersion, nodeVersion, false, true),
            await buildAndPushImage(docker, phpVersion, nodeVersion, true, true)
        );
    }
    console.log('Done building images for ' + phpVersion.tag);
    return images;
}

async function buildAndPushImage(docker: Docker, phpVersion: PhpVersion, nodeVersion: NodeVersion, imageSupport: boolean, debug: boolean) {
    const imageName = 'recognizebv/symfony-docker';
    const tagName = `php${phpVersion.version}${phpVersion.webServer === WebServerType.NGINX ? '-nginx' : ''}-node${nodeVersion.major}` + (imageSupport ? '-image' : '') + (debug ? '-dev' : '');
    const tag = imageName + ':' + tagName;

    console.log('Building image ' + tag);
    const childProcess = spawn('docker', [
        'buildx',
        'build',
        '--platform', 'linux/amd64,linux/arm64',
        '--push',
        '-f', phpVersion.webServer === WebServerType.NGINX ? 'nginx/Dockerfile' : 'apache/Dockerfile',
        '--tag', `${imageName}:${tagName}`,
        '--build-arg', `BASE_IMAGE=php:${phpVersion.tag}`,
        '--build-arg', `NODE_VERSION=${nodeVersion.version}`,
        '--build-arg', `ENABLE_IMAGE_SUPPORT=${imageSupport ? 'true' : 'false'}`,
        '--build-arg', `ENABLE_DEBUG=${debug ? 'true' : 'false'}`,
        '.'
    ], {stdio: 'inherit'});

    await new Promise(((resolve, reject) => childProcess.on('close', code => code === 0 ? resolve(code) : reject(code))));

    return tag
}

function getTags(client: {
    listTags: (cb: (err: any, response: ListTagsResponse) => void) => void
}): Promise<ListTagsResponse> {
    return new Promise((resolve, reject) => {
        client.listTags((err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        })
    });
}

async function getNodeLtsVersions() {
    const response = await axios.get<{ version: string, lts: string|boolean }[]>('https://nodejs.org/dist/index.json');
    const groupedVersion = groupBy(response.data.filter(it => it.lts), 'lts');
    const versions: NodeVersion[] = [];

    for (let key in groupedVersion) {
        const highestVersion = groupedVersion[key].reduce((a, b) => {
            return compareVersions(a.version, b.version) === -1 ? b : a;
        }, {version: '0.0.0', lts: ''});

        const majorMatch = highestVersion.version.match(/^v(\d+).+/)
        if (majorMatch !== null) {
            versions.push({
                version: highestVersion.version,
                major: majorMatch[1],
                lts: highestVersion.lts || ''
            } as NodeVersion)
        }
    }
    return versions.filter(it => Number(it.major) >= 10)
}

function groupBy<T, K extends keyof T>(items: T[], key: K): { [key: string]: T[] } {
    return items.reduce((objectsByKeyValue, obj) => {
        const value = obj[key];
        objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
        return objectsByKeyValue;
    }, {} as any);
}
