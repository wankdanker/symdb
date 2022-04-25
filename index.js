const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const EventPipeline = require('event-pipeline');
const uuid = require('uuid').v4;
const SymDbComparison = require('./lib/compare');
const inherits = require('util').inherits;
const SymDbModel = require('./lib/symdb-model');
const Promised = require('./lib/promise');
const blobize = require('./lib/blobize');
const patcher = require('./lib/patcher');

module.exports = SymDb;

SymDbComparison.mixin(module.exports);
SymDb.patcher = patcher;

SymDb.HARD_LINK = 1;
SymDb.SOFT_LINK = 2;
SymDb.SYM_LINK = 2;
SymDb.EMPTY_FILE = 3;

function SymDb (opts) {
    const self = this;

    EventPipeline.call(self);

    self.root = opts.root;
    self.linkType = opts.linkType || SymDb.SYM_LINK;
    self.models = {};

    SymDbComparison.mixin(self);

    if (opts.blobs) {
        blobize(self);
    }
}

inherits(SymDb, EventPipeline);

SymDb.prototype.Model = function (name, schema) {
    const self = this;

    const model = new SymDbModel(self, name, schema);

    self.models[name] = model;

    self.emit('model', model);

    return model;
};

SymDb.prototype.id = function () { 
    const self = this;

    return uuid();
}

SymDb.prototype.writeJson = function (file, data, cb) {
    const self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.writeJson, file, data);
    }

    mkdirp(path.dirname(file), function (err) {
        if (err) {// && err.code !== 'EEXIST') {
            return cb(err);
        }

        fs.writeFile(file, JSON.stringify(data), cb);
    });
};

SymDb.prototype.writeJsonSync = function (file, data) {
    

    mkdirp.sync(path.dirname(file))
    

    fs.writeFileSync(file, JSON.stringify(data));
};

SymDb.prototype.readJson = function (file, cb) {
    const self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.readJson, file);
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

SymDb.prototype.readJsonSync = function (file) {
    let data = fs.readFileSync(file);
    
    return JSON.parse(data);
};

SymDb.prototype.writeBlob = function (file, data, cb) {
    const self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.writeBlob, file, data);
    }

    mkdirp(path.dirname(file), function (err) {
        if (err && err.code !== 'EEXIST') {
            return cb(err);
        }

        fs.writeFile(file, data, cb);
    });
};

SymDb.prototype.writeBlobSync = function (file, data) {
    try {
        mkdirp.sync(path.dirname(file));
    }
    catch (err) {
        if (err && err.code !== 'EEXIST') {
            throw err;
        }
    }

    fs.writeFileSync(file, data);
};

SymDb.prototype.readBlob = function (file, cb) {
    const self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.readBlob, file);
    }

    fs.readFile(file, cb);
};

SymDb.prototype.readBlobSync = function (file) {
    return fs.readFileSync(file);
};

SymDb.prototype.readBlobStream = function (file) {
    const self = this;

    return fs.createReadStream(file);
};

SymDb.prototype.readdir = function (dir, filter, cb) {
    const self = this;

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

SymDb.prototype.readdirSync = function (dir, filter) {
    let files = fs.readdirSync(dir);

    if (filter) {
        files = files.filter(filter);
    }

    return files;
};

SymDb.prototype.readdirs = function (dirs, filter, cb) {
    const self = this;

    if (!cb) {
        cb = filter;
        filter = null;
    }

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.readdirs, dirs, filter);
    }

    const results = [];

    if (!dirs.length) {
        return cb(null, results);
    }

    dirs.forEach(function (dir) {
        fs.readdir(dir, function (err, files) {
            if (err) {
                return cb(err);
            }

            if (filter) {
                files = files.filter(filter);
            }

            results.push(files);

            check();
        });
    });

    function check() {
        if (results.length === dirs.length) {
            cb(null, results);
        }
    }
};

SymDb.prototype.readdirsSync = function (dirs, filter) {
    const results = [];

    if (!dirs.length) {
        return results;
    }

    for (const dir of dirs) {
        let files = fs.readdirSync(dir) 

        if (filter) {
            files = files.filter(filter);
        }

        results.push(files);
    }

    return results;
};

SymDb.prototype.delFile = function (p, cb) {
    const self = this;

    //If no callback function provided, then return a Promise
    if (cb === undefined) {
        return Promised(self, self.delFile, p);
    }

    return fs.unlink(path.resolve(self.root, p), function (err) {
        if (err) {
            return cb(err);
        }

        return cb();

        // TODO: re-enable this when we have some sort of directory
        // locking mechanism to avoid race conditions with mkdirp and rmdir
        // const dirname = path.dirname(p);
        // return rmdir(dirname, function (err) {
        //     return cb();
        // });
    });
};

SymDb.prototype.delFileSync = function (p) {
    const self = this;

    return fs.unlinkSync(path.resolve(self.root, p));
    
    // TODO: re-enable this when we have some sort of directory
    // locking mechanism to avoid race conditions with mkdirp and rmdir
    // const  dirname = path.dirname(p);
    // return fs.rmdirSync(dirname);
};

SymDb.prototype.linkFile = function (target, p, cb) {
    const self = this;

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
        else if (self.linkType === SymDb.EMPTY_FILE) {
            fs.open(p, 'a', function (err, fd) {
                if (err) {
                    return cb(err);
                }

                fs.close(fd, cb);
            });
        }
        else {
            fs.symlink(target, p, cb);
        }
    });
}

SymDb.prototype.linkFileSync = function (target, p) {
    const self = this;

    mkdirp.sync(path.dirname(p));

    if (self.linkType === SymDb.HARD_LINK) {
        return fs.linkSync(path.resolve(p, '../' + target), p);
    }
    else if (self.linkType === SymDb.EMPTY_FILE) {
        fs.closeSync(fs.openSync(p, 'a'));
    }
    else {
        return fs.symlinkSync(target, p);
    }
}
