var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var doWhile = require('dank-do-while');
var uuid = require('uuid/v4');
var intersect = require('intersect');
var rmdir = require('./lib/rm-empty-dir');
var noop = function () {};


module.exports = SymDb;

function SymDb (opts) {
    var self = this;

    self.root = opts.root;
}

SymDb.prototype.Model = function (name, schema) {
    var self = this;

    return new SymDbModel(self, name, schema);
};

SymDb.prototype.id = function () { 
    var self = this;

    return uuid();
}

SymDb.prototype.writeJSON = function (file, data, cb) {
    var self = this;

    mkdirp(path.dirname(file), function (err) {
        if (err) {
            return cb(err);
        }

        fs.writeFile(file, JSON.stringify(data), cb);
    });
};

SymDb.prototype.readJSON = function (file, cb) {
    var self = this;

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

    fs.unlink(p, function (err) {
        //callback first
        cb(err);

        //cleanup empty dirs later so it doesn't hinder the current call
        var dirname = path.dirname(p);

        rmdir(dirname);
    });
};

SymDb.prototype.symlinkFile = function (target, p, cb) {
    var self = this;

    mkdirp(path.dirname(p), function (err) {
        if (err) {
            return cb(err);
        }

        fs.symlink(target, p, cb);
    });
}

function SymDbModel (db, name, schema) {
    var self = this;

    self.db = db;
    self.name = name;
    self.schema = schema;

    self.root = path.join(self.db.root, self.name);
}

SymDbModel.prototype.getPath = function (type, obj, index, val) {
    var self = this;

    switch (type) {
        case 'store' :
            return path.join(self.root, 'store', obj._id + '.json');
        case 'link-target' :
            return path.join('../', '../', '../', 'store', obj._id + '.json');
        case 'symlink' :
            return path.join(self.root, 'index', index, val, obj._id);
        case 'index-links' :
            return path.join(self.root, 'index-links', obj._id + '.json');
        case 'index-path' :
            return path.join(self.root, 'index', index, val);
    }
}

SymDbModel.prototype.save = function (obj, cb) {
    var self = this;

    cb = cb || noop;

    obj._id = obj._id || self.id();

    var file = self.getPath('store', obj);

    self.db.writeJSON(file, obj, function (err, result) {
        if (err) {
            return cb(err, result);
        }

        self.index(obj, function (err) {
            return cb(err, obj);
        });
    });
};

SymDbModel.prototype.id = function () {
    var self = this;

    return self.db.id();
};

SymDbModel.prototype.index = function (obj, cb) {
    var self = this;
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

    cb = cb || noop;

    return self.save(obj, cb);
}

SymDbModel.prototype.update = function (obj, cb) {
    var self = this;

    cb = cb || noop;

    return self.del(obj, function (err) {
        self.save(obj, cb);
    });
}

SymDbModel.prototype.get = function (lookup, cb) {
    var self = this;

    cb = cb || noop;

    //if lookup contains indexed fields then we should use those
    //to find data in the index
    var indexes = Object.keys(lookup).filter(function (key) {
        return self.schema[key];
    });

    var found = [];

    //for each index, get a list of the files in the index dir
    indexes.forEach(function (index) {
        var val = String(lookup[index]);
        var p = self.getPath('index-path', null, index, val)
        
        self.db.readdir(p, function (err, ids) {
            found.push(ids);

            check();
        });
    })

    function check () {
        if (found.length === indexes.length) {
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

        matches.forEach(function (match) {
            var p = self.getPath('store', { _id : match });

            self.db.readJSON(p, function (err, obj) {
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
};

SymDbModel.prototype.del = function (obj, cb) {
    var self = this;

    cb = cb || noop;

    var p = self.getPath('store', obj);

    return self.db.delFile(p, function (err) {
        if (err) {
            return cb(err);
        }

        var p = self.getPath('index-links', obj);

        self.db.readJSON(p, function (err, links) {
            if (err) {
                return cb(err);
            }

            var count = 0;

            links = links || [];
            links.push(p);

            links.forEach(function (link) {
                self.db.delFile(link, function () {
                    count += 1;

                    if (count === links.length) {
                        return cb();
                    }
                });
            });
        });
    });
};