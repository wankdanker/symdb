var test = require('tape');
var SymDb = require('./');
var blobize = require('./lib/blobize');

test('comparison functions', function (t) {
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

test('base functionality via callbacks', function (t) {
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

    User.add(add, function (err, obj) {
        t.notOk(err, 'no errors returned in add() callback');
        t.ok(obj, 'user object returned in add() callback');
        t.ok(obj._id, 'user object now contains an _id attribute in add() callback');

        User.get(obj, function (err, records) {
            t.notOk(err, 'no error returned in get() callback');
            t.ok(records, 'records returned in get() callback');
            t.equal(records.length, 1, 'one record returned in get() callback')
            t.deepEqual(records[0], obj, 'the object returned in the get() callback matches the object we looked up')
        
            obj.age = 39;

            User.update(obj, function (err, obj) {
                t.notOk(err, 'no error returned in update() callback');
                t.ok(obj, 'user object returned in update() callback');
                t.equal(obj.age, 39, 'user object returned in update() callback is correct updated age');

                User.del(obj, function (err) {
                    t.notOk(err, 'no error returned in del() callback');
                    t.end();
                });
            });
        });
    });
});

test('base functionality via Promises', function (t) {
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

    var o;

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');
        t.ok(obj._id, 'user object now contains an _id attribute in add() callback');
        
        o = obj;

        return User.get(obj)
    }).then(function (records) {
        t.ok(records, 'records returned in get() callback');
        t.equal(records.length, 1, 'one record returned in get() callback')
        t.deepEqual(records[0], o, 'the object returned in the get() callback matches the object we looked up')
    
        o.age = 39;

        return User.update(o);
    }).then(function (obj) {
        t.ok(obj, 'user object returned in update() callback');
        t.equal(obj.age, 39, 'user object returned in update() callback is correct updated age');

        return User.del(obj);
    }).then(function () {
        t.end();
    }).catch(function (err) {
        t.notOk(err, 'no errors caught');
        t.end();
    });
});

