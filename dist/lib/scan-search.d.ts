export declare function ScanSearch(model: any, search: any, cb: (err: Error | null, results: any[]) => void): void;
export declare namespace ScanSearch {
    var async: (model: any, search: any) => Promise<any[]>;
    var sync: (model: any, search: any) => any[];
}
