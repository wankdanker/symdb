"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Promised = void 0;
function Promised(context, method, ...args) {
    return new Promise((resolve, reject) => {
        const callback = function (...callbackArgs) {
            const err = callbackArgs.shift();
            if (err) {
                return reject(err);
            }
            if (callbackArgs.length === 1) {
                return resolve(callbackArgs[0]);
            }
            return resolve(callbackArgs);
        };
        args.push(callback);
        return method.apply(context, args);
    });
}
exports.Promised = Promised;
