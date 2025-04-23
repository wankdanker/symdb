/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as fs from 'fs';
import { EventPipeline } from 'event-pipeline';
import { SymDbModel } from './lib/symdb-model';
import { patcher } from './lib/patcher';
import { SymDbComparison } from './lib/compare';
export interface SymDbOptions {
    root: string;
    linkType?: number;
    blobs?: boolean;
}
export interface SchemaDefinition {
    [key: string]: Function;
}
export interface ModelEventContext {
    data?: any;
    model?: SymDbModel;
    session?: any;
    lookup?: any;
    results?: any[];
    blobs?: {
        [key: string]: Buffer;
    };
}
declare class SymDb extends EventPipeline {
    root: string;
    linkType: number;
    models: {
        [key: string]: SymDbModel;
    };
    static HARD_LINK: number;
    static SOFT_LINK: number;
    static SYM_LINK: number;
    static EMPTY_FILE: number;
    static isNull: typeof SymDbComparison.isNull;
    static isUndefined: typeof SymDbComparison.isUndefined;
    static gt: typeof SymDbComparison.gt;
    static gte: typeof SymDbComparison.gte;
    static lt: typeof SymDbComparison.lt;
    static lte: typeof SymDbComparison.lte;
    static startsWith: typeof SymDbComparison.startsWith;
    static contains: typeof SymDbComparison.contains;
    static between: typeof SymDbComparison.between;
    static compare: typeof SymDbComparison.compare;
    static patcher: typeof patcher;
    constructor(opts: SymDbOptions);
    Model(name: string, schema: SchemaDefinition): SymDbModel;
    id(): string;
    writeJson(file: string, data: any, cb?: (err?: Error) => void): Promise<void> | void;
    writeJsonSync(file: string, data: any): void;
    readJson(file: string, cb?: (err: Error | null, data?: any) => void): Promise<any> | void;
    readJsonSync(file: string): any;
    writeBlob(file: string, data: Buffer, cb?: (err?: Error) => void): Promise<void> | void;
    writeBlobSync(file: string, data: Buffer): void;
    readBlob(file: string, cb?: (err: Error | null, data?: Buffer) => void): Promise<Buffer> | void;
    readBlobSync(file: string): Buffer;
    readBlobStream(file: string): fs.ReadStream;
    readdir(dir: string, filter?: ((filename: string) => boolean) | ((err: Error | null, files?: string[]) => void), cb?: (err: Error | null, files?: string[]) => void): Promise<string[]> | void;
    readdirSync(dir: string, filter?: (filename: string) => boolean): string[];
    readdirs(dirs: string[], filter?: ((filename: string) => boolean) | ((err: Error | null, files?: string[][]) => void), cb?: (err: Error | null, files?: string[][]) => void): Promise<string[][]> | void;
    readdirsSync(dirs: string[], filter?: (filename: string) => boolean): string[][];
    delFile(p: string, cb?: (err?: Error) => void): Promise<void> | void;
    delFileSync(p: string): void;
    linkFile(target: string, p: string, cb?: (err?: Error) => void): Promise<void> | void;
    linkFileSync(target: string, p: string): void;
}
export default SymDb;
