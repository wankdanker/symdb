const SymDbComparison = require('./compare');
const path = require('path');
const each = require('dank-each');
const getValue = require('get-value');

module.exports = ScanSearch;

function ScanSearch(model, search, cb) {
    //if there are no search keys, then we should be loading everything
    const loadAll = !Object.keys(search).length;
    const found = [];
    const results = [];

    const p = model.getPath('store-path');

    return model.db.readdir(p, function (err, ids) {
        ids = ids || [];

        found.push(ids);
        ids = ids.map(function (f) { 
            return path.basename(f, '.json')
        });

        load(ids);
    });

    function load (matches) {
        let count = 0;

        if (!matches.length) {
            return cb(null, results);
        }

        for (const match of matches) {
            const p = model.getPath('store', { _id : match });

            model.db.readJson(p, function (err, obj) {
                //TODO: handle err?
                count += 1;

                if (loadAll || check(obj)) {
                    results.push(obj);
                }

                if (count === matches.length) {
                    return cb(null, results)
                }
            });
        }
    }

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