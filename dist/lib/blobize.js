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
exports.getBlobs = exports.blobize = void 0;
const path = __importStar(require("path"));
const setValue = __importStar(require("set-value"));
function blobize(db) {
    db.on('model', function (model) {
        // extract the blobs from the object
        model.on('save:before', async function (event, cb) {
            const obj = event.data;
            // search for Buffers or Streams (somehow)
            const blobs = event.blobs = getBlobs(obj);
            for (const deepkey in blobs) {
                const blob = blobs[deepkey];
                const blobPath = model.getPath('blob-object-key', obj, deepkey);
                await model.db.writeBlob(blobPath, blob);
                // set the value of the deepkey to null
                // this will be undone in save:after
                // this is to avoid saving the blob on the json object
                // but re-attach it after
                setValue(obj, deepkey, null);
            }
            return cb();
        });
        // reattach blobs after save
        model.on('save:after', function (event, cb) {
            if (!event.blobs) {
                return cb();
            }
            const obj = event.data;
            const blobs = event.blobs;
            for (const deepkey in blobs) {
                const blob = blobs[deepkey];
                setValue(obj, deepkey, blob);
            }
            return cb();
        });
        // load all blobs from on disk for each record found
        model.on('get:after', async function (event, cb) {
            const records = event.results;
            for (const obj of records) {
                const blobPath = model.getPath('blob-object-dir', obj);
                try {
                    const keys = await model.db.readdir(blobPath);
                    for (const key of keys) {
                        const blob = await model.db.readBlob(path.join(blobPath, key));
                        setValue(obj, key, blob);
                    }
                }
                catch (e) {
                    // rethrow e if the error code is something besides ENOENT (dir not found)
                    if (e.code !== 'ENOENT') {
                        throw e;
                    }
                }
            }
            return cb();
        });
        // delete the blobs from on disk
        model.on('delete:after', async function (event, cb) {
            const obj = event.data;
            const blobPath = model.getPath('blob-object-dir', obj);
            try {
                const keys = await model.db.readdir(blobPath);
                for (const key of keys) {
                    await model.db.delFile(path.join(blobPath, key));
                    setValue(obj, key, null);
                }
            }
            catch (e) {
                // rethrow e if the error code is something besides ENOENT (dir not found)
                if (e.code !== 'ENOENT') {
                    throw e;
                }
            }
            return cb();
        });
    });
}
exports.blobize = blobize;
function getBlobs(obj, found, rootkey) {
    found = found || {};
    rootkey = rootkey || '';
    Object.keys(obj).forEach(function (key) {
        const deepkey = (rootkey) ? rootkey + '.' + key : key;
        if (obj[key] instanceof Buffer) {
            found[deepkey] = obj[key];
        }
        else if (obj[key] instanceof Object && !(obj[key] instanceof Buffer)) {
            getBlobs(obj[key], found, deepkey);
        }
    });
    return found;
}
exports.getBlobs = getBlobs;
