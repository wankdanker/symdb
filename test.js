var test = require('tape');
var SymDb = require('./');

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
    t.plan(3);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('save:before', function (obj, next) {
        t.ok(obj, 'user object returned in save:before callback');

        return next();
    }).on('save:after', function (obj, next) {
        t.ok(obj, 'user object returned in save:after callback');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.del(obj).then(function () {
            t.end();
        });
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test add:before and add:after', function (t) {
    t.plan(3);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('add:before', function (obj, next) {
        t.ok(obj, 'user object returned in add:before callback');
        return next();
    }).on('add:after', function (obj, next) {
        t.ok(obj, 'user object returned in add:after callback');
        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.del(obj).then(function () {
            t.end();
        });
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test delete:before and delete:after', function (t) {
    t.plan(3);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('delete:before', function (obj, next) {
        t.ok(obj, 'user object returned in delete:before callback');

        return next();
    }).on('delete:after', function (obj, next) {
        t.ok(obj, 'user object returned in delete:after callback');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.del(obj).then(function () {
            t.end();
        })
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test update:before and update:after', function (t) {
    t.plan(3);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('update:before', function (obj, next) {
        t.ok(obj, 'user object returned in update:before callback');

        return next();
    }).on('update:after', function (obj, next) {
        t.ok(obj, 'user object returned in update:after callback');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.update(obj).then(function(obj) {
            User.del(obj).then(function () {
                t.end();
            });
        });
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
    });
});

test('test get:before and get:after', function (t) {
    t.plan(4);

    var db = new SymDb({
        root : "/tmp/db"
    });

    var User = db.Model('user', {
        name : String
        , age : Number
        , user_id : Number
    }).on('get:before', function (obj, next) {
        t.ok(obj, 'user object returned in get:before callback');

        return next();
    }).on('get:after', function (results, next) {
        t.ok(results, 'user object returned in get:after callback');
        t.equal(results.length, 1, 'results has one record');

        return next();
    });

    var add = { 
        name : 'Dan'
        , age : 21
        , user_id : 12345
        , description : 'quartz'
    };

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');

        User.get(obj).then(function(results) {
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