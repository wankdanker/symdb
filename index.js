var path = require('path');
var fs = require('fs');
var mkdirp = require('./mkdirp');
var doWhile = require('dank-do-while');

module.exports = SymDb;

function SymDb (opts) {
    var self = this;

    self.root = opts.root;
}

SymDb.prototype.Model = function (name, schema) {
    var self = this;

    return new SymDbModel(self, name, schema);
};

SymDb.prototype.writeFile = function (file, data, cb) {
    var self = this;

    mkdirp(path.dirname(file), function (err) {
        if (err) {
            return cb(err);
        }

        fs.writeFile(file, JSON.stringify(data), cb);
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

    self.db.writeFile(file, obj, function (err, result) {
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

    return (Math.random() * 100000000000000000).toString(36);
};

SymDbModel.prototype.index = function (obj, cb) {
    var self = this;

    var keys = Object.keys(self.schema);

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

