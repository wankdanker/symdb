var test = require('tape');
var SymDb = require('..');

test('sync: should add, get, update, delete synchronously non-indexed', function (t) {
    const db = new SymDb({
        root : "/tmp/db"
    });

    const Model = db.Model('model', {});

    let result = Model.addSync({ model_id : 'testing', type : 'human' });
    t.ok(result, 'add result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');

    result = Model.getSync({ model_id : 'testing' });
    t.equal(result.length, 1, 'getSync should return one result');
    result = result[0];
    t.ok(result, 'add result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');

    //try to update the name on the object
    result.name = 'steve';
    result = Model.updateSync(result);

    t.ok(result, 'update result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');
    t.equal(result.name, 'steve', 'result.name is steve');

    //try to get the record from disk again
    result = Model.getSync({ model_id : 'testing' });
    t.equal(result.length, 1, 'getSync should return one result');
    result = result[0];
    t.ok(result, 'add result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');
    t.equal(result.name, 'steve', 'result.name is steve');

    result = Model.delSync(result);

    t.ok(result, 'delete result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');
    t.equal(result.name, 'steve', 'result.name is steve');

    t.end();
});


test('sync: should add, get, update, delete synchronously indexed', function (t) {
    const db = new SymDb({
        root : "/tmp/db"
    });

    var Model = db.Model('model', {
        model_id : Number
    });

    let result = Model.addSync({ model_id : 'testing', type : 'human' });
    t.ok(result, 'add result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');

    result = Model.getSync({ model_id : 'testing' });
    t.equal(result.length, 1, 'getSync should return one result');
    result = result[0];
    t.ok(result, 'add result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');

    //try to update the name on the object
    result.name = 'steve';
    result = Model.updateSync(result);

    t.ok(result, 'update result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');
    t.equal(result.name, 'steve', 'result.name is steve');

    //try to get the record from disk again
    result = Model.getSync({ model_id : 'testing' });
    t.equal(result.length, 1, 'getSync should return one result');
    result = result[0];
    t.ok(result, 'add result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');
    t.equal(result.name, 'steve', 'result.name is steve');

    result = Model.delSync(result);

    t.ok(result, 'delete result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');
    t.equal(result.name, 'steve', 'result.name is steve');

    t.end();
});

test('sync: test on empty directory', function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var Model = db.Model('asdf', {
        model_id : Number
    });

    var result = Model.getSync({ model_id : SymDb.gte(1) });
    t.equal(result.length, 0, 'should have no results');
    t.end();
});