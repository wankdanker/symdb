import * as path from 'path';
import * as setValue from 'set-value';
import * as getValue from 'get-value';

export function blobize(db: any): void {
  db.on('model', function(model: any) {
    // extract the blobs from the object
    model.on('save:before', async function(event: any, cb: Function) {
      const obj = event.data;

      // search for Buffers or Streams (somehow)
      const blobs = event.blobs = getBlobs(obj);

      for (const deepkey in blobs) {
        const blob = blobs[deepkey];
        const blobPath = model.getPath('blob-object-key', obj, deepkey);

        await model.db.writeBlob(blobPath, blob);

        // set the value of the deepkey to null
        // this will be undone in save:after
        // this is to avoid saving the blob on the json object
        // but re-attach it after
        setValue(obj, deepkey, null);
      }

      return cb();
    });

    // reattach blobs after save
    model.on('save:after', function(event: any, cb: Function) {
      if (!event.blobs) {
        return cb();
      }

      const obj = event.data;
      const blobs = event.blobs;

      for (const deepkey in blobs) {
        const blob = blobs[deepkey];
        setValue(obj, deepkey, blob);
      }

      return cb();
    });

    // load all blobs from on disk for each record found
    model.on('get:after', async function(event: any, cb: Function) {
      const records = event.results;

      for (const obj of records) {
        const blobPath = model.getPath('blob-object-dir', obj);
        try {
          const keys = await model.db.readdir(blobPath);
          
          for (const key of keys) {
            const blob = await model.db.readBlob(path.join(blobPath, key));
            setValue(obj, key, blob);
          }
        } catch (e: any) {
          // rethrow e if the error code is something besides ENOENT (dir not found)
          if (e.code !== 'ENOENT') {
            throw e;
          }
        }
      }

      return cb();
    });

    // delete the blobs from on disk
    model.on('delete:after', async function(event: any, cb: Function) {
      const obj = event.data;
      const blobPath = model.getPath('blob-object-dir', obj);

      try {
        const keys = await model.db.readdir(blobPath);
        
        for (const key of keys) {
          await model.db.delFile(path.join(blobPath, key));
          setValue(obj, key, null);
        }
      } catch (e: any) {
        // rethrow e if the error code is something besides ENOENT (dir not found)
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }

      return cb();
    });
  });
}

export function getBlobs(obj: any, found?: {[key: string]: Buffer}, rootkey?: string): {[key: string]: Buffer} {
  found = found || {};
  rootkey = rootkey || '';

  Object.keys(obj).forEach(function(key) {
    const deepkey = (rootkey) ? rootkey + '.' + key : key;

    if (obj[key] instanceof Buffer) {
      found[deepkey] = obj[key];
    } else if (obj[key] instanceof Object && !(obj[key] instanceof Buffer)) {
      getBlobs(obj[key], found, deepkey);
    }
  });

  return found;
}