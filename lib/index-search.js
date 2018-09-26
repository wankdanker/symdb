var SymDbComparision = require('./compare');
var path = require('path');
var intersect = require('intersect');

module.exports = IndexSearch;

function IndexSearch(model, search, cb) {
    var directories = [];
    var found = [];

    var lookups = Object.keys(search);
    var indexes = lookups.filter(function (key) {
        return model.schema[key];
    });

    //else, for each indexed field, get a list of the directories we should load
    indexes.forEach(function (index) {
        var val = search[index];
        var p = '';

        if (val instanceof SymDbComparision) {
            p = model.getPath('index-path', null, index);
            
            return model.db.readdir(p, function (err, dirs) {
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
        directories = [].concat.apply([], directories);

        if (!directories.length) {
            return cb(null, []);
        }

        directories.forEach(function (dir) {
            model.db.readdir(dir, function (err, ids) {
                ids = ids.map(function (f) { 
                    return path.basename(f, '.json')
                });

                found.push(ids);

                check();
            });
        });
    }

    function check () {
        if (found.length === directories.length) {
            //filter out empty arrays
            found = found.filter(function (dir) { return dir.length });
            
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

            model.db.readJSON(p, function (err, obj) {
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