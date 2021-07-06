export interface ListTagsResponse {
    name: string,
    tags: string[]
}

export interface NodeVersion {
    version: string,
    major: string,
    lts: string
}

export interface PhpVersion {
    version: string;
    tag: string;
    webServer: string;
}

export enum WebServerType {
    APACHE = 'apache',
    NGINX = 'nginx',
}
