"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mixin = exports.SymDbComparison = void 0;
class SymDbComparison {
    static isNull() {
        return new IsNull();
    }
    static isUndefined() {
        return new IsUndefined();
    }
    static gt(b) {
        return new Gt(b);
    }
    static gte(b) {
        return new Gte(b);
    }
    static lt(b) {
        return new Lt(b);
    }
    static lte(b) {
        return new Lte(b);
    }
    static startsWith(b) {
        return new StartsWith(b);
    }
    static contains(b) {
        return new Contains(b);
    }
    static between(b, c) {
        return new Between(b, c);
    }
    static compare(fn) {
        return new Compare(fn);
    }
    compare(a) {
        return false;
    }
}
exports.SymDbComparison = SymDbComparison;
class IsNull extends SymDbComparison {
    compare(a) {
        return a === null;
    }
}
class IsUndefined extends SymDbComparison {
    compare(a) {
        return a === undefined;
    }
}
class Gt extends SymDbComparison {
    constructor(b) {
        super();
        this.b = b;
    }
    compare(a) {
        return a > this.b;
    }
}
class Gte extends SymDbComparison {
    constructor(b) {
        super();
        this.b = b;
    }
    compare(a) {
        return a >= this.b;
    }
}
class Lt extends SymDbComparison {
    constructor(b) {
        super();
        this.b = b;
    }
    compare(a) {
        return a < this.b;
    }
}
class Lte extends SymDbComparison {
    constructor(b) {
        super();
        this.b = b;
    }
    compare(a) {
        return a <= this.b;
    }
}
class StartsWith extends SymDbComparison {
    constructor(b) {
        super();
        this.b = b;
    }
    compare(a) {
        return a && String(a).indexOf(this.b) === 0;
    }
}
class Contains extends SymDbComparison {
    constructor(b) {
        super();
        this.b = b;
    }
    compare(a) {
        if (Array.isArray(this.b)) {
            return this.b.includes(a);
        }
        return !!~a.indexOf(this.b);
    }
}
class Between extends SymDbComparison {
    constructor(b, c) {
        super();
        this.b = b;
        this.c = c;
    }
    compare(a) {
        return !!(a > this.b && a < this.c);
    }
}
class Compare extends SymDbComparison {
    constructor(b) {
        super();
        this.b = b;
    }
    compare(a) {
        return this.b(a);
    }
}
function mixin(target) {
    Object.getOwnPropertyNames(SymDbComparison).forEach(key => {
        if (key === 'prototype' || key === 'length' || key === 'name' || key === 'constructor') {
            return;
        }
        target[key] = SymDbComparison[key];
    });
}
exports.mixin = mixin;
