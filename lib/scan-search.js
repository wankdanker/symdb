const SymDbComparison = require('./compare');
const path = require('path');
const each = require('dank-each');
const getValue = require('get-value');

module.exports = ScanSearch;

function ScanSearch(model, search, cb) {
    ScanSearch.async(model, search).then(function (results) {
        return cb(null, results);
    }).catch(cb);
}

ScanSearch.async = async function async(model, search, cb) {
    //if there are no search keys, then we should be loading everything
    const loadAll = !Object.keys(search).length;
    const found = [];
    const results = [];

    const p = model.getPath('store-path');

    let ids;
    try {
        ids = await model.db.readdir(p);
    }
    catch (e) {
        //TODO: do we care if this is anything but e.code === 'ENOENT'?
    }

    ids = ids || [];

    found.push(ids);

    ids = ids.map(function (f) { 
        return path.basename(f, '.json')
    });

    let matches = ids;

    if (!matches.length) {
        return results;
    }

    //load the matches
    for (const match of matches) {
        const p = model.getPath('store', { _id : match });
        let obj;
        
        try {
            obj = await model.db.readJson(p);
        }
        catch (err) {
            //TODO: handle err?
        }

        if (loadAll || check(obj)) {
            results.push(obj);
        }
    }

    return results;

    function check(obj) {
        let result = true;
        
        each(search, function (key, val, end) {
            if (val instanceof SymDbComparison) {
                if (!val.compare(getValue(obj, key))) {
                    result = false;

                    return end();
                }

                //move on to the next check
                return;
            }

            //force val to a string <- that's wrong, why did I write that?
            if (val != getValue(obj, key)) {
                result = false;

                return end();
            }
        });

        return result;
    }
}

ScanSearch.sync = function sync(model, search) {
    //if there are no search keys, then we should be loading everything
    const loadAll = !Object.keys(search).length;
    const found = [];
    const results = [];

    const p = model.getPath('store-path');

    let ids;
    try {
        ids = model.db.readdirSync(p);
    }
    catch (e) {
        //TODO: do we care if this is anything but e.code === 'ENOENT'?
    }
    ids = ids || [];

    found.push(ids);

    ids = ids.map(function (f) { 
        return path.basename(f, '.json')
    });

    let matches = ids;

    if (!matches.length) {
        return results;
    }

    //load the matches
    for (const match of matches) {
        const p = model.getPath('store', { _id : match });
        let obj;
        
        try {
            obj = model.db.readJsonSync(p);
        }
        catch (err) {
            //TODO: handle err?
        }

        if (loadAll || check(obj)) {
            results.push(obj);
        }
    }
    
    return results;

    function check(obj) {
        let result = true;
        
        each(search, function (key, val, end) {
            if (val instanceof SymDbComparison) {
                if (!val.compare(getValue(obj, key))) {
                    result = false;

                    return end();
                }

                //move on to the next check
                return;
            }

            //force val to a string <- that's wrong, why did I write that?
            if (val != getValue(obj, key)) {
                result = false;

                return end();
            }
        });

        return result;
    }
}