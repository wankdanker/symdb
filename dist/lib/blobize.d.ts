/// <reference types="node" />
/// <reference types="node" />
export declare function blobize(db: any): void;
export declare function getBlobs(obj: any, found?: {
    [key: string]: Buffer;
}, rootkey?: string): {
    [key: string]: Buffer;
};
