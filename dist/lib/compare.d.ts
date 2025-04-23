export declare class SymDbComparison {
    static isNull(): IsNull;
    static isUndefined(): IsUndefined;
    static gt(b: any): Gt;
    static gte(b: any): Gte;
    static lt(b: any): Lt;
    static lte(b: any): Lte;
    static startsWith(b: string): StartsWith;
    static contains(b: any): Contains;
    static between(b: any, c: any): Between;
    static compare(fn: (a: any) => boolean): Compare;
    compare(a: any): boolean;
}
declare class IsNull extends SymDbComparison {
    compare(a: any): boolean;
}
declare class IsUndefined extends SymDbComparison {
    compare(a: any): boolean;
}
declare class Gt extends SymDbComparison {
    private b;
    constructor(b: any);
    compare(a: any): boolean;
}
declare class Gte extends SymDbComparison {
    private b;
    constructor(b: any);
    compare(a: any): boolean;
}
declare class Lt extends SymDbComparison {
    private b;
    constructor(b: any);
    compare(a: any): boolean;
}
declare class Lte extends SymDbComparison {
    private b;
    constructor(b: any);
    compare(a: any): boolean;
}
declare class StartsWith extends SymDbComparison {
    private b;
    constructor(b: string);
    compare(a: any): boolean;
}
declare class Contains extends SymDbComparison {
    private b;
    constructor(b: any);
    compare(a: any): boolean;
}
declare class Between extends SymDbComparison {
    private b;
    private c;
    constructor(b: any, c: any);
    compare(a: any): boolean;
}
declare class Compare extends SymDbComparison {
    private b;
    constructor(b: (a: any) => boolean);
    compare(a: any): boolean;
}
export declare function mixin(target: any): void;
export {};
