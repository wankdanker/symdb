var SymDb = require('./');
var doWhile = require('dank-do-while');

var db = new SymDb({ root : '/tmp/db'});

var Test = db.Model('test', {
    id : Number
    , type : String
});

addItems(1000);

function addItems(count) {
    var x = count;
    var time = 0;

    doWhile(function (next) {
        var start = +new Date();

        Test.add({
            id : count
            , type : 'test'
        }, function () {
            var stop = +new Date();

            x -= 1;

            time += (stop - start);

            return next(x);
        });
    }, function done () {
        console.log('adding   items complete: %s items in %s ms, %s op/s, %s ms/op ', count, time, ((count / time) * 1000).toFixed(2), (time / count).toFixed(2));

        getItems();
    });
}

function getItems() {
    var start = +new Date();
    
    Test.get({ type : 'test' }, function (err, results) {
        var stop = +new Date();

        var time = (stop - start);
        var count = results.length;

        console.log('getting  items complete: %s items in %s ms, %s op/s, %s ms/op', count, time, ((count / time) * 1000).toFixed(2), (time / count).toFixed(2));

        updateItems(results);
    });
}

function updateItems(items) {
    var start = +new Date();
    var count = 0;

    doWhile(function (next) {
        var item = items[count];

        if (!item) {
            return next(false);
        }

        Test.update(item, function (err, result) {
            count += 1;
            return next(true);
        });
    }, function done () {
        var stop = +new Date();

        var time = (stop - start);

        console.log('updating items complete: %s items in %s ms, %s op/s, %s ms/op ', count, time, ((count / time) * 1000).toFixed(2), (time / count).toFixed(2));

        delItems(items);
    });
}

function delItems(items) {
    var start = +new Date();
    var count = 0;

    doWhile(function (next) {
        var item = items.shift();

        if (!item) {
            return next(false);
        }

        Test.del(item, function (err, result) {
            count += 1;
            return next(true);
        });
    }, function done () {
        var stop = +new Date();

        var time = (stop - start);

        console.log('deleting items complete: %s items in %s ms, %s op/s, %s ms/op ', count, time, ((count / time) * 1000).toFixed(2), (time / count).toFixed(2));
    });
}