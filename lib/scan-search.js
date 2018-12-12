var SymDbComparison = require('./compare');
var path = require('path');
var each = require('dank-each');
var getValue = require('get-value');

module.exports = ScanSearch;

function ScanSearch(model, search, cb) {
    //if there are no search keys, then we should be loading everything
    var loadAll = !Object.keys(search).length;
    var found = [];
    var results = [];

    var p = model.getPath('store-path');

    return model.db.readdir(p, function (err, ids) {
        ids = ids || [];

        found.push(ids);
        ids = ids.map(function (f) { 
            return path.basename(f, '.json')
        });

        load(ids);
    });

    function load (matches) {
        var count = 0;

        if (!matches.length) {
            return cb(null, results);
        }

        matches.forEach(function (match) {
            var p = model.getPath('store', { _id : match });

            model.db.readJSON(p, function (err, obj) {
                //TODO: handle err?
                count += 1;

                if (loadAll || check(obj)) {
                    results.push(obj);
                }

                if (count === matches.length) {
                    return cb(null, results)
                }
            });
        });
    }

    function check(obj) {
        var result = true;
        
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