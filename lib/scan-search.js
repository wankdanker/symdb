var SymDbComparision = require('./compare');
var path = require('path');
var each = require('dank-each');

module.exports = ScanSearch;

function ScanSearch(model, search, cb) {
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

                if (check(obj)) {
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
            if (val instanceof SymDbComparision) {
                if (!val.compare(obj[key])) {
                    result = false;

                    return end();
                }

                //move on to the next check
                return;
            }

            //force val to a string
            if (val != obj[key]) {
                result = false;

                return end();
            }
        });

        return result;
    }
}