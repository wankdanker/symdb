var SymDbComparison = require('./compare');
var path = require('path');
var intersect = require('fast_array_intersect').default;
var doWhile = require('dank-do-while');

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
        var x = 0;
        var results = [];

        if (!matches.length) {
            return cb(null, results);
        }

        doWhile(function (next) {
            const match = matches[x++];

            if (!match) {
                return next(false);
            }

            var p = model.getPath('store', { _id : match });

            model.db.readJson(p, function (err, obj) {
                //TODO: handle err?

                if (obj) {
                    results.push(obj);
                }

                return next(true);
            });
        }, function () {
            return cb(null, results)
        }, 4);
    }
}

IndexSearch.async = async function async(model, search) {
    const directories = [];
    const found = [];
    const comparisons = [];
    const results = [];
    const lookups = Object.keys(search);
    const indexes = lookups.filter(function (key) {
        const val = search[key];
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

        // return loadDirectories();
    }
    else {
        //for each indexed field, get a list of the directories we should load
        for (const index of indexes) {
            const val = search[index];
            let p = '';

            if (val instanceof SymDbComparison) {
                p = model.getPath('index-path', null, index);
                
                let dirs
                
                try {
                    dirs = await model.db.readdir(p);
                }
                catch (err) {
                    //TODO: only ignore path not found errors
                }
                
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
            }
            else {

                //force val to a string
                val = String(val);

                //push the directory for the exact lookup
                directories.push(model.getPath('index-val-path', null, index, val));
            }
        }
    }

    if (!directories.length) {
        return results;
    }

    for (const dir of directories) {
        if (Array.isArray(dir)) {
            let dirs;
            try {
                dirs = await model.db.readdirs(dir);
            }
            catch (err) {
                //TODO: ignore only path not found errors?
            }

            let ids = [].concat.apply([], dirs);

            ids = ids.map(function (f) { 
                return path.basename(f, '.json')
            });

            found.push(ids);
        }
        else {
            let ids
            try {
                ids = await model.db.readdir(dir);
            }
            catch (err) {
                //TODO: ignore only path not found errors?
            }

            ids = ids || [];

            ids = ids.map(function (f) { 
                return path.basename(f, '.json')
            });

            found.push(ids);
        }
    }
    
    let matches = intersect(found);

    if (!matches.length) {
        return results;
    }

    for (const match of matches) {
        const p = model.getPath('store', { _id : match });

        const obj = await model.db.readJson(p);
        //TODO: handle err?

        if (obj) {
            results.push(obj);
        }
    }

    return results;
}

IndexSearch.sync = function sync(model, search) {
    const directories = [];
    const found = [];
    const comparisons = [];
    const results = [];
    const lookups = Object.keys(search);
    const indexes = lookups.filter(function (key) {
        const val = search[key];
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

        // return loadDirectories();
    }
    else {
        //for each indexed field, get a list of the directories we should load
        for (const index of indexes) {
            const val = search[index];
            let p = '';

            if (val instanceof SymDbComparison) {
                p = model.getPath('index-path', null, index);
                
                let dirs
                
                try {
                    dirs = model.db.readdirSync(p);
                }
                catch (err) {
                    //TODO: only ignore path not found errors
                }
                
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
            }
            else {

                //force val to a string
                val = String(val);

                //push the directory for the exact lookup
                directories.push(model.getPath('index-val-path', null, index, val));
            }
        }
    }

    if (!directories.length) {
        return results;
    }

    for (const dir of directories) {
        if (Array.isArray(dir)) {
            let dirs;
            try {
                dirs = model.db.readdirsSync(dir);
            }
            catch (err) {
                //TODO: ignore only path not found errors?
            }

            let ids = [].concat.apply([], dirs);

            ids = ids.map(function (f) { 
                return path.basename(f, '.json')
            });

            found.push(ids);
        }
        else {
            let ids
            try {
                ids = model.db.readdirSync(dir);
            }
            catch (err) {
                //TODO: ignore only path not found errors?
            }

            ids = ids || [];

            ids = ids.map(function (f) { 
                return path.basename(f, '.json')
            });

            found.push(ids);
        }
    }
    
    let matches = intersect(found);

    if (!matches.length) {
        return results;
    }

    for (const match of matches) {
        const p = model.getPath('store', { _id : match });

        const obj = model.db.readJsonSync(p);
        //TODO: handle err?

        if (obj) {
            results.push(obj);
        }
    }

    return results;
}
