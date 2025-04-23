import * as path from 'path';
import * as getValue from 'get-value';
import * as doWhile from 'dank-do-while';
import { EventPipeline } from 'event-pipeline';
import { IndexSearch } from './index-search';
import { ScanSearch } from './scan-search';
import { Promised } from './promise';
import { page as arrayPage } from 'array-page';
import { sort } from './sort';

export type PathType = 
  | 'store'
  | 'store-path'
  | 'link-target'
  | 'symlink'
  | 'symlink-relative'
  | 'index-links'
  | 'index-val-path'
  | 'index-path'
  | 'blob-object-key'
  | 'blob-object-dir'
  | 'blob-dir';

export interface SymDbModelContext {
  data?: any;
  model?: SymDbModel;
  session?: any;
  lookup?: any;
  results?: any[];
  blobs?: {[key: string]: Buffer};
  result?: any;
}

const noop = function() {};

export class SymDbModel extends EventPipeline {
  db: any;
  name: string;
  schema: any;
  root: string;
  paging?: { page: number; size: number };
  sorting?: { [key: string]: string };

  constructor(db: any, name: string, schema: any) {
    super();

    this.db = db;
    this.name = name;
    this.schema = schema;
    this.root = path.join(this.db.root, this.name);
  }

  /**
   * Get a path for an object/symlink relationship
   */
  getPath(type: PathType, obj?: any, index?: string, val?: any): string {
    // force val to a string because path.join doesn't work on numbers
    if (val !== undefined) {
      val = String(val);
    }

    switch (type) {
      case 'store':
        return path.join(this.root, 'store', obj._id + '.json');
      case 'store-path':
        return path.join(this.root, 'store');
      case 'link-target':
        return path.join('../', '../', '../', 'store', obj._id + '.json');
      case 'symlink':
        return path.join(this.root, 'index', index, val, obj._id);
      case 'symlink-relative':
        return path.join('./', this.name, 'index', index, val, obj._id);
      case 'index-links':
        return path.join(this.root, 'index-links', obj._id + '.json');
      case 'index-val-path':
        return path.join(this.root, 'index', index, val);
      case 'index-path':
        return path.join(this.root, 'index', index);
      case 'blob-object-key':
        return path.join(this.root, 'blob', obj._id, index);
      case 'blob-object-dir':
        return path.join(this.root, 'blob', obj._id);
      case 'blob-dir':
        return path.join(this.root, 'blob');
      default:
        throw new Error(`Unknown path type: ${type}`);
    }
  }

