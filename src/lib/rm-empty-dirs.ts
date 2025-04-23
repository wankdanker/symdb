import * as fs from 'fs';

const noop = function () {};

export function removeEmptyDir(p: string, cb?: (err?: Error) => void): void {
  cb = cb || noop;

  fs.readdir(p, (err, files) => {
    if (err) {
      return cb(err);
    }

    if (files.length) {
      return cb();
    }
    
    fs.rmdir(p, cb);
  });
}