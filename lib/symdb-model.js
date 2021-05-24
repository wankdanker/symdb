var path = require('path');
var getValue = require('get-value');
var doWhile = require('dank-do-while');
var EventPipeline = require('event-pipeline');
var inherits = require('util').inherits;
var noop = function () {};
var IndexSearch = require('./index-search');
var ScanSearch = require('./scan-search');
var Promised = require('./promise');
var page = require('array-page');
var sort = require('./sort');

module.exports = SymDbModel;

/**
 * Create a new SymDBModel instance
 *
 * @param {SymDB} db - an instance of a SymDB
 * @param {String} name - the name of the model/collection
 * @param {Object} schema - the schema for the model/collection
 */
function SymDbModel (db, name, schema) {
    const self = this;

    EventPipeline.call(self);

    self.db = db;
    self.name = name;
    self.schema = schema;

    self.root = path.join(self.db.root, self.name);
}

inherits(SymDbModel, EventPipeline);

/**
 * Get a path for an object/symlink relationship
 *
 * @param {*} type
 * @param {*} obj
 * @param {*} index
 * @param {*} val
 * @returns
 */
SymDbModel.prototype.getPath = function (type, obj, index, val) {
    const self = this;

    //force val to a string because path.join doesn't work on numbers
    //TODO: should this be handled somewhere else? like before getPath is called?
    val = String(val);

    switch (type) {
        case 'store' :
            return path.join(self.root, 'store', obj._id + '.json');
        case 'store-path' :
            return path.join(self.root, 'store');
        case 'link-target' :
            return path.join('../', '../', '../', 'store', obj._id + '.json');
        case 'symlink' :
            return path.join(self.root, 'index', index, val, obj._id);
        case 'symlink-relative' :
            return path.join('./', self.name, 'index', index, val, obj._id);
        case 'index-links' :
            return path.join(self.root, 'index-links', obj._id + '.json');
        case 'index-val-path' :
            return path.join(self.root, 'index', index, val);
        case 'index-path' :
            return path.join(self.root, 'index', index);
        case 'blob-object-key' :
            return path.join(self.root, 'blob', obj._id, index);
        case 'blob-object-dir' :
            return path.join(self.root, 'blob', obj._id);
        case 'blob-dir' :
            return path.join(self.root, 'blob');
    }
}

/**
 * Save an object.
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.save = function (obj, context, cb) {
    const self = this;

    //set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
        cb = context;
        context = {};
    }

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.save, obj, context);
    }

    cb = cb || noop;

    obj._id = obj._id || self.id();

    //make sure that obj is the data element on the context object
    context.data = obj;
    context.model = self;

    return self.emit('save:before', context, function (err) {
        if (err) {
            return cb(err);
        }

        return self.write(obj, function (err) {
            if (err) {
                return cb(err);
             }

             return self.emit('save:after', context, function (err) {
                 return cb(err, obj);
             });
        });
    });
};

/**
 * Save an object synchronously
 *
 * @param {*} obj
 * @returns
 */
SymDbModel.prototype.saveSync = function (obj, context) {
    const self = this;

    //set up a default context if it does not exist
    if (context === undefined) {
        context = {};
    }

    obj._id = obj._id || self.id();

    //make sure that obj is the data element on the context object
    context.data = obj;
    context.model = self;

    self.emit('save-sync:before', context);
    self.writeSync(obj);
    self.emit('save-sync:after', context);

    return obj;
};

/**
 * Write an object.
 * 
 * You might actually want to use save.
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.write = function (obj, cb) {
    const self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.write, obj);
    }

    cb = cb || noop;

    var file = self.getPath('store', obj);

    return self.db.writeJson(file, obj, function (err) {
        if (err) {
            return cb(err);
        }

        return self.index(obj, cb);
    });
}

/**
 * Write an object synchronously.
 * 
 * You might actually want to use saveSync instead.
 *
 * @param {*} obj
 * @returns
 */
SymDbModel.prototype.writeSync = function (obj) {
    const self = this;
    const file = self.getPath('store', obj);

    self.db.writeJsonSync(file, obj);

    return self.indexSync(obj);
}

/**
 * Generate a unique id
 *
 * @returns
 */
SymDbModel.prototype.id = function () {
    const self = this;

    return self.db.id();
};

