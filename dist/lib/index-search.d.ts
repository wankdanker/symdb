export declare function IndexSearch(model: any, search: any, cb: (err: Error | null, results: any[]) => void): void;
export declare namespace IndexSearch {
    var async: (model: any, search: any) => Promise<any[]>;
    var sync: (model: any, search: any) => any[];
}
