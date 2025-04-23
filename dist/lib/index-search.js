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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexSearch = void 0;
const compare_1 = require("./compare");
const path = __importStar(require("path"));
const fast_array_intersect_1 = __importDefault(require("fast_array_intersect"));
const doWhile = __importStar(require("dank-do-while"));
function IndexSearch(model, search, cb) {
    const directories = [];
    const found = [];
    const comparisons = [];
    const lookups = Object.keys(search);
    const indexes = lookups.filter((key) => {
        const val = search[key];
        if (val == undefined || val == null) {
            return false;
        }
        // Check to see if val is a SymDbComparison
        if (val instanceof compare_1.SymDbComparison) {
            // Add this comparison to the comparisons array
            comparisons.push(val);
        }
        return model.schema[key];
    });
    // If there are no SymDbComparisons, then we are doing direct
    // index lookups. So, we don't need to load all of the directories
    // within the index. We just need to load the directory referenced
    // by the values
    // * this is an optimization
    // * it would be nice if we could combine this optimization along
    //   with the SymDbComparisons
    if (!comparisons.length) {
        indexes.forEach((index) => {
            const val = search[index];
            const p = model.getPath('index-val-path', null, index, val);
            directories.push([p]);
        });
        return loadDirectories();
    }
    // For each indexed field, get a list of the directories we should load
    indexes.forEach((index) => {
        const val = search[index];
        let p = '';
        if (val instanceof compare_1.SymDbComparison) {
            p = model.getPath('index-path', null, index);
            return model.db.readdir(p, (err, dirs) => {
                dirs = dirs || [];
                // Find which index directories match the search
                dirs = dirs
                    .filter((a) => {
                    // Force a to the data type identified by the schema
                    a = model.schema[index](a);
                    return val.compare(a);
                })
                    .map((dir) => {
                    return model.getPath('index-val-path', null, index, dir);
                });
                directories.push(dirs);
                return checkDirectories();
            });
        }
        // Force val to a string
        const strVal = String(val);
        // Push the directory for the exact lookup
        directories.push(model.getPath('index-val-path', null, index, strVal));
        checkDirectories();
    });
    function checkDirectories() {
        if (directories.length === indexes.length) {
            return loadDirectories();
        }
    }
    function loadDirectories() {
        if (!directories.length) {
            return cb(null, []);
        }
        directories.forEach((dir) => {
            if (Array.isArray(dir)) {
                model.db.readdirs(dir, (err, dirs) => {
                    const ids = [].concat.apply([], dirs || []);
                    const fileIds = ids.map((f) => {
                        return path.basename(f, '.json');
                    });
                    found.push(fileIds);
                    check();
                });
            }
            else {
                model.db.readdir(dir, (err, ids) => {
                    ids = ids || [];
                    const fileIds = ids.map((f) => {
                        return path.basename(f, '.json');
                    });
                    found.push(fileIds);
                    check();
                });
            }
        });
    }
    function check() {
        if (found.length === directories.length) {
            const matches = (0, fast_array_intersect_1.default)(found);
            if (!matches.length) {
                return cb(null, []);
            }
            return load(matches);
        }
    }
    function load(matches) {
        let x = 0;
        const results = [];
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
                if (obj) {
                    results.push(obj);
                }
                return next(true);
            });
        }, () => {
            return cb(null, results);
        }, 4);
    }
}
exports.IndexSearch = IndexSearch;
// Async (Promise-based) version
IndexSearch.async = async function async(model, search) {
    const directories = [];
    const found = [];
    const comparisons = [];
    const results = [];
    const lookups = Object.keys(search);
    const indexes = lookups.filter((key) => {
        const val = search[key];
        if (val == undefined || val == null) {
            return false;
        }
        // Check to see if val is a SymDbComparison
        if (val instanceof compare_1.SymDbComparison) {
            // Add this comparison to the comparisons array
            comparisons.push(val);
        }
        return model.schema[key];
    });
    // If there are no SymDbComparisons, then we are doing direct
    // index lookups. So, we don't need to load all of the directories
    // within the index. We just need to load the directory referenced
    // by the values
    if (!comparisons.length) {
        indexes.forEach((index) => {
            const val = search[index];
            const p = model.getPath('index-val-path', null, index, val);
            directories.push([p]);
        });
    }
    else {
        // For each indexed field, get a list of the directories we should load
        for (const index of indexes) {
            const val = search[index];
            let p = '';
            if (val instanceof compare_1.SymDbComparison) {
                p = model.getPath('index-path', null, index);
                let dirs = [];
                try {
                    dirs = await model.db.readdir(p);
                }
                catch (err) {
                    // TODO: only ignore path not found errors
                }
                dirs = dirs || [];
                // Find which index directories match the search
                dirs = dirs
                    .filter((a) => {
                    // Force a to the data type identified by the schema
                    a = model.schema[index](a);
                    return val.compare(a);
                })
                    .map((dir) => {
                    return model.getPath('index-val-path', null, index, dir);
                });
                directories.push(dirs);
            }
            else {
                // Force val to a string
                const strVal = String(val);
                // Push the directory for the exact lookup
                directories.push(model.getPath('index-val-path', null, index, strVal));
            }
        }
    }
    if (!directories.length) {
        return results;
    }
    for (const dir of directories) {
        if (Array.isArray(dir)) {
            let dirs = [];
            try {
                dirs = await model.db.readdirs(dir);
            }
            catch (err) {
                // TODO: ignore only path not found errors?
            }
            let ids = [].concat.apply([], dirs);
            ids = ids.map((f) => {
                return path.basename(f, '.json');
            });
            found.push(ids);
        }
        else {
            let ids = [];
            try {
                ids = await model.db.readdir(dir);
            }
            catch (err) {
                // TODO: ignore only path not found errors?
            }
            ids = ids || [];
            ids = ids.map((f) => {
                return path.basename(f, '.json');
            });
            found.push(ids);
        }
    }
    const matches = (0, fast_array_intersect_1.default)(found);
    if (!matches.length) {
        return results;
    }
    for (const match of matches) {
        const p = model.getPath('store', { _id: match });
        try {
            const obj = await model.db.readJson(p);
            if (obj) {
                results.push(obj);
            }
        }
        catch (err) {
            // TODO: handle err?
        }
    }
    return results;
};
// Synchronous version
IndexSearch.sync = function sync(model, search) {
    const directories = [];
    const found = [];
    const comparisons = [];
    const results = [];
    const lookups = Object.keys(search);
    const indexes = lookups.filter((key) => {
        const val = search[key];
        if (val == undefined || val == null) {
            return false;
        }
        // Check to see if val is a SymDbComparison
        if (val instanceof compare_1.SymDbComparison) {
            // Add this comparison to the comparisons array
            comparisons.push(val);
        }
        return model.schema[key];
    });
    // If there are no SymDbComparisons, then we are doing direct
    // index lookups. So, we don't need to load all of the directories
    // within the index. We just need to load the directory referenced
    // by the values
    if (!comparisons.length) {
        indexes.forEach((index) => {
            const val = search[index];
            const p = model.getPath('index-val-path', null, index, val);
            directories.push([p]);
        });
    }
    else {
        // For each indexed field, get a list of the directories we should load
        for (const index of indexes) {
            const val = search[index];
            let p = '';
            if (val instanceof compare_1.SymDbComparison) {
                p = model.getPath('index-path', null, index);
                let dirs = [];
                try {
                    dirs = model.db.readdirSync(p);
                }
                catch (err) {
                    // TODO: only ignore path not found errors
                }
                dirs = dirs || [];
                // Find which index directories match the search
                dirs = dirs
                    .filter((a) => {
                    // Force a to the data type identified by the schema
                    a = model.schema[index](a);
                    return val.compare(a);
                })
                    .map((dir) => {
                    return model.getPath('index-val-path', null, index, dir);
                });
                directories.push(dirs);
            }
            else {
                // Force val to a string
                const strVal = String(val);
                // Push the directory for the exact lookup
                directories.push(model.getPath('index-val-path', null, index, strVal));
            }
        }
    }
    if (!directories.length) {
        return results;
    }
    for (const dir of directories) {
        if (Array.isArray(dir)) {
            let dirs = [];
            try {
                dirs = model.db.readdirsSync(dir);
            }
            catch (err) {
                // TODO: ignore only path not found errors?
            }
            let ids = [].concat.apply([], dirs);
            ids = ids.map((f) => {
                return path.basename(f, '.json');
            });
            found.push(ids);
        }
        else {
            let ids = [];
            try {
                ids = model.db.readdirSync(dir);
            }
            catch (err) {
                // TODO: ignore only path not found errors?
            }
            ids = ids || [];
            ids = ids.map((f) => {
                return path.basename(f, '.json');
            });
            found.push(ids);
        }
    }
    const matches = (0, fast_array_intersect_1.default)(found);
    if (!matches.length) {
        return results;
    }
    for (const match of matches) {
        const p = model.getPath('store', { _id: match });
        try {
            const obj = model.db.readJsonSync(p);
            if (obj) {
                results.push(obj);
            }
        }
        catch (err) {
            // TODO: handle err?
        }
    }
    return results;
};