/**
 * Create the index links for this object based on schema
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.index = function (obj, cb) {
    const self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.index, obj);
    }

    var links = [];

    var keys = Object.keys(self.schema);

    keys.push('_id');

    var target = self.getPath('link-target', obj);

    doWhile(function (next) {
        var key = keys.shift();

        if (!key) {
            return next(false);
        }

        //TODO: maybe regex test if the key contains \. to see if it's really deep
        //not sure if getValue is optimized in this way.
        var val = getValue(obj, key);

        //if val is an array, then we should index each value in the array
        if (Array.isArray(val) && val.length) {
            //create a hash table for unique values indexed
            //if we try to create multiple indexes for the same val
            //then we get errors.
            var unique = {};

            return Promise.all(val.map(function (item) {
                if (unique[item]) {
                    //keep track of the number of times this val occurs
                    //may be useful later for weighting things
                    unique[item] += 1;
                    
                    return;
                }

                unique[item] = 1;

                var link = self.getPath('symlink', obj, key, item);
                var linkRelative = self.getPath('symlink-relative', obj, key, item);

                links.push(linkRelative);

                return self.db.linkFile(target, link);
            })).then(function () {
                return next(true);
            }).catch(function (err) {
                if (err.code === 'EEXIST') {
                    return next(true);
                }

                return cb(err);
            });
        }

        var link = self.getPath('symlink', obj, key, val);
        var linkRelative = self.getPath('symlink-relative', obj, key, val);

        links.push(linkRelative);

        self.db.linkFile(target, link, function (err) {
            if (err && err.code !== 'EEXIST') {
                return cb(err);
            }

            return next(true);
        })
    }, function () {
        var p = self.getPath('index-links', obj);

        self.db.writeJson(p, links, cb);
    });
};

/**
 * Create the index links for this object based on schema
 *
 * @param {*} obj
 * @returns
 */
SymDbModel.prototype.indexSync = function (obj) {
    const self = this;
    const links = [];
    const keys = Object.keys(self.schema);

    keys.push('_id');

    const target = self.getPath('link-target', obj);

    for (const key of keys) {
        //TODO: maybe regex test if the key contains \. to see if it's really deep
        //not sure if getValue is optimized in this way.
        const val = getValue(obj, key);

        //if val is an array, then we should index each value in the array
        if (Array.isArray(val) && val.length) {
            //create a hash table for unique values indexed
            //if we try to create multiple indexes for the same val
            //then we get errors.
            const unique = {};

            for (const item of val) {
                if (unique[item]) {
                    //keep track of the number of times this val occurs
                    //may be useful later for weighting things
                    unique[item] += 1;
                    
                    continue;
                }

                unique[item] = 1;

                const link = self.getPath('symlink', obj, key, item);
                const linkRelative = self.getPath('symlink-relative', obj, key, item);

                links.push(linkRelative);

                self.db.linkFileSync(target, link);
            }
        }
        else {
            const link = self.getPath('symlink', obj, key, val);
            const linkRelative = self.getPath('symlink-relative', obj, key, val);

            links.push(linkRelative);
    
            self.db.linkFileSync(target, link);
        }
    }

    const p = self.getPath('index-links', obj);

    self.db.writeJsonSync(p, links);
 };

/**
 * Add a new object and index it
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.add = function (obj, context, cb) {
    const self = this;

    //set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
        cb = context;
        context = {};
    }

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.add, obj, context);
    }

    cb = cb || noop;

    //make sure that obj is the data element on the context object
    context.data = obj;
    context.model = self;

    return self.emit('add:before', context, function (err) {
        if (err) {
            return cb(err);
        }

        return self.save(obj, context, function (err) {
            if (err) {
                return cb(err);
            }

            return self.emit('add:after', context, function (err) {
                if (err) {
                    return cb(err);
                }

                return cb(null, obj);
            });
        });
    });
}


/**
 * Add a new object and index it synchronously
 *
 * @param {*} obj
 * @returns
 */
SymDbModel.prototype.addSync = function (obj, context) {
    const self = this;

    //set up a default context if it does not exist
    if (context === undefined) {
        context = {};
    }

    //make sure that obj is the data element on the context object
    context.data = obj;
    context.model = self;

    self.emit('add-sync:before', context);
    self.saveSync(obj, context);
    self.emit('add-sync:after', context);
        
    return obj;
}

