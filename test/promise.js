var test = require('tape');
var SymDb = require('..');

test('promise: test paging', function (t) {
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

test('promise: test paging', function (t) {
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


test('promise: test reindex', function (t) {
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


test('promise: base functionality via Promises', function (t) {
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


test('promise: test save:before and save:after', function (t) {
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

test('promise: test add:before and add:after', function (t) {
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

test('promise: test delete:before and delete:after', function (t) {
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

test('promise: test update:before and update:after', function (t) {
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

test('promise: test get:before and get:after', function (t) {
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
