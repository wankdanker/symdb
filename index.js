var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var doWhile = require('dank-do-while');
var uuid = require('uuid/v4');
var intersect = require('intersect');

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

SymDbModel.prototype.save = function (obj, cb) {
    var self = this;

    obj._id = obj._id || self.id();

    var file = path.join(self.root, 'store', obj._id + '.json');

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

    var keys = Object.keys(self.schema);

    keys.push('_id');

    var target =  path.join('../', '../', '../', 'store', obj._id + '.json'); 

    doWhile(function (next) {
        var key = keys.shift();

        if (!key) {
            return next(false);
        }

        if (!obj.hasOwnProperty(key)) {
            return next(true);
        }

        var val = String(obj[key]);
        var link = path.join(self.root, 'index', key, val, obj._id);

        self.db.symlinkFile(target, link, function (err) {
            if (err) {
                return cb(err);
            }

            return next(true);
        })
    }, cb);
};

SymDbModel.prototype.add = function (obj, cb) {
    var self = this;

    return self.save(obj, cb);
}

SymDbModel.prototype.get = function (lookup, cb) {
    var self = this;

    //if lookup contains indexed fields then we should use those
    //to find data in the index
    var indexes = Object.keys(lookup).filter(function (key) {
        return self.schema[key];
    });

    var found = [];

    //for each index, get a list of the files in the index dir
    indexes.forEach(function (index) {
        var val = String(lookup[index]);
        var p = path.join(self.root, 'index', index, val);
        
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
            var p = path.join(self.root, 'store', match + '.json');

            self.db.readJSON(p, function (err, obj) {
                //TODO: handle err?
                count += 1;

                results.push(obj);

                if (count === matches.length) {
                    return cb(null, results)
                }
            });
        });
    }
};