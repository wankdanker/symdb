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
exports.ScanSearch = void 0;
const compare_1 = require("./compare");
const path = __importStar(require("path"));
const each = __importStar(require("dank-each"));
const getValue = __importStar(require("get-value"));
const doWhile = __importStar(require("dank-do-while"));
function ScanSearch(model, search, cb) {
    // If there are no search keys, then we should be loading everything
    const loadAll = !Object.keys(search).length;
    const found = [];
    const results = [];
    const p = model.getPath('store-path');
    return model.db.readdir(p, (err, ids) => {
        ids = ids || [];
        found.push(ids);
        ids = ids.map((f) => {
            return path.basename(f, '.json');
        });
        load(ids);
    });
    function load(matches) {
        let x = 0;
        if (!matches.length) {
            return cb(null, results);
        }
        doWhile((next) => {
            const match = matches[x++];
            if (!match) {
                return next(false);
            }
            const p = model.getPath('store', { _id: match });
            model.db.readJson(p, (err, obj) => {
                // TODO: handle err?
                if (loadAll || check(obj)) {
                    results.push(obj);
                }
                return next(true);
            });
        }, () => {
            return cb(null, results);
        }, 4);
    }
    function check(obj) {
        let result = true;
        each(search, (key, val, end) => {
            if (val instanceof compare_1.SymDbComparison) {
                if (!val.compare(getValue(obj, key))) {
                    result = false;
                    return end();
                }
                // Move on to the next check
                return;
            }
            // Compare the values
            if (val != getValue(obj, key)) {
                result = false;
                return end();
            }
        });
        return result;
    }
}
exports.ScanSearch = ScanSearch;
ScanSearch.async = async function async(model, search) {
    // If there are no search keys, then we should be loading everything
    const loadAll = !Object.keys(search).length;
    const found = [];
    const results = [];
    const p = model.getPath('store-path');
    let ids = [];
    try {
        ids = await model.db.readdir(p);
    }
    catch (e) {
        // TODO: do we care if this is anything but e.code === 'ENOENT'?
    }
    ids = ids || [];
    found.push(ids);
    ids = ids.map((f) => {
        return path.basename(f, '.json');
    });
    const matches = ids;
    if (!matches.length) {
        return results;
    }
    // Load the matches
    for (const match of matches) {
        const p = model.getPath('store', { _id: match });
        let obj;
        try {
            obj = await model.db.readJson(p);
        }
        catch (err) {
            // TODO: handle err?
            continue;
        }
        if (loadAll || check(obj)) {
            results.push(obj);
        }
    }
    return results;
    function check(obj) {
        let result = true;
        each(search, (key, val, end) => {
            if (val instanceof compare_1.SymDbComparison) {
                if (!val.compare(getValue(obj, key))) {
                    result = false;
                    return end();
                }
                // Move on to the next check
                return;
            }
            // Compare the values
            if (val != getValue(obj, key)) {
                result = false;
                return end();
            }
        });
        return result;
    }
};
ScanSearch.sync = function sync(model, search) {
    // If there are no search keys, then we should be loading everything
    const loadAll = !Object.keys(search).length;
    const found = [];
    const results = [];
    const p = model.getPath('store-path');
    let ids = [];
    try {
        ids = model.db.readdirSync(p);
    }
    catch (e) {
        // TODO: handle error?
    }
    ids = ids || [];
    found.push(ids);
    ids = ids.map((f) => {
        return path.basename(f, '.json');
    });
    const matches = ids;
    if (!matches.length) {
        return results;
    }
    // Load the matches
    for (const match of matches) {
        const p = model.getPath('store', { _id: match });
        let obj;
        try {
            obj = model.db.readJsonSync(p);
        }
        catch (err) {
            // TODO: handle err?
            continue;
        }
        if (loadAll || check(obj)) {
            results.push(obj);
        }
    }
    return results;
    function check(obj) {
        let result = true;
        each(search, (key, val, end) => {
            if (val instanceof compare_1.SymDbComparison) {
                if (!val.compare(getValue(obj, key))) {
                    result = false;
                    return end();
                }
                // Move on to the next check
                return;
            }
            // Compare the values
            if (val != getValue(obj, key)) {
                result = false;
                return end();
            }
        });
        return result;
    }
};