/**
 * Update an existing object by modifying indexes and resaving the object
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.update = function (obj, context, cb) {
    const self = this;

    //set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
        cb = context;
        context = {};
    }

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.update, obj, context);
    }

    cb = cb || noop;

    //make sure that obj is the data element on the context object
    context.data = obj;
    context.model = self;
    
    return self.emit('update:before', context, function (err) {
        if (err) {
            return cb(err);
        }

        self.delIndexes(obj).then(function (result) {
            return self.save(obj, context);
        }).then(function (result) {
            context.result = context;

            return self.emit('update:after', context, function (err) {
                if (err) {
                    return cb(err);
                }

                return cb(null, result);
            });
        }).catch(function (err) {
            return cb (err);
        });
    });
}

/**
 * Update an existing object by modifying indexes and resaving the object synchronously
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.updateSync = function (obj, context) {
    const self = this;

    //set up a default context if it does not exist
    if (context === undefined) {
        context = {};
    }

    //make sure that obj is the data element on the context object
    context.data = obj;
    context.model = self;
    
    self.emit('update-sync:before', context);
    self.delIndexesSync(obj);
    context.result = self.saveSync(obj, context);
    self.emit('update-sync:after', context);
    
    return context.result;
}

/**
 * Set the page size
 * 
 * @note this must be called right before .sort() or .get()
 *
 * @param {*} page
 * @param {*} size
 * @returns
 */
SymDbModel.prototype.page = function (page, size) {
    const self = this;

    self.paging = { page : page, size : size };

    return self;
};

/**
 * Set the sort order
 * 
 * @note this must be called right before .page() or .get()
 * 
 * @param {*} sorts
 * @returns
 */
SymDbModel.prototype.sort = function (sorts) {
    const self = this;

    self.sorting = sorts;

    return self;
};

/**
 * Get an object from the collection
 *
 * @param {*} lookup
 * @param {*} cb
 * @returns 
 */
SymDbModel.prototype.get = function (lookup, context, cb) {
    const self = this;

    if (typeof lookup === 'function') {
        cb = lookup;
        lookup = {};
    }

    if (!lookup) {
        lookup = {};
    }

    //set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
        cb = context;
        context = {};
    }

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.get, lookup, context);
    }

    var paging = self.paging;
    var sorting = self.sorting;
    //clear the paging object so it doesn't interfere with future calls
    delete self.paging;
    delete self.sorting;

    cb = cb || noop;

    //set the lookup on the context object
    context.lookup = lookup;
    context.model = self;

    self.emit('get:before', context, function (err) {
        if (err) {
            return cb(err);
        }

        //if lookup contains indexed fields then we should use those
        //to find data in the index
        var lookups = Object.keys(lookup);
        var indexes = lookups.filter(function (key) {
            return self.schema[key];
        });

        //if all of the lookups are on indexed fields then we can do an
        //index search
        if (indexes.length && indexes.length === lookups.length) {
            IndexSearch(self, lookup, done);
        }
        else {
            ScanSearch(self, lookup, done);
        }
    });

    function done(err, results) {
        if (sorting) {
            results = sort(results, sorting);
        }

        if (paging) {
            results = page(results, paging.page, paging.size);
        }

        context.results = results

        self.emit('get:after', context, function (err) {
            if (err) {
                return cb(err);
            }

            return cb(null, results);
        });
    }
};

/**
 * Get an object from the collection synchronously
 *
 * @param {*} lookup
 * @returns 
 */
SymDbModel.prototype.getSync = function (lookup, context) {
    const self = this;
    let results; 

    if (!lookup) {
        lookup = {};
    }

    //set up a default context if it does not exist
    if (context === undefined) {
        context = {};
    }

    let paging = self.paging;
    let sorting = self.sorting;
    //clear the paging object so it doesn't interfere with future calls
    delete self.paging;
    delete self.sorting;

    //set the lookup on the context object
    context.lookup = lookup;
    context.model = self;

    self.emit('get-sync:before', context);
        
    //if lookup contains indexed fields then we should use those
    //to find data in the index
    let lookups = Object.keys(lookup);
    let indexes = lookups.filter(function (key) {
        return self.schema[key];
    });

    //if all of the lookups are on indexed fields then we can do an
    //index search
    if (indexes.length && indexes.length === lookups.length) {
        results = IndexSearch.sync(self, lookup);
    }
    else {
        results = ScanSearch.sync(self, lookup);
    }
   
    if (sorting) {
        results = sort(results, sorting);
    }

    if (paging) {
        results = page(results, paging.page, paging.size);
    }

    context.results = results

    self.emit('get-sync:after', context);
    
    return results;
};

