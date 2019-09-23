import {ListTagsResponse, NodeVersion, PhpVersion} from './model';
import {createClientV2} from 'docker-registry-client';
import * as compareVersions from 'compare-versions';
import * as Docker from 'dockerode';
import axios from 'axios';
import * as path from 'path';
import {spawn} from 'child_process';

(async () => {
    try {
        const phpRegex = new RegExp('^([7-9]\\.\\d+)-apache$');
        const client = createClientV2({'name': 'php'});
        const phpVersions = (await getTags(client)).tags.map(it => {
            const match = phpRegex.exec(it);
            return {tag: it, version: match && match[1]};
        }).filter(it => it.version);

        const nodeVersions = await getNodeLtsVersions();

        const docker = new Docker();

        for (let phpVersion of phpVersions) {
            await buildImages(docker, phpVersion, nodeVersions)
        }
    } catch (e) {
        console.error('Build failed: ', e);
        process.exit(typeof e == 'number' ? e : 1);
    }
})();

async function buildImages(docker: Docker, phpVersion: PhpVersion, nodeVersions: NodeVersion[]) {
    console.log('Building images for ' + phpVersion.tag);
    // Build non-debug images
    for (let nodeVersion of nodeVersions) {
        await buildAndPushImage(docker, phpVersion, nodeVersion, false);
        await buildAndPushImage(docker, phpVersion, nodeVersion, true);

    }
    console.log('Done building images for ' + phpVersion.tag);
}

async function buildAndPushImage(docker: Docker, phpVersion: PhpVersion, nodeVersion: NodeVersion, debug: boolean) {
    const imageName = 'recognizebvblaat/symfony-docker';
    const tagName = `php${phpVersion.version}-node${nodeVersion.major}` + (debug ? '-dev' : '');
    const tag = imageName + ':' + tagName;


    console.log('Building image ' + tag);
    const childProcess = spawn('docker', [
        'build',
        '--tag', `${imageName}:${tagName}`,
        '--build-arg', `BASE_IMAGE=php:${phpVersion.tag}`,
        '--build-arg', `NODE_VERSION=${nodeVersion.version}`,
        '--build-arg', `ENABLE_DEBUG=${debug ? 'true' : 'false'}`,
        '.'
    ], {stdio: 'inherit'});

    await new Promise(((resolve, reject) => childProcess.on('close', code => code === 0 ? resolve(code) : reject(code))));

    await pushImage(docker, imageName, tagName);
}

async function pushImage(docker: Docker, imageName: string, tagName: string) {
    const childProcess = spawn('docker', ['push', `${imageName}:${tagName}`], {stdio: 'inherit'});
    return new Promise(((resolve, reject) => childProcess.on('close', code => code === 0 ? resolve(code) : reject(code))));
}

function getTags(client: any): Promise<ListTagsResponse> {
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
    const response = await axios.get<NodeVersion[]>('https://nodejs.org/dist/index.json');
    const groupedVersion = groupBy(response.data.filter(it => it.lts), 'lts');
    const versions: { version: string, major: string, lts: string }[] = [];

    for (let key in groupedVersion) {
        const highestVersion = groupedVersion[key].reduce((a, b) => {
            return compareVersions(a.version, b.version) === -1 ? b : a;
        }, {version: '0.0.0', lts: ''});

        versions.push({
            version: highestVersion.version,
            major: highestVersion.version.match(/^v(\d+).+/)[1],
            lts: highestVersion.lts || ''
        })
    }
    return versions.filter(it => Number(it.major) >= 8)
}

function groupBy<T, K extends keyof T>(items: T[], key: K): { [key: string]: T[] } {
    return items.reduce((objectsByKeyValue, obj) => {
        const value = obj[key];
        objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
        return objectsByKeyValue;
    }, {} as any);
}
