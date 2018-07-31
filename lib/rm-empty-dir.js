var fs = require('fs');
var noop = function () {};

module.exports = removeEmptyDir

function removeEmptyDir (p, cb) {
    cb = cb || noop;

    fs.readdir(p, function (err, files) {
        if (err) {
            return cb(err);
        }

        if (files.length) {
            return cb();
        }

        fs.rmdir(p, cb);
    });
};