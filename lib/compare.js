
class SymDbComparison {};

class gt extends SymDbComparison {
    constructor (b) {
        super(b);
        this.b = b;
    }

    compare (a) {
        return a > this.b;
    }
};

class gte extends SymDbComparison {
    constructor (b) {
        super(b);
        this.b = b;
    }

    compare (a) {
        return a >= this.b;
    }
};

class lt extends SymDbComparison {
    constructor (b) {
        super(b);
        this.b = b;
    }

    compare (a) {
        return a < this.b;
    }
    
};

class lte extends SymDbComparison {
    constructor (b) {
        super(b);
        this.b = b;
    }

    compare (a) {
        return a <= this.b;
    }
};

class startsWith extends SymDbComparison {
    constructor (b) {
        super(b);
        this.b = b;
    }

    compare (a) {
        return a && String(a).indexOf(this.b) === 0;
    }
};

class contains extends SymDbComparison {
    constructor (b) {
        super(b);
        this.b = b;
    }

    compare (a) {
        if (Array.isArray(this.b)) {
            return this.b.includes(a);
        }

        return !!~a.indexOf(this.b);
    }
};

class between extends SymDbComparison {
    constructor (b, c) {
        super(b, c);
        this.b = b;
        this.c = c;
    }

    compare (a) {
        return !!(a > this.b && a <this.c)
    }
};

//do a comparison against a specific function.
class compare extends SymDbComparison {
    constructor (b) {
        super(b);
        this.b = b;
    }

    compare (a) {
        return this.b(a);
    }
};

function mkinstance(Cls) {
    return function (a, b, c, d) {
        return new (Function.prototype.bind.apply(Cls, [null, a, b, c, d]));
    }
}

module.exports = SymDbComparison
module.exports.gt = mkinstance(gt);
module.exports.gte = mkinstance(gte);
module.exports.lt = mkinstance(lt);
module.exports.lte = mkinstance(lte);
module.exports.startsWith = mkinstance(startsWith);
module.exports.contains = mkinstance(contains);
module.exports.between = mkinstance(between);
module.exports.compare = mkinstance(compare);

module.exports.mixin = function (target) {
    Object.keys(module.exports).forEach(key => {
        if (key === 'mixin') {
            return;
        }

        target[key] = module.exports[key]
    })
}