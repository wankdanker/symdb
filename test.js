var test = require('tape');
var SymDb = require('./');

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

    User.add(add).then(function (obj) {
        t.ok(obj, 'user object returned in add() callback');
        t.ok(obj._id, 'user object now contains an _id attribute in add() callback');

        User.get(obj).then(function (records) {
            t.ok(records, 'records returned in get() callback');
            t.equal(records.length, 1, 'one record returned in get() callback')
            t.deepEqual(records[0], obj, 'the object returned in the get() callback matches the object we looked up')
        
            obj.age = 39;

            User.update(obj).then(function (obj) {
                t.ok(obj, 'user object returned in update() callback');
                t.equal(obj.age, 39, 'user object returned in update() callback is correct updated age');

                User.del(obj).then(function () {
                    t.end();
                }).catch(function (err) {
                    t.notOk(err, 'no error returned in del() callback');
                });
            }).catch(function (err) {
                t.notOk(err, 'no error returned in update() callback');
            });
        }).catch(function (err) {
            t.notOk(err, 'no error returned in get() callback');
        });
    }).catch(function (err) {
        t.notOk(err, 'no errors returned in add() callback');
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