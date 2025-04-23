import { SymDbComparison } from './compare';
import * as path from 'path';
import * as each from 'dank-each';
import * as getValue from 'get-value';
import * as doWhile from 'dank-do-while';

export function ScanSearch(model: any, search: any, cb: (err: Error | null, results: any[]) => void): void {
  // If there are no search keys, then we should be loading everything
  const loadAll = !Object.keys(search).length;
  const found: string[][] = [];
  const results: any[] = [];

  const p = model.getPath('store-path');

  return model.db.readdir(p, (err?: Error, ids?: string[]) => {
    ids = ids || [];

    found.push(ids);
    ids = ids.map((f) => {
      return path.basename(f, '.json');
    });

    load(ids);
  });

  function load(matches: string[]) {
    let x = 0;

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

          if (loadAll || check(obj)) {
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

  function check(obj: any): boolean {
    let result = true;

    each(search, (key: string, val: any, end: Function) => {
      if (val instanceof SymDbComparison) {
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

ScanSearch.async = async function async(model: any, search: any): Promise<any[]> {
  // If there are no search keys, then we should be loading everything
  const loadAll = !Object.keys(search).length;
  const found: string[][] = [];
  const results: any[] = [];

  const p = model.getPath('store-path');

  let ids: string[] = [];
  try {
    ids = await model.db.readdir(p);
  } catch (e: any) {
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
    let obj: any;

    try {
      obj = await model.db.readJson(p);
    } catch (err) {
      // TODO: handle err?
      continue;
    }

    if (loadAll || check(obj)) {
      results.push(obj);
    }
  }

  return results;

  function check(obj: any): boolean {
    let result = true;

    each(search, (key: string, val: any, end: Function) => {
      if (val instanceof SymDbComparison) {
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

ScanSearch.sync = function sync(model: any, search: any): any[] {
  // If there are no search keys, then we should be loading everything
  const loadAll = !Object.keys(search).length;
  const found: string[][] = [];
  const results: any[] = [];

  const p = model.getPath('store-path');

  let ids: string[] = [];
  try {
    ids = model.db.readdirSync(p);
  } catch (e) {
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
    let obj: any;

    try {
      obj = model.db.readJsonSync(p);
    } catch (err) {
      // TODO: handle err?
      continue;
    }

    if (loadAll || check(obj)) {
      results.push(obj);
    }
  }

  return results;

  function check(obj: any): boolean {
    let result = true;

    each(search, (key: string, val: any, end: Function) => {
      if (val instanceof SymDbComparison) {
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