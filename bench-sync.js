var SymDb = require('.');
var doWhile = require('dank-do-while');

var db = new SymDb({ root : '/tmp/db', linkType : SymDb.SOFT_LINK, blobs : false });

var Test = db.Model('test', {
    id : Number
    , type : String
});

addItems(10000);

function addItems(count) {
    let time = 0;

    for (let x = count; x; x -= 1) {
        const start = +new Date();

        Test.addSync({
            id : x
            , type : 'test'
        });

        const stop = +new Date();

        x -= 1;

        time += (stop - start);
    }

    console.log('adding   items complete: %s items in %s ms, %s op/s, %s ms/op ', count, time, ((count / time) * 1000).toFixed(2), (time / count).toFixed(2));

    getItems();
}

function getItems() {
    let start = +new Date();
    
    let results = Test.getSync({ type : 'test' });

    const stop = +new Date();
    const time = (stop - start);
    const count = results.length;

    console.log('getting  items complete: %s items in %s ms, %s op/s, %s ms/op', count, time, ((count / time) * 1000).toFixed(2), (time / count).toFixed(2));

    updateItems(results);
}

function updateItems(items) {
    const start = +new Date();
    let count = 0;

    for (const item of items) {
        Test.updateSync(item);
        count += 1;
    }
    
    const stop = +new Date();

    const time = (stop - start);

    console.log('updating items complete: %s items in %s ms, %s op/s, %s ms/op ', count, time, ((count / time) * 1000).toFixed(2), (time / count).toFixed(2));

    delItems(items);
}

function delItems(items) {
    const start = +new Date();
    let count = 0;

    for (const item of items) {
        Test.delSync(item);

        count += 1;
    }
    
    const stop = +new Date();
    const time = (stop - start);

    console.log('deleting items complete: %s items in %s ms, %s op/s, %s ms/op ', count, time, ((count / time) * 1000).toFixed(2), (time / count).toFixed(2));
}