  /**
   * Save an object.
   */
  save(obj: any, context?: SymDbModelContext | ((err?: Error, result?: any) => void), cb?: (err?: Error, result?: any) => void): Promise<any> | void {
    // set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
      cb = context as (err?: Error, result?: any) => void;
      context = {};
    }

    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.save, obj, context);
    }

    cb = cb || noop;

    obj._id = obj._id || this.id();

    // make sure that obj is the data element on the context object
    context.data = obj;
    context.model = this;

    return this.emit('save:before', context, (err?: Error) => {
      if (err) {
        return cb(err);
      }

      return this.write(obj, (err?: Error) => {
        if (err) {
          return cb(err);
        }

        return this.emit('save:after', context, (err?: Error) => {
          return cb(err, obj);
        });
      });
    });
  }

  /**
   * Save an object synchronously
   */
  saveSync(obj: any, context?: SymDbModelContext): any {
    // set up a default context if it does not exist
    if (context === undefined) {
      context = {};
    }

    obj._id = obj._id || this.id();

    // make sure that obj is the data element on the context object
    context.data = obj;
    context.model = this;

    this.emit('save-sync:before', context);
    this.writeSync(obj);
    this.emit('save-sync:after', context);

    return obj;
  }

  /**
   * Write an object.
   * You might actually want to use save.
   */
  write(obj: any, cb?: (err?: Error) => void): Promise<void> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.write, obj);
    }

    cb = cb || noop;
    const file = this.getPath('store', obj);

    return this.db.writeJson(file, obj, (err?: Error) => {
      if (err) {
        return cb(err);
      }

      return this.index(obj, cb);
    });
  }

  /**
   * Write an object synchronously.
   * You might actually want to use saveSync instead.
   */
  writeSync(obj: any): void {
    const file = this.getPath('store', obj);
    this.db.writeJsonSync(file, obj);
    this.indexSync(obj);
  }

  /**
   * Generate a unique id
   */
  id(): string {
    return this.db.id();
  }

  /**
   * Create the index links for this object based on schema
   */
  index(obj: any, cb?: (err?: Error) => void): Promise<void> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.index, obj);
    }

    const links: string[] = [];
    const keys = [...Object.keys(this.schema), '_id'];
    const target = this.getPath('link-target', obj);

    doWhile(
      (next: (proceed: boolean) => void) => {
        const key = keys.shift();

        if (!key) {
          return next(false);
        }

        // Get value - may be deep in the object
        const val = getValue(obj, key);

        // If val is an array, then we should index each value in the array
        if (Array.isArray(val) && val.length) {
          // Create a hash table for unique values indexed
          // If we try to create multiple indexes for the same val
          // then we get errors
          const unique: { [key: string]: number } = {};

          return Promise.all(
            val.map((item) => {
              if (unique[item]) {
                // Keep track of the number of times this val occurs
                // May be useful later for weighting things
                unique[item] += 1;
                return;
              }

              unique[item] = 1;

              const link = this.getPath('symlink', obj, key, item);
              const linkRelative = this.getPath('symlink-relative', obj, key, item);

              links.push(linkRelative);

              return this.db.linkFile(target, link);
            })
          )
            .then(() => {
              return next(true);
            })
            .catch((err: Error) => {
              if ((err as any).code === 'EEXIST') {
                return next(true);
              }

              return cb(err);
            });
        }

        const link = this.getPath('symlink', obj, key, val);
        const linkRelative = this.getPath('symlink-relative', obj, key, val);

        links.push(linkRelative);

        this.db.linkFile(target, link, (err?: Error) => {
          if (err && (err as any).code !== 'EEXIST') {
            return cb(err);
          }

          return next(true);
        });
      },
      () => {
        const p = this.getPath('index-links', obj);
        this.db.writeJson(p, links, cb);
      }
    );
  }

  /**
   * Create the index links for this object based on schema
   */
  indexSync(obj: any): void {
    const links: string[] = [];
    const keys = [...Object.keys(this.schema), '_id'];
    const target = this.getPath('link-target', obj);

    for (const key of keys) {
      // Get value - may be deep in the object
      const val = getValue(obj, key);

      // If val is an array, then we should index each value in the array
      if (Array.isArray(val) && val.length) {
        // Create a hash table for unique values indexed
        // If we try to create multiple indexes for the same val
        // then we get errors
        const unique: { [key: string]: number } = {};

        for (const item of val) {
          if (unique[item]) {
            // Keep track of the number of times this val occurs
            // May be useful later for weighting things
            unique[item] += 1;
            continue;
          }

          unique[item] = 1;

          const link = this.getPath('symlink', obj, key, item);
          const linkRelative = this.getPath('symlink-relative', obj, key, item);

          links.push(linkRelative);

          try {
            this.db.linkFileSync(target, link);
          } catch (err: any) {
            // Ignore EEXIST errors
            if (err.code !== 'EEXIST') {
              throw err;
            }
          }
        }
      } else {
        const link = this.getPath('symlink', obj, key, val);
        const linkRelative = this.getPath('symlink-relative', obj, key, val);

        links.push(linkRelative);

        try {
          this.db.linkFileSync(target, link);
        } catch (err: any) {
          // Ignore EEXIST errors
          if (err.code !== 'EEXIST') {
            throw err;
          }
        }
      }
    }

    const p = this.getPath('index-links', obj);
    this.db.writeJsonSync(p, links);
  }

  /**
   * Add a new object and index it
   */
  add(obj: any, context?: SymDbModelContext | ((err?: Error, result?: any) => void), cb?: (err?: Error, result?: any) => void): Promise<any> | void {
    // Set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
      cb = context as (err?: Error, result?: any) => void;
      context = {};
    }

    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.add, obj, context);
    }

    cb = cb || noop;

    // Make sure that obj is the data element on the context object
    context.data = obj;
    context.model = this;

    return this.emit('add:before', context, (err?: Error) => {
      if (err) {
        return cb(err);
      }

      return this.save(obj, context, (err?: Error) => {
        if (err) {
          return cb(err);
        }

        return this.emit('add:after', context, (err?: Error) => {
          if (err) {
            return cb(err);
          }

          return cb(null, obj);
        });
      });
    });
  }

  /**
   * Add a new object and index it synchronously
   */
  addSync(obj: any, context?: SymDbModelContext): any {
    // Set up a default context if it does not exist
    if (context === undefined) {
      context = {};
    }

    // Make sure that obj is the data element on the context object
    context.data = obj;
    context.model = this;

    this.emit('add-sync:before', context);
    this.saveSync(obj, context);
    this.emit('add-sync:after', context);

    return obj;
  }

  /**
   * Update an existing object by modifying indexes and resaving the object
   */
  update(obj: any, context?: SymDbModelContext | ((err?: Error, result?: any) => void), cb?: (err?: Error, result?: any) => void): Promise<any> | void {
    // Set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
      cb = context as (err?: Error, result?: any) => void;
      context = {};
    }

    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.update, obj, context);
    }

    cb = cb || noop;

    // Make sure that obj is the data element on the context object
    context.data = obj;
    context.model = this;

    return this.emit('update:before', context, (err?: Error) => {
      if (err) {
        return cb(err);
      }

      this.delIndexes(obj)
        .then(() => {
          return this.save(obj, context);
        })
        .then((result) => {
          context.result = context;
          return this.emit('update:after', context, (err?: Error) => {
            if (err) {
              return cb(err);
            }
            return cb(null, result);
          });
        })
        .catch((err) => {
          return cb(err);
        });
    });
  }

  /**
   * Update an existing object by modifying indexes and resaving the object synchronously
   */
  updateSync(obj: any, context?: SymDbModelContext): any {
    // Set up a default context if it does not exist
    if (context === undefined) {
      context = {};
    }

    // Make sure that obj is the data element on the context object
    context.data = obj;
    context.model = this;

    this.emit('update-sync:before', context);
    this.delIndexesSync(obj);
    context.result = this.saveSync(obj, context);
    this.emit('update-sync:after', context);

    return context.result;
  }

  /**
   * Set the page size
   * 
   * @note this must be called right before .sort() or .get()
   */
  page(page: number, size: number): this {
    this.paging = { page, size };
    return this;
  }

  /**
   * Set the sort order
   * 
   * @note this must be called right before .page() or .get()
   */
  sort(sorts: { [key: string]: string }): this {
    this.sorting = sorts;
    return this;
  }

  /**
   * Get an object from the collection
   */
  get(
    lookup?: any,
    context?: SymDbModelContext | ((err?: Error, result?: any[]) => void),
    cb?: (err?: Error, result?: any[]) => void
  ): Promise<any[]> | void {
    if (typeof lookup === 'function') {
      cb = lookup as (err?: Error, result?: any[]) => void;
      lookup = {};
    }

    if (!lookup) {
      lookup = {};
    }

    // Set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
      cb = context as (err?: Error, result?: any[]) => void;
      context = {};
    }

    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.get, lookup, context);
    }

    const paging = this.paging;
    const sorting = this.sorting;
    // Clear the paging object so it doesn't interfere with future calls
    delete this.paging;
    delete this.sorting;

    cb = cb || noop;

    // Set the lookup on the context object
    context.lookup = lookup;
    context.model = this;

    const self = this;
    
    this.emit('get:before', context, (err?: Error) => {
      if (err) {
        return cb(err);
      }

      // If lookup contains indexed fields then we should use those
      // to find data in the index
      const lookups = Object.keys(lookup);
      const indexes = lookups.filter((key) => {
        return this.schema[key];
      });

      // If all of the lookups are on indexed fields then we can do an
      // index search
      if (indexes.length && indexes.length === lookups.length) {
        IndexSearch(this, lookup, done);
      } else {
        ScanSearch(this, lookup, done);
      }
    });

    function done(err: Error | null, results: any[] = []) {
      if (err) {
        return cb(err);
      }
      
      if (sorting) {
        results = sort(results, sorting);
      }

      if (paging) {
        results = arrayPage(results, paging.page, paging.size);
      }

      context.results = results;

      self.emit('get:after', context, (err?: Error) => {
        if (err) {
          return cb(err);
        }
        return cb(null, results);
      });
    }
  }

  /**
   * Get an object from the collection synchronously
   */
  getSync(lookup?: any, context?: SymDbModelContext): any[] {
    if (!lookup) {
      lookup = {};
    }

    // Set up a default context if it does not exist
    if (context === undefined) {
      context = {};
    }

    const paging = this.paging;
    const sorting = this.sorting;
    // Clear the paging object so it doesn't interfere with future calls
    delete this.paging;
    delete this.sorting;

    // Set the lookup on the context object
    context.lookup = lookup;
    context.model = this;

    this.emit('get-sync:before', context);

    // If lookup contains indexed fields then we should use those
    // to find data in the index
    const lookups = Object.keys(lookup);
    const indexes = lookups.filter((key) => {
      return this.schema[key];
    });

    let results: any[];

    // If all of the lookups are on indexed fields then we can do an
    // index search
    if (indexes.length && indexes.length === lookups.length) {
      results = IndexSearch.sync(this, lookup);
    } else {
      results = ScanSearch.sync(this, lookup);
    }

    if (sorting) {
      results = sort(results, sorting);
    }

    if (paging) {
      results = arrayPage(results, paging.page, paging.size);
    }

    context.results = results;

    this.emit('get-sync:after', context);

    return results;
  }

  /**
   * Delete an object from the collection
   */
  del(
    obj: any,
    context?: SymDbModelContext | ((err?: Error, result?: any) => void),
    cb?: (err?: Error, result?: any) => void
  ): Promise<any> | void {
    // Set up a default context if it does not exist
    if (context === undefined || typeof context === 'function') {
      cb = context as (err?: Error, result?: any) => void;
      context = {};
    }

    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.del, obj, context);
    }

    cb = cb || noop;

    // Make sure that obj is the data element on the context object
    context.data = obj;
    context.model = this;

    return this.emit('delete:before', context, (err?: Error) => {
      if (err) {
        return cb(err);
      }

      return this.delIndexes(obj, (err?: Error) => {
        // TODO: do we care if we could not delete indexes?

        const p1 = this.getPath('store', obj);

        // Delete the json file
        return this.db.delFile(p1, (err?: Error) => {
          if (err) {
            return cb(err);
          }

          return this.emit('delete:after', context, (err?: Error) => {
            return cb(err, obj);
          });
        });
      });
    });
  }

  /**
   * Delete an object from the collection synchronously
   */
  delSync(obj: any, context?: SymDbModelContext): any {
    // Set up a default context if it does not exist
    if (context === undefined) {
      context = {};
    }

    // Make sure that obj is the data element on the context object
    context.data = obj;
    context.model = this;

    this.emit('delete-sync:before', context);

    try {
      this.delIndexesSync(obj);
    } catch (err) {
      // TODO: do we care if we could not delete indexes?
    }

    const p1 = this.getPath('store', obj);

    // Delete the json file
    this.db.delFileSync(p1);
    this.emit('delete:after', context);

    return obj;
  }

  /**
   * Delete an object's indexes
   */
  delIndexes(obj: any, cb?: (err?: Error, result?: any) => void): Promise<any> | void {
    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.delIndexes, obj);
    }

    cb = cb || noop;

    const p1 = this.getPath('index-links', obj);

    this.db.readJson(p1, (err?: Error, links?: string[]) => {
      if (err && (err as any).code !== 'ENOENT') {
        // Only call back with error if the error
        // is something other than file not found
        return cb(err);
      }

      let count = 0;

      links = links || [];
      links.push(p1);

      links.forEach((link) => {
        this.db.delFile(link, (err?: Error) => {
          if (err && (err as any).code === 'ENOENT') {
            // Deleting a file that is already gone
            // should not be a problem.
            err = null;
          }

          count += 1;

          if (count === links.length) {
            return cb(err, obj);
          }
        });
      });
    });
  }

  /**
   * Delete an object's indexes synchronously
   */
  delIndexesSync(obj: any): any {
    const p1 = this.getPath('index-links', obj);

    let links: string[];
    try {
      links = this.db.readJsonSync(p1);
    } catch (e) {
      links = [];
    }

    links = links || [];
    links.push(p1);

    for (const link of links) {
      try {
        this.db.delFileSync(link);
      } catch (e) {
        // TODO: do we care about this?
      }
    }

    return obj;
  }

  /**
   * Delete and add an objects indexes
   */
  reindex(
    lookup?: any,
    cb?: (err?: Error) => void
  ): Promise<boolean> | void {
    if (typeof lookup === 'function') {
      cb = lookup as (err?: Error) => void;
      lookup = {};
    }

    if (!lookup) {
      lookup = {};
    }

    // If no callback function provided, then return a Promise
    if (cb === undefined) {
      return Promised(this, this.reindex, lookup);
    }

    cb = cb || noop;

    return this.get(lookup, (err?: Error, objects?: any[]) => {
      if (err) {
        return cb(err);
      }

      objects = objects || [];

      doWhile(
        (next: (proceed: boolean) => void) => {
          const obj = objects.shift();

          if (!obj) {
            return next(false);
          }

          return this.delIndexes(obj)
            .then(() => {
              return this.index(obj);
            })
            .then(() => {
              return next(true);
            })
            .catch((err: Error) => {
              return cb(err);
            });
        },
        () => {
          // TODO: what do we want to return here? number of reindexed objects? true/false?
          return cb();
        }
      );
    });
  }

  /**
   * Delete and add an object's indexes synchronously
   */
  reindexSync(lookup?: any): boolean {
    if (!lookup) {
      lookup = {};
    }

    const objects = this.getSync(lookup);

    for (const obj of objects) {
      this.delIndexesSync(obj);
      this.index(obj);
    }

    return true;
  }
}