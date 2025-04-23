/// <reference types="node" />
/// <reference types="node" />
import { EventPipeline } from 'event-pipeline';
export type PathType = 'store' | 'store-path' | 'link-target' | 'symlink' | 'symlink-relative' | 'index-links' | 'index-val-path' | 'index-path' | 'blob-object-key' | 'blob-object-dir' | 'blob-dir';
export interface SymDbModelContext {
    data?: any;
    model?: SymDbModel;
    session?: any;
    lookup?: any;
    results?: any[];
    blobs?: {
        [key: string]: Buffer;
    };
    result?: any;
}
export declare class SymDbModel extends EventPipeline {
    db: any;
    name: string;
    schema: any;
    root: string;
    paging?: {
        page: number;
        size: number;
    };
    sorting?: {
        [key: string]: string;
    };
    constructor(db: any, name: string, schema: any);
    /**
     * Get a path for an object/symlink relationship
     */
    getPath(type: PathType, obj?: any, index?: string, val?: any): string;
    /**
     * Save an object.
     */
    save(obj: any, context?: SymDbModelContext | ((err?: Error, result?: any) => void), cb?: (err?: Error, result?: any) => void): Promise<any> | void;
    /**
     * Save an object synchronously
     */
    saveSync(obj: any, context?: SymDbModelContext): any;
    /**
     * Write an object.
     * You might actually want to use save.
     */
    write(obj: any, cb?: (err?: Error) => void): Promise<void> | void;
    /**
     * Write an object synchronously.
     * You might actually want to use saveSync instead.
     */
    writeSync(obj: any): void;
    /**
     * Generate a unique id
     */
    id(): string;
    /**
     * Create the index links for this object based on schema
     */
    index(obj: any, cb?: (err?: Error) => void): Promise<void> | void;
    /**
     * Create the index links for this object based on schema
     */
    indexSync(obj: any): void;
    /**
     * Add a new object and index it
     */
    add(obj: any, context?: SymDbModelContext | ((err?: Error, result?: any) => void), cb?: (err?: Error, result?: any) => void): Promise<any> | void;
    /**
     * Add a new object and index it synchronously
     */
    addSync(obj: any, context?: SymDbModelContext): any;
    /**
     * Update an existing object by modifying indexes and resaving the object
     */
    update(obj: any, context?: SymDbModelContext | ((err?: Error, result?: any) => void), cb?: (err?: Error, result?: any) => void): Promise<any> | void;
    /**
     * Update an existing object by modifying indexes and resaving the object synchronously
     */
    updateSync(obj: any, context?: SymDbModelContext): any;
    /**
     * Set the page size
     *
     * @note this must be called right before .sort() or .get()
     */
    page(page: number, size: number): this;
    /**
     * Set the sort order
     *
     * @note this must be called right before .page() or .get()
     */
    sort(sorts: {
        [key: string]: string;
    }): this;
    /**
     * Get an object from the collection
     */
    get(lookup?: any, context?: SymDbModelContext | ((err?: Error, result?: any[]) => void), cb?: (err?: Error, result?: any[]) => void): Promise<any[]> | void;
    /**
     * Get an object from the collection synchronously
     */
    getSync(lookup?: any, context?: SymDbModelContext): any[];
    /**
     * Delete an object from the collection
     */
    del(obj: any, context?: SymDbModelContext | ((err?: Error, result?: any) => void), cb?: (err?: Error, result?: any) => void): Promise<any> | void;
    /**
     * Delete an object from the collection synchronously
     */
    delSync(obj: any, context?: SymDbModelContext): any;
    /**
     * Delete an object's indexes
     */
    delIndexes(obj: any, cb?: (err?: Error, result?: any) => void): Promise<any> | void;
    /**
     * Delete an object's indexes synchronously
     */
    delIndexesSync(obj: any): any;
    /**
     * Delete and add an objects indexes
     */
    reindex(lookup?: any, cb?: (err?: Error) => void): Promise<boolean> | void;
    /**
     * Delete and add an object's indexes synchronously
     */
    reindexSync(lookup?: any): boolean;
}
