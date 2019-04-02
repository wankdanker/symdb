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
    var self = this;

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
    var self = this;

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
        case 'index-links' :
            return path.join(self.root, 'index-links', obj._id + '.json');
        case 'index-val-path' :
            return path.join(self.root, 'index', index, val);
        case 'index-path' :
            return path.join(self.root, 'index', index);
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
    var self = this;

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
 * Write an object.
 * 
 * You might actually want to use save.
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.write = function (obj, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.write, obj);
    }

    cb = cb || noop;

    var file = self.getPath('store', obj);

    return self.db.writeJSON(file, obj, function (err) {
        if (err) {
            return cb(err);
        }

        return self.index(obj, cb);
    });
}

/**
 * Generate a unique id
 *
 * @returns
 */
SymDbModel.prototype.id = function () {
    var self = this;

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
    var self = this;

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

        //don't index undefined things, right?
        if (val === undefined) {
            return next(true);
        }

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

                links.push(link);

                return self.db.linkFile(target, link);
            })).then(function () {
                return next(true);
            }).catch(function (err) {
                 return cb(err);
            });
        }

        var link = self.getPath('symlink', obj, key, val);

        links.push(link);

        self.db.linkFile(target, link, function (err) {
            if (err) {
                return cb(err);
            }

            return next(true);
        })
    }, function () {
        var p = self.getPath('index-links', obj);

        self.db.writeJSON(p, links, cb);
    });
};

/**
 * Add a new object and index it
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.add = function (obj, context, cb) {
    var self = this;

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
 * Update an existing object by modifying indexes and resaving the object
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.update = function (obj, context, cb) {
    var self = this;

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
 * Set the page size
 * 
 * @note this must be called right before .sort() or .get()
 *
 * @param {*} page
 * @param {*} size
 * @returns
 */
SymDbModel.prototype.page = function (page, size) {
    var self = this;

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
    var self = this;

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
    var self = this;

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
 * Delete an object from the collection
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.del = function (obj, context, cb) {
    var self = this;

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
 * Delete an object's indexes
 *
 * @param {*} obj
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.delIndexes = function (obj, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.delIndexes, obj);
    }

    cb = cb || noop;

    var p1 = self.getPath('index-links', obj);

    self.db.readJSON(p1, function (err, links) {
        if (err) {
            return cb(err);
        }

        var count = 0;

        links = links || [];
        links.push(p1);

        links.forEach(function (link) {
            self.db.delFile(link, function (err) {
                //TODO: do we care about err?
                count += 1;

                if (count === links.length) {
                    return cb(err, obj);
                }
            });
        });
    });
};

/**
 * Delete and add an objects indexes
 *
 * @param {*} lookup
 * @param {*} cb
 * @returns
 */
SymDbModel.prototype.reindex = function (lookup, cb) {
    var self = this;

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