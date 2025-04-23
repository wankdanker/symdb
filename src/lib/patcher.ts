import { default as extend } from 'extend';

export function patcher (map: { [key: string]: string }) {
    return function (context: any, cb: Function) {
        const object = context.data;
        const lookup: { [key: string]: any } = {};

        Object.keys(map).forEach(function (src) {
            const dst = map[src];
            if (object.hasOwnProperty(src)) {
                lookup[dst] = object[src];
            }
        });

        context.model
            .get(lookup)
            .then(function (objects: any[]) {
                if (objects.length !== 1) {
                    return Promise.reject(new Error('object not found'));
                }

                // merge the attributes of the saved object into the current object
                extend(true, object, extend(true, {}, objects[0], object));

                return cb();
            })
            .catch(cb);
    };
}