"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patcher = void 0;
const extend_1 = __importDefault(require("extend"));
function patcher(map) {
    return function (context, cb) {
        const object = context.data;
        const lookup = {};
        Object.keys(map).forEach(function (src) {
            const dst = map[src];
            if (object.hasOwnProperty(src)) {
                lookup[dst] = object[src];
            }
        });
        context.model
            .get(lookup)
            .then(function (objects) {
            if (objects.length !== 1) {
                return Promise.reject(new Error('object not found'));
            }
            // merge the attributes of the saved object into the current object
            (0, extend_1.default)(true, object, (0, extend_1.default)(true, {}, objects[0], object));
            return cb();
        })
            .catch(cb);
    };
}
exports.patcher = patcher;
