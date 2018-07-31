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

    console.log(obj);

    User.get({ user_id : 0 }, function (err, records) {
        console.log(arguments)
    })
});