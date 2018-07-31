var SymDb = require('./');


var db = new SymDb({
    root : "./db"
});

var User = db.Model('user', {
    name : String
    , age : Number
    , user_id : Number
});

User.add({ name : 'Dan', age : 38, user_id : 1 }, function (err, obj) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    console.log('added', obj);

    User.get(obj, function (err, records) {
        console.log('got', records)
    
        obj.age = 39;

        User.update(obj, function (err, obj) {
            console.log('updated', obj);

            User.del(obj, function (err) {
                console.log('deleted', obj);
            });
        });
    });
});