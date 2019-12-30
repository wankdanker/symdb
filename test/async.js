var test = require('tape');
var SymDb = require('..');

test('async/await: base functionality via async calls', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
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

    var obj = await User.add(add);

    t.ok(obj, 'user object returned in add() callback');
    t.ok(obj._id, 'user object now contains an _id attribute in add() callback');

    let records = await User.get(obj);

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')
    t.deepEqual(records[0], obj, 'the object returned in the get() callback matches the object we looked up')

    obj.age = 39;

    obj = await User.update(obj);

    t.ok(obj, 'user object returned in update() callback');
    t.equal(obj.age, 39, 'user object returned in update() callback is correct updated age');

    await User.del(obj);

    t.end();
});

test('async/await: test comparisons in indexed fields', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
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

    var obj = await User.add(add);

    t.ok(obj, 'user object returned in add() callback');
    t.ok(obj._id, 'user object now contains an _id attribute in add() callback');

    let records = await User.get({
        user_id : db.gt(20)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')
    t.deepEqual(records[0], obj, 'the object returned in the get() callback matches the object we looked up')

    records = await User.get({
        age : db.gt(25)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 0, 'no records returned in get() callback')

    records = await User.get({
        age : db.gt(20)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')

    records = await User.get({
        age : db.gte(21)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'no records returned in get() callback')

    await User.del(obj);

    t.end();
});


test('async/await: test comparisons in non-indexed fields', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var obj = await User.add(add);

    t.ok(obj, 'user object returned in add() callback');
    t.ok(obj._id, 'user object now contains an _id attribute in add() callback');

    let records = await User.get({
        user_id : db.gt(20)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')
    t.deepEqual(records[0], obj, 'the object returned in the get() callback matches the object we looked up')

    records = await User.get({
        age : db.gt(25)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 0, 'no records returned in get() callback')

    records = await User.get({
        age : db.gt(20)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')

    records = await User.get({
        age : db.gte(21)
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'no records returned in get() callback')

    await User.del(obj);

    t.end();
});

test('async/await: test deep indexed and unindexed fields', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        "name.first" : String
    });

    var add = { 
        name : { first : 'Dan', last : 'Smith' }
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var obj = await User.add(add);

    t.ok(obj, 'user object returned in add() callback');
    t.ok(obj._id, 'user object now contains an _id attribute in add() callback');

    let records = await User.get({
        "name.first" : "Dan"
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')
    t.deepEqual(records[0], obj, 'the object returned in the get() callback matches the object we looked up')

    records = await User.get({
        "name.first" : "Steve"
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 0, 'no records returned in get() callback')

    records = await User.get({
        "name.last" : "Smith"
    });

    t.ok(records, 'records returned in get() callback');
    t.equal(records.length, 1, 'one record returned in get() callback')
    t.deepEqual(records[0], obj, 'the object returned in the get() callback matches the object we looked up')

    await User.del(obj);

    t.end();
});

test('async/await: test writing a blob', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
        , blobs : true
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    })

    var adds = [{ 
        name : 'Dan'
        , age : 21
        , user_id : 95890
        , group : 'a'
        , description : 'quartz'
        , profile : { picture : Buffer.from("hello there! this is not a jpg") }
    }];

    var users = [];

    for (let user of adds) {
        users.push(await User.add(user));
    }

    t.equal(users.length, adds.length, 'correct number of users created');
    t.ok(users[0].profile.picture instanceof Buffer, 'picture should still be an instance of a buffer');

    let u = await User.get({ _id : users[0]._id })

    t.equal(u.length, 1, 'should get fresh copy of user');
    t.ok(u[0].profile.picture instanceof Buffer, 'fresh copy should have a Buffer as picture');

    for (let user of users) {
        await User.del(user);
    }
    
    t.end();
});

test('async/await: test issue with incorrect result set', async function (t) {
    const db = new SymDb({
        root : "/tmp/db"
    });

    const Webhooks = db.Model('webhooks', {
        webhook_id : String
        , name : String
        , type : String
        , event : String
        , created_on : Number
        , modified_on : Number
    });

    let hooks = await Webhooks.get();

    for (let hook of hooks) {
        await Webhooks.del(hook);
    }

    await Webhooks.add({
        url: 'http://localhost:8089/shipment/{lookup}',
        modified_on: '20190419',
        modified_at: '095233717',
        headers: {
            'x-session': 'asdflkjasldkfjsaldkfj'
        },
        type: 'lookup',
        name: 'local-rest-lookup',
        title: 'Shipments lookup webhook',
        created_on: '20190419',
        created_at: '094809316'
    });

    await Webhooks.add({
        headers: {
            'x-session': 'asdflkjasldkfjsaldkfj'
        },
        url: 'http://localhost:8089/shipments',
        type: 'event',
        event: 'shipment:label',
        method: 'post',
        title: 'Post Shipment',
        created_on: '20190423',
        created_at: '123336770',
    });

    const lookup = {
        type : 'event'
        , event : 'shipment:create'
    };

    const results = await Webhooks.get(lookup);

    t.equal(results.length, 0, 'no results should be returned.');

    hooks = await Webhooks.get();

    for (const hook of hooks) {
        await Webhooks.del(hook);
    }

    t.end();
})

test('async/await: test on empty directory', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var Model = db.Model('model', {
        model_id : Number
    });

    var result = await Model.get({ model_id : SymDb.gte(1) });

    t.end();
});

test('async/await: test update and delete with SymDb.patcher', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var Model = db.Model('model', {
        model_id : Number
    });

    Model.on('update:before', SymDb.patcher({ model_id : 'model_id' }));
    Model.on('delete:before', SymDb.patcher({ model_id : 'model_id' }));

    var result = await Model.add({ model_id : 'testing', type : 'human' });
    t.ok(result, 'add result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');

    result = await Model.update({ model_id : 'testing', name : 'steve' });

    t.ok(result, 'update result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');
    t.equal(result.name, 'steve', 'result.name is steve');

    result = await Model.del({ model_id : 'testing' });

    t.ok(result, 'delete result is truthy')
    t.ok(result._id, 'result._id is truthy');
    t.equal(result.model_id, 'testing', 'result.model_id is testing');
    t.equal(result.type, 'human', 'result.type is human');
    t.equal(result.name, 'steve', 'result.name is steve');

    t.end();
});