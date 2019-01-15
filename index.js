var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var EventPipeline = require('event-pipeline');
var uuid = require('uuid/v4');
var SymDbComparison = require('./lib/compare');
var inherits = require('util').inherits;
var SymDbModel = require('./lib/symdb-model');
var Promised = require('./lib/promise')

module.exports = SymDb;

SymDbComparison.mixin(module.exports);

SymDb.HARD_LINK = 1;
SymDb.SOFT_LINK = 2;
SymDb.SYM_LINK = 2;

function SymDb (opts) {
    var self = this;

    EventPipeline.call(self);

    self.root = opts.root;
    self.linkType = opts.linkType || SymDb.SYM_LINK;
    self.models = {};

    SymDbComparison.mixin(self);
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

SymDb.prototype.linkFile = function (target, p, cb) {
    var self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.linkFile, target, p);
    }

    mkdirp(path.dirname(p), function (err) {
        if (err) {
            return cb(err);
        }

        if (self.linkType === SymDb.HARD_LINK) {
            fs.link(path.resolve(p, '../' + target), p, cb)
        }
        else{
            fs.symlink(target, p, cb);
        }
    });
}

