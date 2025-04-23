import { SymDbComparison } from './compare';
import * as path from 'path';
import { default as intersect } from 'fast_array_intersect';
import * as doWhile from 'dank-do-while';

export function IndexSearch(model: any, search: any, cb: (err: Error | null, results: any[]) => void): void {
  const directories: (string | string[])[] = [];
  const found: string[][] = [];
  const comparisons: SymDbComparison[] = [];
  const lookups = Object.keys(search);
  
  const indexes = lookups.filter((key) => {
    const val = search[key];
    if (val == undefined || val == null) {
      return false;
    }

    // Check to see if val is a SymDbComparison
    if (val instanceof SymDbComparison) {
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

    if (val instanceof SymDbComparison) {
      p = model.getPath('index-path', null, index);

      return model.db.readdir(p, (err?: Error, dirs?: string[]) => {
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
        model.db.readdirs(dir, (err?: Error, dirs?: string[][]) => {
          const ids = [].concat.apply([], dirs || []);

          const fileIds = ids.map((f) => {
            return path.basename(f, '.json');
          });

          found.push(fileIds);

          check();
        });
      } else {
        model.db.readdir(dir, (err?: Error, ids?: string[]) => {
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
      const matches = intersect(found);

      if (!matches.length) {
        return cb(null, []);
      }

      return load(matches);
    }
  }

  function load(matches: string[]) {
    let x = 0;
    const results: any[] = [];

    if (!matches.length) {
      return cb(null, results);
    }

    doWhile(
      (next: (proceed: boolean) => void) => {
        const match = matches[x++];

        if (!match) {
          return next(false);
        }

        const p = model.getPath('store', { _id: match });

        model.db.readJson(p, (err?: Error, obj?: any) => {
          // TODO: handle err?

          if (obj) {
            results.push(obj);
          }

          return next(true);
        });
      },
      () => {
        return cb(null, results);
      },
      4
    );
  }
}

// Async (Promise-based) version
IndexSearch.async = async function async(model: any, search: any): Promise<any[]> {
  const directories: (string | string[])[] = [];
  const found: string[][] = [];
  const comparisons: SymDbComparison[] = [];
  const results: any[] = [];
  const lookups = Object.keys(search);
  
  const indexes = lookups.filter((key) => {
    const val = search[key];
    if (val == undefined || val == null) {
      return false;
    }

    // Check to see if val is a SymDbComparison
    if (val instanceof SymDbComparison) {
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
  } else {
    // For each indexed field, get a list of the directories we should load
    for (const index of indexes) {
      const val = search[index];
      let p = '';

      if (val instanceof SymDbComparison) {
        p = model.getPath('index-path', null, index);

        let dirs: string[] = [];
        try {
          dirs = await model.db.readdir(p);
        } catch (err) {
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
      } else {
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
      let dirs: string[][] = [];
      try {
        dirs = await model.db.readdirs(dir);
      } catch (err) {
        // TODO: ignore only path not found errors?
      }

      let ids = [].concat.apply([], dirs);

      ids = ids.map((f: string) => {
        return path.basename(f, '.json');
      });

      found.push(ids);
    } else {
      let ids: string[] = [];
      try {
        ids = await model.db.readdir(dir);
      } catch (err) {
        // TODO: ignore only path not found errors?
      }

      ids = ids || [];

      ids = ids.map((f) => {
        return path.basename(f, '.json');
      });

      found.push(ids);
    }
  }

  const matches = intersect(found);

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
    } catch (err) {
      // TODO: handle err?
    }
  }

  return results;
};

// Synchronous version
IndexSearch.sync = function sync(model: any, search: any): any[] {
  const directories: (string | string[])[] = [];
  const found: string[][] = [];
  const comparisons: SymDbComparison[] = [];
  const results: any[] = [];
  const lookups = Object.keys(search);
  
  const indexes = lookups.filter((key) => {
    const val = search[key];
    if (val == undefined || val == null) {
      return false;
    }

    // Check to see if val is a SymDbComparison
    if (val instanceof SymDbComparison) {
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
  } else {
    // For each indexed field, get a list of the directories we should load
    for (const index of indexes) {
      const val = search[index];
      let p = '';

      if (val instanceof SymDbComparison) {
        p = model.getPath('index-path', null, index);
        
        let dirs: string[] = [];
        try {
          dirs = model.db.readdirSync(p);
        } catch (err) {
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
      } else {
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
      let dirs: string[][] = [];
      try {
        dirs = model.db.readdirsSync(dir);
      } catch (err) {
        // TODO: ignore only path not found errors?
      }

      let ids = [].concat.apply([], dirs);

      ids = ids.map((f: string) => {
        return path.basename(f, '.json');
      });

      found.push(ids);
    } else {
      let ids: string[] = [];
      try {
        ids = model.db.readdirSync(dir);
      } catch (err) {
        // TODO: ignore only path not found errors?
      }

      ids = ids || [];

      ids = ids.map((f) => {
        return path.basename(f, '.json');
      });

      found.push(ids);
    }
  }
  
  const matches = intersect(found);

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
    } catch (err) {
      // TODO: handle err?
    }
  }

  return results;
}