test('base functionality via async calls', async function (t) {
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

test('test save:before and save:after', function (t) {
    t.plan(5);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('save:before', function (obj, next) {
        t.equal(obj.data.name, 'Dan', 'user object returned in save:before callback');
        t.equal(obj.session.test, 12345, 'session exists on context in save:before callback');

        return next();
    }).on('save:after', function (obj, next) {
        t.equal(obj.data.name, 'Dan', 'user object returned in save:after callback');
        t.equal(obj.session.test, 12345, 'session exists on context in save:after callback');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var context = {
        session : { test : 12345 }
    };

    User.add(add, context).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.del(obj).then(function () {
            t.end();
        });
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test add:before and add:after', function (t) {
    t.plan(5);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('add:before', function (obj, next) {
        t.equal(obj.data.name, 'Dan', 'user object returned in add:before callback');
        t.equal(obj.session.test, 12345, 'session exists on context in add:before callback');


        return next();
    }).on('add:after', function (obj, next) {
        t.equal(obj.data.name, 'Dan', 'user object returned in add:after callback');
        t.equal(obj.session.test, 12345, 'session exists on context in add:after callback');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var context = {
        session : { test : 12345 }
    };

    User.add(add, context).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.del(obj).then(function () {
            t.end();
        });
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test delete:before and delete:after', function (t) {
    t.plan(5);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('delete:before', function (obj, next) {
        t.equal(obj.data.name, 'Dan', 'user object returned in delete:before callback');
        t.equal(obj.session.test, 12345, 'session exists on context in delete:before callback');

        return next();
    }).on('delete:after', function (obj, next) {
        t.equal(obj.data.name, 'Dan', 'user object returned in delete:after callback');
        t.equal(obj.session.test, 12345, 'session exists on context in delete:after callback');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var context = {
        session : { test : 12345 }
    };

    User.add(add, context).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.del(obj, context).then(function () {
            t.end();
        })
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test update:before and update:after', function (t) {
    t.plan(5);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('update:before', function (obj, next) {
        t.equal(obj.data.name, 'Dan', 'user object returned in update:before callback');
        t.equal(obj.session.test, 12345, 'session exists on context in update:before callback');

        return next();
    }).on('update:after', function (obj, next) {
        t.equal(obj.data.name, 'Dan', 'user object returned in update:after callback');
        t.equal(obj.session.test, 12345, 'session exists on context in update:after callback');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var context = {
        session : { test : 12345 }
    };

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.update(obj, context).then(function(obj) {
            User.del(obj).then(function () {
                t.end();
            });
        });
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test get:before and get:after', function (t) {
    t.plan(5);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('get:before', function (obj, next) {
        t.equal(obj.lookup.name, 'Dan', 'user object returned in get:before callback');
        t.equal(obj.session.test, 12345, 'session exists on context in get:before callback');

        return next();
    }).on('get:after', function (result, next) {
        t.ok(result, 'user object returned in get:after callback');
        t.equal(result.results.length, 1, 'results has one record');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var context = {
        session : { test : 12345 }
    };

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.get(obj, context).then(function(results) {
            User.del(results[0]).then(function () {
                t.end();
            });
        });
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test comparisons in indexed fields', async function (t) {
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


test('test comparisons in non-indexed fields', async function (t) {
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

test('test deep indexed and unindexed fields', async function (t) {
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

test('test paging', function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    })

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    var users = [];

    User.add(Object.assign({}, add)).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        users.push(obj);

        return User.add(Object.assign({}, add));
    }).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        users.push(obj);

        return User.add(Object.assign({}, add));
    })
    .then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        users.push(obj);

        return User.page(2, 1).get({});
    })
    .then(function (us) {
        t.ok(us, 'users array returned from get() callback');
        t.equal(us.length, 1, 'one user object returned in get callback');
        t.ok(us._page, '_page object set')
        
        var promises = users.map(function (user) {
            return User.del(user);
        });

        return Promise.all(promises);
    })
    .then(function () {
        t.end();
    })
    .catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test paging', function (t) {
    var db = new SymDb({
        root : "/tmp/db"
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
        }
        , {
            name : 'Samantha'
            , age : 9
            , user_id : 47902
            , group : 'b'
            , description : 'granite'
        }
        , {
            name : 'George'
            , age : 17
            , user_id : 28954
            , group : 'a'
            , description : 'sedimentary'
        }
        , {
            name : 'Lynn'
            , age : 43
            , user_id : 30925
            , group : 'b'
            , description : 'arugula'
        }
    ];

    var users = [];

    var promises = adds.map(function (user) {
        return User.add(user)
    });

    Promise.all(promises).then(function (u) {
        users = u;

        t.equal(u.length, adds.length, 'correct number of users created')

        return User.sort({ age : 'asc' }).get()
    })
    .then(function (results) {
        t.deepEqual(results, [users[1], users[2], users[0], users[3]]);

        return User.sort({ group: 'desc', age : 'asc' }).get()
    })
    .then(function (results) {
        t.deepEqual(results, [users[1], users[3], users[2], users[0]]);

        var promises = users.map(function (user) {
            return User.del(user);
        });

        return Promise.all(promises);
    })
    .then(function () {
        t.end();
    })
    .catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});


test('test reindex', function (t) {
    var db = new SymDb({
        root : "/tmp/db"
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
        }
        , {
            name : 'Samantha'
            , age : 9
            , user_id : 47902
            , group : 'b'
            , description : 'granite'
        }
        , {
            name : 'George'
            , age : 17
            , user_id : 28954
            , group : 'a'
            , description : 'sedimentary'
        }
        , {
            name : 'Lynn'
            , age : 43
            , user_id : 30925
            , group : 'b'
            , description : 'arugula'
        }
    ];

    var users = [];

    var promises = adds.map(function (user) {
        return User.add(user)
    });

    Promise.all(promises).then(function (u) {
        users = u;

        t.equal(u.length, adds.length, 'correct number of users created')
        
        //add group to the schema
        User.schema.group = String;

        return User.reindex();
    })
    .then(function () {
        return User.sort({ age : 'desc' }).get({ group: 'a' });
    })
    .then(function (results) {
        t.deepEqual(results, [users[0], users[2]]);

        var promises = users.map(function (user) {
            return User.del(user);
        });

        return Promise.all(promises);
    })
    .then(function () {
        t.end();
    })
    .catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test writing a blob', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
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

test('test issue with incorrect result set', async function (t) {
    var db = new SymDb({
        root : "/tmp/db"
    });

    var Webhooks = db.Model('webhooks', {
        webhook_id : String
        , name : String
        , type : String
        , event : String
        , created_on : Number
        , modified_on : Number
    });

    var hooks = await Webhooks.get();

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

    t.end();
})