var extend = require('extend');

module.exports = patcher;

/**
 * 
 *
 * @param {*} map lookup map = { incomingObjectKey1 : lookupKey1, incomingObjectKey2 : lookupKey2 }
 * @returns function
 */
function patcher(map) {

    return function (context, cb) {
        var object = context.data;
        var lookup = {};
        
        Object.keys(map).forEach(function (src) {
            var dst = map[src];

            if (object.hasOwnProperty(src)) {
                lookup[dst] = object[src];
            }
        });

        context.model.get(lookup)
            .then(function (objects) {
                if (objects.length !== 1) {
                    return Promise.reject(new Error('object not found'));
                }

                //merge the attributes of the saved object into the current object
                extend(true, object, extend(true, {}, objects[0], object));
                
                return cb();
            })
            .catch(cb)
    }
}
