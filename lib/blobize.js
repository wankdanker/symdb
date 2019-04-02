var join = require('path').join;
var setValue = require('set-value');
var getValue = require('get-value');

module.exports = blobize;
module.exports.getBlobs = getBlobs;

function blobize(db) {
    db.on('model', function (model) {

        //extract the blobs from the object
        model.on('save:before', async function (event, cb) {
            var obj = event.data;

            //search for Buffers or Streams (somehow)
            var blobs = event.blobs = getBlobs(obj);

            for (var deepkey in blobs) {
                var blob = blobs[deepkey];

                var path = model.getPath('blob-object-key', obj, deepkey);

                await model.db.writeBlob(path, blob);

                //set the value of the deepkey to null
                //this will be undone in save:after
                //this is to avoid saving the blob on the json object
                //but re-attach it after
                setValue(obj, deepkey, null);
            }

            return cb();
        });

        //reattach blobs after save
        model.on('save:after', function (event, cb) {
            if (!event.blobs) {
                return cb();
            }
            
            var obj = event.data;
            var blobs = event.blobs

            for (var deepkey in blobs) {
                var blob = blobs[deepkey];

                setValue(obj, deepkey, blob);
            }

            return cb();
        });

        //load all blobs from on disk for each record found
        model.on('get:after', async function (event, cb) {
            var records = event.results;

            for (var obj of records) {
                var path = model.getPath('blob-object-dir', obj);
                try {
                    var keys = await model.db.readdir(path);
                } 
                catch (e) {
                    //rethrow e if the error code is something besides ENOENT (dir not found)
                    if (e.code !== 'ENOENT') {
                        throw e;
                    }

                    keys = [];
                }

                for (var key of keys) {
                    var blob = await model.db.readBlob(join(path, key));

                    setValue(obj, key, blob);
                }
            }

            return cb();
        });

        //delete the blobs from on disk
        model.on('delete:after', async function (event, cb) {
            var obj = event.data;

            var path = model.getPath('blob-object-dir', obj);
            
            try {
                var keys = await model.db.readdir(path);
            } 
            catch (e) {
                //rethrow e if the error code is something besides ENOENT (dir not found)
                if (e.code !== 'ENOENT') {
                    throw e;
                }

                keys = [];
            }

            for (var key of keys) {
                var blob = await model.db.delFile(join(path, key));

                setValue(obj, key, blob);
            }
        

            return cb();
        });
    });
}

//TODO: this needs to be expanded to find things more better. 
function getBlobs(obj, found, rootkey) {
    found = found || {};
    rootkey = rootkey || '';

    Object.keys(obj).forEach(function (key) {
        var deepkey = (rootkey) ? rootkey + '.' + key : key;

        if (obj[key] instanceof Buffer) {
            found[deepkey] = obj[key];
        }
        else if (obj[key] instanceof Object) {
            getBlobs(obj[key], found, deepkey);
        }
    });

    return found;
}