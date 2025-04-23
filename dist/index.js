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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const mkdirp = __importStar(require("mkdirp"));
const event_pipeline_1 = require("event-pipeline");
const uuid_1 = require("uuid");
const symdb_model_1 = require("./lib/symdb-model");
const promise_1 = require("./lib/promise");
const blobize_1 = require("./lib/blobize");
const patcher_1 = require("./lib/patcher");
const compare_1 = require("./lib/compare");
class SymDb extends event_pipeline_1.EventPipeline {
    constructor(opts) {
        super();
        this.root = opts.root;
        this.linkType = opts.linkType || SymDb.SYM_LINK;
        this.models = {};
        (0, compare_1.mixin)(this);
        if (opts.blobs) {
            (0, blobize_1.blobize)(this);
        }
    }
    Model(name, schema) {
        const model = new symdb_model_1.SymDbModel(this, name, schema);
        this.models[name] = model;
        this.emit('model', model);
        return model;
    }
    id() {
        return (0, uuid_1.v4)();
    }
    writeJson(file, data, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.writeJson, file, data);
        }
        mkdirp(path.dirname(file), (err) => {
            if (err) {
                return cb(err);
            }
            fs.writeFile(file, JSON.stringify(data), cb);
        });
    }
    writeJsonSync(file, data) {
        mkdirp.sync(path.dirname(file));
        fs.writeFileSync(file, JSON.stringify(data));
    }
    readJson(file, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.readJson, file);
        }
        fs.readFile(file, (err, data) => {
            if (err) {
                return cb(err);
            }
            try {
                const parsedData = JSON.parse(data.toString());
                return cb(null, parsedData);
            }
            catch (e) {
                return cb(e);
            }
        });
    }
    readJsonSync(file) {
        const data = fs.readFileSync(file);
        return JSON.parse(data.toString());
    }
    writeBlob(file, data, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.writeBlob, file, data);
        }
        mkdirp(path.dirname(file), (err) => {
            if (err && err.code !== 'EEXIST') {
                return cb(err);
            }
            fs.writeFile(file, data, cb);
        });
    }
    writeBlobSync(file, data) {
        try {
            mkdirp.sync(path.dirname(file));
        }
        catch (err) {
            if (err && err.code !== 'EEXIST') {
                throw err;
            }
        }
        fs.writeFileSync(file, data);
    }
    readBlob(file, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.readBlob, file);
        }
        fs.readFile(file, cb);
    }
    readBlobSync(file) {
        return fs.readFileSync(file);
    }
    readBlobStream(file) {
        return fs.createReadStream(file);
    }
    readdir(dir, filter, cb) {
        if (typeof filter === 'function' && !cb) {
            cb = filter;
            filter = null;
        }
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.readdir, dir, filter);
        }
        fs.readdir(dir, (err, files) => {
            if (err) {
                return cb(err);
            }
            if (filter && typeof filter === 'function') {
                files = files.filter(filter);
            }
            return cb(null, files);
        });
    }
    readdirSync(dir, filter) {
        let files = fs.readdirSync(dir);
        if (filter) {
            files = files.filter(filter);
        }
        return files;
    }
    readdirs(dirs, filter, cb) {
        if (typeof filter === 'function' && !cb) {
            cb = filter;
            filter = null;
        }
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.readdirs, dirs, filter);
        }
        const results = [];
        if (!dirs.length) {
            return cb(null, results);
        }
        dirs.forEach((dir) => {
            fs.readdir(dir, (err, files) => {
                if (err) {
                    return cb(err);
                }
                if (filter && typeof filter === 'function') {
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
    }
    readdirsSync(dirs, filter) {
        const results = [];
        if (!dirs.length) {
            return results;
        }
        for (const dir of dirs) {
            let files = fs.readdirSync(dir);
            if (filter) {
                files = files.filter(filter);
            }
            results.push(files);
        }
        return results;
    }
    delFile(p, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.delFile, p);
        }
        return fs.unlink(path.resolve(this.root, p), (err) => {
            if (err) {
                return cb(err);
            }
            return cb();
        });
    }
    delFileSync(p) {
        return fs.unlinkSync(path.resolve(this.root, p));
    }
    linkFile(target, p, cb) {
        // If no callback function provided, then return a Promise
        if (cb === undefined) {
            return (0, promise_1.Promised)(this, this.linkFile, target, p);
        }
        mkdirp(path.dirname(p), (err) => {
            if (err) {
                return cb(err);
            }
            if (this.linkType === SymDb.HARD_LINK) {
                fs.link(path.resolve(p, '../' + target), p, cb);
            }
            else if (this.linkType === SymDb.EMPTY_FILE) {
                fs.open(p, 'a', (err, fd) => {
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
    linkFileSync(target, p) {
        mkdirp.sync(path.dirname(p));
        if (this.linkType === SymDb.HARD_LINK) {
            return fs.linkSync(path.resolve(p, '../' + target), p);
        }
        else if (this.linkType === SymDb.EMPTY_FILE) {
            fs.closeSync(fs.openSync(p, 'a'));
        }
        else {
            return fs.symlinkSync(target, p);
        }
    }
}
// Static comparison types
SymDb.HARD_LINK = 1;
SymDb.SOFT_LINK = 2;
SymDb.SYM_LINK = 2;
SymDb.EMPTY_FILE = 3;
// Static methods from SymDbComparison
SymDb.isNull = compare_1.SymDbComparison.isNull;
SymDb.isUndefined = compare_1.SymDbComparison.isUndefined;
SymDb.gt = compare_1.SymDbComparison.gt;
SymDb.gte = compare_1.SymDbComparison.gte;
SymDb.lt = compare_1.SymDbComparison.lt;
SymDb.lte = compare_1.SymDbComparison.lte;
SymDb.startsWith = compare_1.SymDbComparison.startsWith;
SymDb.contains = compare_1.SymDbComparison.contains;
SymDb.between = compare_1.SymDbComparison.between;
SymDb.compare = compare_1.SymDbComparison.compare;
// Additional exports
SymDb.patcher = patcher_1.patcher;
// Add mixin capabilities
(0, compare_1.mixin)(SymDb);
exports.default = SymDb;
