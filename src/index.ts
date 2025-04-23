import * as path from 'path';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import { EventPipeline } from 'event-pipeline';
import { v4 as uuid } from 'uuid';
import { SymDbModel } from './lib/symdb-model';
import { Promised } from './lib/promise';
import { blobize } from './lib/blobize';
import { patcher } from './lib/patcher';
import { SymDbComparison, mixin } from './lib/compare';

// Interfaces
export interface SymDbOptions {
  root: string;
  linkType?: number;
  blobs?: boolean;
}

export interface SchemaDefinition {
  [key: string]: Function;
}

export interface ModelEventContext {
  data?: any;
  model?: SymDbModel;
  session?: any;
  lookup?: any;
  results?: any[];
  blobs?: {[key: string]: Buffer};
}

class SymDb extends EventPipeline {
  root: string;
  linkType: number;
  models: { [key: string]: SymDbModel };
  
  // Static comparison types
  static HARD_LINK = 1;
  static SOFT_LINK = 2;
  static SYM_LINK = 2;
  static EMPTY_FILE = 3;
  
  // Static methods from SymDbComparison
  static isNull = SymDbComparison.isNull;
  static isUndefined = SymDbComparison.isUndefined;
  static gt = SymDbComparison.gt;
  static gte = SymDbComparison.gte;
  static lt = SymDbComparison.lt;
  static lte = SymDbComparison.lte;
  static startsWith = SymDbComparison.startsWith;
  static contains = SymDbComparison.contains;
  static between = SymDbComparison.between;
  static compare = SymDbComparison.compare;
  
  // Additional exports
  static patcher = patcher;

  constructor(opts: SymDbOptions) {
    super();

    this.root = opts.root;
    this.linkType = opts.linkType || SymDb.SYM_LINK;
    this.models = {};

    mixin(this);

    if (opts.blobs) {
      blobize(this);
    }
  }

  Model(name: string, schema: SchemaDefinition): SymDbModel {
    const model = new SymDbModel(this, name, schema);
    this.models[name] = model;
    this.emit('model', model);
    return model;
  }

  id(): string {
    return uuid();
  }

  writeJson(file: string, data: any, cb?: (err?: Error) => void): Promise<void> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.writeJson, file, data);
    }

    mkdirp(path.dirname(file), (err) => {
      if (err) {
        return cb(err);
      }
      fs.writeFile(file, JSON.stringify(data), cb);
    });
  }

  writeJsonSync(file: string, data: any): void {
    mkdirp.sync(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify(data));
  }

  readJson(file: string, cb?: (err: Error | null, data?: any) => void): Promise<any> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.readJson, file);
    }

    fs.readFile(file, (err, data) => {
      if (err) {
        return cb(err);
      }

      try {
        const parsedData = JSON.parse(data.toString());
        return cb(null, parsedData);
      } catch (e) {
        return cb(e);
      }
    });
  }

  readJsonSync(file: string): any {
    const data = fs.readFileSync(file);
    return JSON.parse(data.toString());
  }

  writeBlob(file: string, data: Buffer, cb?: (err?: Error) => void): Promise<void> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.writeBlob, file, data);
    }

    mkdirp(path.dirname(file), (err) => {
      if (err && err.code !== 'EEXIST') {
        return cb(err);
      }
      fs.writeFile(file, data, cb);
    });
  }

  writeBlobSync(file: string, data: Buffer): void {
    try {
      mkdirp.sync(path.dirname(file));
    } catch (err: any) {
      if (err && err.code !== 'EEXIST') {
        throw err;
      }
    }
    fs.writeFileSync(file, data);
  }

  readBlob(file: string, cb?: (err: Error | null, data?: Buffer) => void): Promise<Buffer> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.readBlob, file);
    }
    fs.readFile(file, cb);
  }

  readBlobSync(file: string): Buffer {
    return fs.readFileSync(file);
  }

  readBlobStream(file: string): fs.ReadStream {
    return fs.createReadStream(file);
  }

  readdir(
    dir: string, 
    filter?: ((filename: string) => boolean) | ((err: Error | null, files?: string[]) => void), 
    cb?: (err: Error | null, files?: string[]) => void
  ): Promise<string[]> | void {
    if (typeof filter === 'function' && !cb) {
      cb = filter as (err: Error | null, files?: string[]) => void;
      filter = null;
    }

    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.readdir, dir, filter);
    }

    fs.readdir(dir, (err, files) => {
      if (err) {
        return cb(err);
      }

      if (filter && typeof filter === 'function') {
        files = files.filter(filter as (filename: string) => boolean);
      }

      return cb(null, files);
    });
  }

  readdirSync(dir: string, filter?: (filename: string) => boolean): string[] {
    let files = fs.readdirSync(dir);
    if (filter) {
      files = files.filter(filter);
    }
    return files;
  }

  readdirs(
    dirs: string[],
    filter?: ((filename: string) => boolean) | ((err: Error | null, files?: string[][]) => void),
    cb?: (err: Error | null, files?: string[][]) => void
  ): Promise<string[][]> | void {
    if (typeof filter === 'function' && !cb) {
      cb = filter as (err: Error | null, files?: string[][]) => void;
      filter = null;
    }

    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.readdirs, dirs, filter);
    }

    const results: string[][] = [];

    if (!dirs.length) {
      return cb(null, results);
    }

    dirs.forEach((dir) => {
      fs.readdir(dir, (err, files) => {
        if (err) {
          return cb(err);
        }

        if (filter && typeof filter === 'function') {
          files = files.filter(filter as (filename: string) => boolean);
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

  readdirsSync(dirs: string[], filter?: (filename: string) => boolean): string[][] {
    const results: string[][] = [];

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

  delFile(p: string, cb?: (err?: Error) => void): Promise<void> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.delFile, p);
    }

    return fs.unlink(path.resolve(this.root, p), (err) => {
      if (err) {
        return cb(err);
      }
      return cb();
    });
  }

  delFileSync(p: string): void {
    return fs.unlinkSync(path.resolve(this.root, p));
  }

  linkFile(target: string, p: string, cb?: (err?: Error) => void): Promise<void> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.linkFile, target, p);
    }

    mkdirp(path.dirname(p), (err) => {
      if (err) {
        return cb(err);
      }

      if (this.linkType === SymDb.HARD_LINK) {
        fs.link(path.resolve(p, '../' + target), p, cb);
      } else if (this.linkType === SymDb.EMPTY_FILE) {
        fs.open(p, 'a', (err, fd) => {
          if (err) {
            return cb(err);
          }
          fs.close(fd, cb);
        });
      } else {
        fs.symlink(target, p, cb);
      }
    });
  }

  linkFileSync(target: string, p: string): void {
    mkdirp.sync(path.dirname(p));

    if (this.linkType === SymDb.HARD_LINK) {
      return fs.linkSync(path.resolve(p, '../' + target), p);
    } else if (this.linkType === SymDb.EMPTY_FILE) {
      fs.closeSync(fs.openSync(p, 'a'));
    } else {
      return fs.symlinkSync(target, p);
    }
  }
}

// Add mixin capabilities
mixin(SymDb);

export default SymDb;