/**
 * Delete an object from the collection
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.del = function (obj, context, cb) {
    const self = this;

    //set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
        cb = context;
        context = {};
    }

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.del, obj, context);
    }

    cb = cb || noop;

    //make sure that obj is the data element on the context object
    context.data = obj;
    context.model = self;

    return self.emit('delete:before', context, function (err) {
        if (err) {
            return cb(err);
        }

        return self.delIndexes(obj, function (err) {
            //TODO: do we care if we could not delete indexes?

            var p1 = self.getPath('store', obj);

            //delete the json file
            return self.db.delFile(p1, function (err) {
                if (err) {
                    return cb(err);
                }

                return self.emit('delete:after', context, function (err) {
                    return cb(err, obj);
                });
            });
        });
    });
};

/**
 * Delete an object from the collection synchronously
 *
 * @param {*} obj
 * @returns
 */
SymDbModel.prototype.delSync = function (obj, context) {
    const self = this;

    //set up a default context if it does not exist
    if (context === undefined) {
        context = {};
    }

    //make sure that obj is the data element on the context object
    context.data = obj;
    context.model = self;

    self.emit('delete-sync:before', context);

    try {
        self.delIndexesSync(obj);
    }
    catch (err) {
        //TODO: do we care if we could not delete indexes?
    }

    const p1 = self.getPath('store', obj);

    //delete the json file
    self.db.delFileSync(p1);
    self.emit('delete:after', context);

    return obj;
};

/**
 * Delete an object's indexes
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.delIndexes = function (obj, cb) {
    const self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.delIndexes, obj);
    }

    cb = cb || noop;

    var p1 = self.getPath('index-links', obj);

    self.db.readJson(p1, function (err, links) {
        if (err && err.code !== 'ENOENT') {
            //only call back with error if the error
            //is something other than file not found
            return cb(err);
        }

        var count = 0;

        links = links || [];
        links.push(p1);

        links.forEach(function (link) {
            self.db.delFile(link, function (err) {
                if (err && err.code === 'ENOENT') {
                    //deleting a file that is already gone 
                    //should not be a problem.
                    err = null;
                }

                count += 1;

                if (count === links.length) {
                    return cb(err, obj);
                }
            });
        });
    });
};


/**
 * Delete an object's indexes synchronously
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.delIndexesSync = function (obj) {
    const self = this;
    const p1 = self.getPath('index-links', obj);

    let links = self.db.readJsonSync(p1);

    links = links || [];
    links.push(p1);

    for (const link of links) {
        try {
            self.db.delFileSync(link);
        }
        catch (e) {
            //TODO: do we care about this?
        }
    }

    return obj;
};

/**
 * Delete and add an objects indexes
 *
 * @param {*} lookup
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.reindex = function (lookup, cb) {
    const self = this;

    if (typeof lookup === 'function') {
        cb = lookup;
        lookup = {};
    }

    if (!lookup) {
        lookup = {};
    }

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.reindex, lookup);
    }

    cb = cb || noop;

    return self.get(lookup, function (err, objects) {
        if (err) {
            return cb(err);
        }

        doWhile(function (next) {
            var obj = objects.shift();

            if (!obj) {
                return next(false);
            }

            return self.delIndexes(obj).then(function () {
                    return self.index(obj);
                }).then(function () {
                    return next(true);
                }).catch(function (err) {
                    return cb(err);
                });
        }, function done () {
            //TODO: what do we want to return here? number of reindexed objects? true/false?
            return cb();
        });
    });
};

/**
 * Delete and add an objects indexes synchronously
 *
 * @param {*} lookup
 * @returns
 */
SymDbModel.prototype.reindexSync = function (lookup) {
    const self = this;

    if (!lookup) {
        lookup = {};
    }

    const objects = self.getSync(lookup);

    for (const obj of objects) {
        self.delIndexesSync(obj);
        self.index(obj);
    }

    return true;
};
