var SymDbComparison = require('./compare');
var path = require('path');
var intersect = require('fast_array_intersect').default;

module.exports = IndexSearch;

function IndexSearch(model, search, cb) {
    var directories = [];
    var found = [];
    var comparisons = [];
    var lookups = Object.keys(search);
    var indexes = lookups.filter(function (key) {
        var val = search[key];
        if (val == undefined || val == null) {
            return false;
        }

        //check to see if val is a SymDbComparison
        if (val instanceof SymDbComparison) {
            //add this comparison to the comparisons array
            comparisons.push(val);
        }

        return model.schema[key];
    });

    //if there are no SymDbComparisons, then we are doing direct
    //index lookups. So, we don't need to load all of the directories
    //within the index. We just need to load the directory referenced 
    //by the values
    // * this is an optimization
    // * it would be nice if we could combine this optimization along
    //   with the SymDbComparisons
    if (!comparisons.length) {
        indexes.forEach(function (index) {
            var val = search[index];
            var p = model.getPath('index-val-path', null, index, val);

            directories.push([p]);
        });

        return loadDirectories();
    }

    //for each indexed field, get a list of the directories we should load
    indexes.forEach(function (index) {
        var val = search[index];
        var p = '';

        if (val instanceof SymDbComparison) {
            p = model.getPath('index-path', null, index);
            
            return model.db.readdir(p, function (err, dirs) {
                dirs = dirs || [];

                //find which index directories match the search
                dirs = dirs.filter(function (a) { 
                    //force a to the data type identified by the schema
                    a = model.schema[index](a);
                    
                    return val.compare(a);
                }).map(function (dir) {
                    return model.getPath('index-val-path', null, index, dir);
                });

                directories.push(dirs);

                return checkDirectories();
            });
        }

        //force val to a string
        val = String(val);

        //push the directory for the exact lookup
        directories.push(model.getPath('index-val-path', null, index, val));
       
        checkDirectories();
    });

    function checkDirectories() {
        if (directories.length === indexes.length) {
            return loadDirectories();
        }
    }

    function loadDirectories() {
        if (!directories.length) {
            return cb(null, []);
        }

        directories.forEach(function (dir) {
            if (Array.isArray(dir)) {
                model.db.readdirs(dir, function (err, dirs) {
                    var ids = [].concat.apply([], dirs);

                    ids = ids.map(function (f) { 
                        return path.basename(f, '.json')
                    });

                    found.push(ids);

                    check();
                });
            }
            else {
                model.db.readdir(dir, function (err, ids) {
                    ids = ids || [];

                    ids = ids.map(function (f) { 
                        return path.basename(f, '.json')
                    });

                    found.push(ids);

                    check();
                });
            }
        });
    }

    function check () {
        if (found.length === directories.length) {
            var matches = intersect(found);
            
            if (!matches.length) {
                return cb(null, []);
            }

            return load(matches);
        }
    }

    function load (matches) {
        var count = 0;
        var results = [];

        if (!matches.length) {
            return cb(null, results);
        }

        matches.forEach(function (match) {
            var p = model.getPath('store', { _id : match });

            model.db.readJson(p, function (err, obj) {
                //TODO: handle err?
                count += 1;

                if (obj) {
                    results.push(obj);
                }

                if (count === matches.length) {
                    return cb(null, results)
                }
            });
        });
    }
}
