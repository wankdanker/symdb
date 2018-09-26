var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var doWhile = require('dank-do-while');
var EventPipeline = require('event-pipeline');
var uuid = require('uuid/v4');
var SymDbComparision = require('./lib/compare');
var inherits = require('util').inherits;
var noop = function () {};
var IndexSearch = require('./lib/index-search');
var ScanSearch = require('./lib/scan-search');

module.exports = SymDb;

SymDbComparision.mixin(module.exports);

function SymDb (opts) {
    var self = this;

    EventPipeline.call(self);

    self.root = opts.root;
    self.models = {};

    SymDbComparision.mixin(self);
}

inherits(SymDb, EventPipeline);

SymDb.prototype.Model = function (name, schema) {
    var self = this;

    var model = new SymDbModel(self, name, schema);

    self.models[name] = model;

    return model;
};

SymDb.prototype.id = function () { 
    var self = this;

    return uuid();
}

SymDb.prototype.writeJSON = function (file, data, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.writeJSON, file, data);
    }

    mkdirp(path.dirname(file), function (err) {
        if (err) {// && err.code !== 'EEXIST') {
            return cb(err);
        }

        fs.writeFile(file, JSON.stringify(data), cb);
    });
};

SymDb.prototype.readJSON = function (file, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.readJSON, file);
    }

    fs.readFile(file, function (err, data) {
        if (err) {
            return cb(err);
        }

        try {
            data = JSON.parse(data);
        }
        catch (e) {
            return cb(e);
        }

        return cb(null, data);
    });
};

SymDb.prototype.readdir = function (dir, filter, cb) {
    var self = this;

    if (!cb) {
        cb = filter;
        filter = null;
    }

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.readdir, dir, filter);
    }

    fs.readdir(dir, function (err, files) {
        if (err) {
            return cb(err);
        }

        if (filter) {
            files = files.filter(filter);
        }

        return cb(null, files);
    });
};

SymDb.prototype.delFile = function (p, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.delFile, p);
    }

    return fs.unlink(p, function (err) {
        if (err) {
            return cb(err);
        }

        var dirname = path.dirname(p);

        return cb();

        // TODO: re-enable this when we have some sort of directory
        // locking mechanism to avoid race conditions with mkdirp and rmdir
        // return rmdir(dirname, function (err) {
        //     return cb();
        // });
    });
};

SymDb.prototype.symlinkFile = function (target, p, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.symlinkFile, target, p);
    }

    mkdirp(path.dirname(p), function (err) {
        if (err) {
            return cb(err);
        }

        fs.symlink(target, p, cb);
    });
}

function SymDbModel (db, name, schema) {
    var self = this;

    EventPipeline.call(self);

    self.db = db;
    self.name = name;
    self.schema = schema;

    self.root = path.join(self.db.root, self.name);
}

inherits(SymDbModel, EventPipeline);

SymDbModel.prototype.getPath = function (type, obj, index, val) {
    var self = this;

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

SymDbModel.prototype.save = function (obj, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.save, obj);
    }

    cb = cb || noop;

    obj._id = obj._id || self.id();

    return self.emit('save:before', obj, function (err) {
        if (err) {
            return cb(err);
        }

        var file = self.getPath('store', obj);

        return self.db.writeJSON(file, obj, function (err) {
            if (err) {
                return cb(err);
            }

            return self.index(obj, function (err) {
                if (err) {
                   return cb(err);
                }

                return self.emit('save:after', obj, function (err) {
                    return cb(err, obj);
                });
            });
        });
    });
};

SymDbModel.prototype.id = function () {
    var self = this;

    return self.db.id();
};

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

        if (!obj.hasOwnProperty(key)) {
            return next(true);
        }

        var val = String(obj[key]);

        var link = self.getPath('symlink', obj, key, val);

        links.push(link);

        self.db.symlinkFile(target, link, function (err) {
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

SymDbModel.prototype.add = function (obj, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.add, obj);
    }

    cb = cb || noop;

    return self.emit('add:before', obj, function (err) {
        if (err) {
            return cb(err);
        }

        return self.save(obj, function (err) {
            if (err) {
                return cb(err);
            }

            return self.emit('add:after', obj, function (err) {
                if (err) {
                    return cb(err);
                }

                return cb(null, obj);
            });
        });
    });
}

SymDbModel.prototype.update = function (obj, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.update, obj);
    }

    cb = cb || noop;

    return self.emit('update:before', obj, function (err) {
        if (err) {
            return cb(err);
        }

    return self.del(obj, function (err) {
            if (err) {
                return cb(err);
            }

            return self.save(obj, function (err, result) {
                if (err) {
                    return cb(err);
                }

                return self.emit('update:after', result, function (err) {
                    if (err) {
                        return cb(err);
                    }

                    return cb(null, result);
                });
            });
        });
    });
}

SymDbModel.prototype.get = function (lookup, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.get, lookup);
    }

    cb = cb || noop;

    self.emit('get:before', lookup, function (err) {
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
        if (indexes.length === lookups.length) {
            IndexSearch(self, lookup, done);
        }
        else {
            ScanSearch(self, lookup, done);
        }
    });

    function done(err, results) {
        self.emit('get:after', results, function (err) {
            if (err) {
                return cb(err);
            }

            return cb(null, results);
        });
    }
};

SymDbModel.prototype.del = function (obj, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.del, obj);
    }

    cb = cb || noop;

    return self.emit('delete:before', obj, function (err) {
        if (err) {
            return cb(err);
        }

        var p1 = self.getPath('store', obj);
        var p2 = self.getPath('index-links', obj);

        self.db.readJSON(p2, function (err, links) {
            if (err) {
                return cb(err);
            }

            var count = 0;

            links = links || [];
            links.push(p2);
            links.push(p1);

            links.forEach(function (link) {
                self.db.delFile(link, function () {
                    count += 1;

                    if (count === links.length) {
                        return self.emit('delete:after', obj, function (err) {
                            return cb(err, obj);
                        });
                    }
                });
            });
        });
    });
};

function Promised () {
    var args = Array.prototype.slice.call(arguments);
    var context = args.shift();
    var method = args.shift();

    var p = new Promise(function (resolve, reject) {
        args.push(function cb() {
            var args2 = Array.prototype.slice.call(arguments);
            var err = args2.shift();

            if (err) {
                return reject(err);
            }

            return resolve.apply(p, args2);
        });

        return method.apply(context, args);
    });

    return p;
}

