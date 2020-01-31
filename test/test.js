var test = require('tape');
var SymDb = require('..');
var blobize = require('../lib/blobize');

test('comparison functions', function (t) {
    t.equal(SymDb.isNull().compare(null), true, 'null is null');
    t.equal(SymDb.isNull().compare(undefined), false, 'undefined is not null');
    t.equal(SymDb.isNull().compare(true), false, 'true is not null');
    t.equal(SymDb.isNull().compare(false), false, 'false is not null');
    t.equal(SymDb.isNull().compare(1), false, '1 is not null');
    t.equal(SymDb.isNull().compare('null'), false, '"null" is not null');
    t.equal(SymDb.isNull().compare('asdf'), false, '"asdf" is not null');
    
    t.equal(SymDb.isUndefined().compare(null), false, 'null is not undefined');
    t.equal(SymDb.isUndefined().compare(undefined), true, 'undefined is undefined');
    t.equal(SymDb.isUndefined().compare(true), false, 'true is not undefined');
    t.equal(SymDb.isUndefined().compare(false), false, 'false is not undefined');
    t.equal(SymDb.isUndefined().compare(1), false, '1 is not undefined');
    t.equal(SymDb.isUndefined().compare('null'), false, '"null" is not undefined');
    t.equal(SymDb.isUndefined().compare('asdf'), false, '"asdf" is not undefined');
    t.equal(SymDb.isUndefined().compare('undefined'), false, '"undefined" is not undefined');

    t.equal(SymDb.gt(10).compare(11), true, '11 is greater than 10');
    t.equal(SymDb.gt(10).compare(9), false, '9 is not greater than 10');

    t.equal(SymDb.gte(10).compare(10), true, '10 is greater than or equal to 10');
    t.equal(SymDb.gte(10).compare(20), true, '20 is greater than or equal to 10');
    t.equal(SymDb.gte(10).compare(9), false, '9 is not greater than or equal to 10');

    t.equal(SymDb.lt(11).compare(10), true, '10 is less than 11');
    t.equal(SymDb.lt(9).compare(10), false, '10 is not less than 9');

    t.equal(SymDb.lte(10).compare(10), true, '10 is less than or equal to 10');
    t.equal(SymDb.lte(20).compare(10), true, '10 is less than or equal to 20');
    t.equal(SymDb.lte(9).compare(10), false, '10 is not less than or equal to 9');

    t.equal(SymDb.startsWith('dingo').compare('dingo this that'), true, '"dingo this that" starts with "dingo"');
    t.equal(SymDb.startsWith('bart').compare('dingo this that'), false, '"dingo this that" does not contain "bart"');

    t.equal(SymDb.contains('this').compare('dingo this that'), true, '"dingo this that" contains "this"');
    t.equal(SymDb.contains('bart').compare('dingo this that'), false, '"dingo this that" does not contain "bart"');

    t.equal(SymDb.between(1, 10).compare(5), true, '5 is between 1 and 10');
    t.equal(SymDb.between(1, 10).compare(11), false, '11 is not between 1 and 10');

    t.equal(SymDb.contains(['a','b', 'c']).compare('a'), true, 'array ["a", "b", "c"] does contain "a"');
    t.equal(SymDb.contains(['a','b', 'c']).compare('d'), false, 'array ["a", "b", "c"] does not contain "d"');

    t.equal(SymDb.compare(WeirdCompare).compare('buddha'), true, 'WeirdCompare function is true for "buddha"');
    t.equal(SymDb.compare(WeirdCompare).compare('dog'), false, 'WeirdCompare function is not true for "dog"');
    
    t.end();

    function WeirdCompare(z) {
        return z === 'buddha'
    }
});

test('make sure getBlobs can find buffers in an object', function (t) {
    var obj = {
        a : {
            b : {
                c : Buffer.from("hello")
            }
        }
        , d : Buffer.from("world")
        , e : "not a buffer"
    }

    var buffers = blobize.getBlobs(obj);

    t.ok(buffers['a.b.c'], 'a.b.c is a buffer');
    t.ok(buffers['d'], 'd is a buffer');
    t.notOk(buffers['e'], 'e is not a buffer');

    t.end();
});
