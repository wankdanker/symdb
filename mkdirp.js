var fs = require('fs');
var path = require('path');
var doWhile = require('dank-do-while');

module.exports = mkdirp;

function mkdirp (p, cb) {
    var parts = p.split(path.sep);
    var make = [];

    doWhile(function (next) {
        var part = parts.shift();

        if (!part) {
            return next(false);
        }

        make.push(part);

        fs.mkdir(make.join(path.sep), function (err, result) {
            return next(true);
        });
    }, cb);
}