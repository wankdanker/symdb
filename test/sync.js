var test = require('tape');
var SymDb = require('..');

test('sync: test comparisons in indexed fields', function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user2', {
        name : String
        , age : Number
        , user_id : Number
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var obj = User.addSync(add);

    t.ok(obj, 'user object returned in add() callback');
    t.ok(obj._id, 'user object now contains an _id attribute in add() callback');

    let records = User.getSync({
        user_id : db.gt(20)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')
    t.deepEqual(records[0], obj, 'the object returned in the get() callback matches the object we looked up')

    records = User.getSync({
        age : db.gt(25)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 0, 'no records returned in get() callback')

    records = User.getSync({
        age : db.gt(20)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')

    records = User.getSync({
        age : db.gte(21)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'no records returned in get() callback')

    User.delSync(obj);

    t.end();
});

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