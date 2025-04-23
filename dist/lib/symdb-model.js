"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymDbModel = void 0;
const path = __importStar(require("path"));
const getValue = __importStar(require("get-value"));
const doWhile = __importStar(require("dank-do-while"));
const event_pipeline_1 = require("event-pipeline");
const index_search_1 = require("./index-search");
const scan_search_1 = require("./scan-search");
const promise_1 = require("./promise");
const array_page_1 = require("array-page");
const sort_1 = require("./sort");
const noop = function () { };
class SymDbModel extends event_pipeline_1.EventPipeline {
    constructor(db, name, schema) {
        super();
        this.db = db;
        this.name = name;
        this.schema = schema;
        this.root = path.join(this.db.root, this.name);
    }
    /**
     * Get a path for an object/symlink relationship
     */
    getPath(type, obj, index, val) {
        // force val to a string because path.join doesn't work on numbers
        if (val !== undefined) {
            val = String(val);
        }
        switch (type) {
            case 'store':
                return path.join(this.root, 'store', obj._id + '.json');
            case 'store-path':
                return path.join(this.root, 'store');
            case 'link-target':
                return path.join('../', '../', '../', 'store', obj._id + '.json');
            case 'symlink':
                return path.join(this.root, 'index', index, val, obj._id);
            case 'symlink-relative':
                return path.join('./', this.name, 'index', index, val, obj._id);
            case 'index-links':
                return path.join(this.root, 'index-links', obj._id + '.json');
            case 'index-val-path':
                return path.join(this.root, 'index', index, val);
            case 'index-path':
                return path.join(this.root, 'index', index);
            case 'blob-object-key':
                return path.join(this.root, 'blob', obj._id, index);
            case 'blob-object-dir':
                return path.join(this.root, 'blob', obj._id);
            case 'blob-dir':
                return path.join(this.root, 'blob');
            default:
                throw new Error(`Unknown path type: ${type}`);
        }
    }
    /**
     * Save an object.
     */
    save(obj, context, cb) {
        // set up a default context if it does not exist
        if (context === undefined || typeof context === 'function') {
            cb = context;
            context = {};
        }
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.save, obj, context);
        }
        cb = cb || noop;
        obj._id = obj._id || this.id();
        // make sure that obj is the data element on the context object
        context.data = obj;
        context.model = this;
        return this.emit('save:before', context, (err) => {
            if (err) {
                return cb(err);
            }
            return this.write(obj, (err) => {
                if (err) {
                    return cb(err);
                }
                return this.emit('save:after', context, (err) => {
                    return cb(err, obj);
                });
            });
        });
    }
    /**
     * Save an object synchronously
     */
    saveSync(obj, context) {
        // set up a default context if it does not exist
        if (context === undefined) {
            context = {};
        }
        obj._id = obj._id || this.id();
        // make sure that obj is the data element on the context object
        context.data = obj;
        context.model = this;
        this.emit('save-sync:before', context);
        this.writeSync(obj);
        this.emit('save-sync:after', context);
        return obj;
    }
    /**
     * Write an object.
     * You might actually want to use save.
     */
    write(obj, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.write, obj);
        }
        cb = cb || noop;
        const file = this.getPath('store', obj);
        return this.db.writeJson(file, obj, (err) => {
            if (err) {
                return cb(err);
            }
            return this.index(obj, cb);
        });
    }
    /**
     * Write an object synchronously.
     * You might actually want to use saveSync instead.
     */
    writeSync(obj) {
        const file = this.getPath('store', obj);
        this.db.writeJsonSync(file, obj);
        this.indexSync(obj);
    }
    /**
     * Generate a unique id
     */
    id() {
        return this.db.id();
    }
    /**
     * Create the index links for this object based on schema
     */
    index(obj, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.index, obj);
        }
        const links = [];
        const keys = [...Object.keys(this.schema), '_id'];
        const target = this.getPath('link-target', obj);
        doWhile((next) => {
            const key = keys.shift();
            if (!key) {
                return next(false);
            }
            // Get value - may be deep in the object
            const val = getValue(obj, key);
            // If val is an array, then we should index each value in the array
            if (Array.isArray(val) && val.length) {
                // Create a hash table for unique values indexed
                // If we try to create multiple indexes for the same val
                // then we get errors
                const unique = {};
                return Promise.all(val.map((item) => {
                    if (unique[item]) {
                        // Keep track of the number of times this val occurs
                        // May be useful later for weighting things
                        unique[item] += 1;
                        return;
                    }
                    unique[item] = 1;
                    const link = this.getPath('symlink', obj, key, item);
                    const linkRelative = this.getPath('symlink-relative', obj, key, item);
                    links.push(linkRelative);
                    return this.db.linkFile(target, link);
                }))
                    .then(() => {
                    return next(true);
                })
                    .catch((err) => {
                    if (err.code === 'EEXIST') {
                        return next(true);
                    }
                    return cb(err);
                });
            }
            const link = this.getPath('symlink', obj, key, val);
            const linkRelative = this.getPath('symlink-relative', obj, key, val);
            links.push(linkRelative);
            this.db.linkFile(target, link, (err) => {
                if (err && err.code !== 'EEXIST') {
                    return cb(err);
                }
                return next(true);
            });
        }, () => {
            const p = this.getPath('index-links', obj);
            this.db.writeJson(p, links, cb);
        });
    }
    /**
     * Create the index links for this object based on schema
     */
    indexSync(obj) {
        const links = [];
        const keys = [...Object.keys(this.schema), '_id'];
        const target = this.getPath('link-target', obj);
        for (const key of keys) {
            // Get value - may be deep in the object
            const val = getValue(obj, key);
            // If val is an array, then we should index each value in the array
            if (Array.isArray(val) && val.length) {
                // Create a hash table for unique values indexed
                // If we try to create multiple indexes for the same val
                // then we get errors
                const unique = {};
                for (const item of val) {
                    if (unique[item]) {
                        // Keep track of the number of times this val occurs
                        // May be useful later for weighting things
                        unique[item] += 1;
                        continue;
                    }
                    unique[item] = 1;
                    const link = this.getPath('symlink', obj, key, item);
                    const linkRelative = this.getPath('symlink-relative', obj, key, item);
                    links.push(linkRelative);
                    try {
                        this.db.linkFileSync(target, link);
                    }
                    catch (err) {
                        // Ignore EEXIST errors
                        if (err.code !== 'EEXIST') {
                            throw err;
                        }
                    }
                }
            }
            else {
                const link = this.getPath('symlink', obj, key, val);
                const linkRelative = this.getPath('symlink-relative', obj, key, val);
                links.push(linkRelative);
                try {
                    this.db.linkFileSync(target, link);
                }
                catch (err) {
                    // Ignore EEXIST errors
                    if (err.code !== 'EEXIST') {
                        throw err;
                    }
                }
            }
        }
        const p = this.getPath('index-links', obj);
        this.db.writeJsonSync(p, links);
    }
    /**
     * Add a new object and index it
     */
    add(obj, context, cb) {
        // Set up a default context if it does not exist
        if (context === undefined || typeof context === 'function') {
            cb = context;
            context = {};
        }
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.add, obj, context);
        }
        cb = cb || noop;
        // Make sure that obj is the data element on the context object
        context.data = obj;
        context.model = this;
        return this.emit('add:before', context, (err) => {
            if (err) {
                return cb(err);
            }
            return this.save(obj, context, (err) => {
                if (err) {
                    return cb(err);
                }
                return this.emit('add:after', context, (err) => {
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
     */
    addSync(obj, context) {
        // Set up a default context if it does not exist
        if (context === undefined) {
            context = {};
        }
        // Make sure that obj is the data element on the context object
        context.data = obj;
        context.model = this;
        this.emit('add-sync:before', context);
        this.saveSync(obj, context);
        this.emit('add-sync:after', context);
        return obj;
    }
    /**
     * Update an existing object by modifying indexes and resaving the object
     */
    update(obj, context, cb) {
        // Set up a default context if it does not exist
        if (context === undefined || typeof context === 'function') {
            cb = context;
            context = {};
        }
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.update, obj, context);
        }
        cb = cb || noop;
        // Make sure that obj is the data element on the context object
        context.data = obj;
        context.model = this;
        return this.emit('update:before', context, (err) => {
            if (err) {
                return cb(err);
            }
            this.delIndexes(obj)
                .then(() => {
                return this.save(obj, context);
            })
                .then((result) => {
                context.result = context;
                return this.emit('update:after', context, (err) => {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, result);
                });
            })
                .catch((err) => {
                return cb(err);
            });
        });
    }
    /**
     * Update an existing object by modifying indexes and resaving the object synchronously
     */
    updateSync(obj, context) {
        // Set up a default context if it does not exist
        if (context === undefined) {
            context = {};
        }
        // Make sure that obj is the data element on the context object
        context.data = obj;
        context.model = this;
        this.emit('update-sync:before', context);
        this.delIndexesSync(obj);
        context.result = this.saveSync(obj, context);
        this.emit('update-sync:after', context);
        return context.result;
    }
    /**
     * Set the page size
     *
     * @note this must be called right before .sort() or .get()
     */
    page(page, size) {
        this.paging = { page, size };
        return this;
    }
    /**
     * Set the sort order
     *
     * @note this must be called right before .page() or .get()
     */
    sort(sorts) {
        this.sorting = sorts;
        return this;
    }
    /**
     * Get an object from the collection
     */
    get(lookup, context, cb) {
        if (typeof lookup === 'function') {
            cb = lookup;
            lookup = {};
        }
        if (!lookup) {
            lookup = {};
        }
        // Set up a default context if it does not exist
        if (context === undefined || typeof context === 'function') {
            cb = context;
            context = {};
        }
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.get, lookup, context);
        }
        const paging = this.paging;
        const sorting = this.sorting;
        // Clear the paging object so it doesn't interfere with future calls
        delete this.paging;
        delete this.sorting;
        cb = cb || noop;
        // Set the lookup on the context object
        context.lookup = lookup;
        context.model = this;
        const self = this;
        this.emit('get:before', context, (err) => {
            if (err) {
                return cb(err);
            }
            // If lookup contains indexed fields then we should use those
            // to find data in the index
            const lookups = Object.keys(lookup);
            const indexes = lookups.filter((key) => {
                return this.schema[key];
            });
            // If all of the lookups are on indexed fields then we can do an
            // index search
            if (indexes.length && indexes.length === lookups.length) {
                (0, index_search_1.IndexSearch)(this, lookup, done);
            }
            else {
                (0, scan_search_1.ScanSearch)(this, lookup, done);
            }
        });
        function done(err, results = []) {
            if (err) {
                return cb(err);
            }
            if (sorting) {
                results = (0, sort_1.sort)(results, sorting);
            }
            if (paging) {
                results = (0, array_page_1.page)(results, paging.page, paging.size);
            }
            context.results = results;
            self.emit('get:after', context, (err) => {
                if (err) {
                    return cb(err);
                }
                return cb(null, results);
            });
        }
    }
    /**
     * Get an object from the collection synchronously
     */
    getSync(lookup, context) {
        if (!lookup) {
            lookup = {};
        }
        // Set up a default context if it does not exist
        if (context === undefined) {
            context = {};
        }
        const paging = this.paging;
        const sorting = this.sorting;
        // Clear the paging object so it doesn't interfere with future calls
        delete this.paging;
        delete this.sorting;
        // Set the lookup on the context object
        context.lookup = lookup;
        context.model = this;
        this.emit('get-sync:before', context);
        // If lookup contains indexed fields then we should use those
        // to find data in the index
        const lookups = Object.keys(lookup);
        const indexes = lookups.filter((key) => {
            return this.schema[key];
        });
        let results;
        // If all of the lookups are on indexed fields then we can do an
        // index search
        if (indexes.length && indexes.length === lookups.length) {
            results = index_search_1.IndexSearch.sync(this, lookup);
        }
        else {
            results = scan_search_1.ScanSearch.sync(this, lookup);
        }
        if (sorting) {
            results = (0, sort_1.sort)(results, sorting);
        }
        if (paging) {
            results = (0, array_page_1.page)(results, paging.page, paging.size);
        }
        context.results = results;
        this.emit('get-sync:after', context);
        return results;
    }
    /**
     * Delete an object from the collection
     */
    del(obj, context, cb) {
        // Set up a default context if it does not exist
        if (context === undefined || typeof context === 'function') {
            cb = context;
            context = {};
        }
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.del, obj, context);
        }
        cb = cb || noop;
        // Make sure that obj is the data element on the context object
        context.data = obj;
        context.model = this;
        return this.emit('delete:before', context, (err) => {
            if (err) {
                return cb(err);
            }
            return this.delIndexes(obj, (err) => {
                // TODO: do we care if we could not delete indexes?
                const p1 = this.getPath('store', obj);
                // Delete the json file
                return this.db.delFile(p1, (err) => {
                    if (err) {
                        return cb(err);
                    }
                    return this.emit('delete:after', context, (err) => {
                        return cb(err, obj);
                    });
                });
            });
        });
    }
    /**
     * Delete an object from the collection synchronously
     */
    delSync(obj, context) {
        // Set up a default context if it does not exist
        if (context === undefined) {
            context = {};
        }
        // Make sure that obj is the data element on the context object
        context.data = obj;
        context.model = this;
        this.emit('delete-sync:before', context);
        try {
            this.delIndexesSync(obj);
        }
        catch (err) {
            // TODO: do we care if we could not delete indexes?
        }
        const p1 = this.getPath('store', obj);
        // Delete the json file
        this.db.delFileSync(p1);
        this.emit('delete:after', context);
        return obj;
    }
    /**
     * Delete an object's indexes
     */
    delIndexes(obj, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.delIndexes, obj);
        }
        cb = cb || noop;
        const p1 = this.getPath('index-links', obj);
        this.db.readJson(p1, (err, links) => {
            if (err && err.code !== 'ENOENT') {
                // Only call back with error if the error
                // is something other than file not found
                return cb(err);
            }
            let count = 0;
            links = links || [];
            links.push(p1);
            links.forEach((link) => {
                this.db.delFile(link, (err) => {
                    if (err && err.code === 'ENOENT') {
                        // Deleting a file that is already gone
                        // should not be a problem.
                        err = null;
                    }
                    count += 1;
                    if (count === links.length) {
                        return cb(err, obj);
                    }
                });
            });
        });
    }
    /**
     * Delete an object's indexes synchronously
     */
    delIndexesSync(obj) {
        const p1 = this.getPath('index-links', obj);
        let links;
        try {
            links = this.db.readJsonSync(p1);
        }
        catch (e) {
            links = [];
        }
        links = links || [];
        links.push(p1);
        for (const link of links) {
            try {
                this.db.delFileSync(link);
            }
            catch (e) {
                // TODO: do we care about this?
            }
        }
        return obj;
    }
    /**
     * Delete and add an objects indexes
     */
    reindex(lookup, cb) {
        if (typeof lookup === 'function') {
            cb = lookup;
            lookup = {};
        }
        if (!lookup) {
            lookup = {};
        }
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.reindex, lookup);
        }
        cb = cb || noop;
        return this.get(lookup, (err, objects) => {
            if (err) {
                return cb(err);
            }
            objects = objects || [];
            doWhile((next) => {
                const obj = objects.shift();
                if (!obj) {
                    return next(false);
                }
                return this.delIndexes(obj)
                    .then(() => {
                    return this.index(obj);
                })
                    .then(() => {
                    return next(true);
                })
                    .catch((err) => {
                    return cb(err);
                });
            }, () => {
                // TODO: what do we want to return here? number of reindexed objects? true/false?
                return cb();
            });
        });
    }
    /**
     * Delete and add an object's indexes synchronously
     */
    reindexSync(lookup) {
        if (!lookup) {
            lookup = {};
        }
        const objects = this.getSync(lookup);
        for (const obj of objects) {
            this.delIndexesSync(obj);
            this.index(obj);
        }
        return true;
    }
}
exports.SymDbModel = SymDbModel;
