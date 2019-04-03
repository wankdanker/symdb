symdb
-----

A JSON database that uses symbolic links for indexing

reasoning
---------

There are a lot of JSON databases available on npm. Of the ones I investigated,
most store the objects for a collection in a single json file. Upon loading a
collection, the whole json file is loaded in to memory. While this is probably
the fastest method for accessing and updating objects in a collection, it could
be problematic for large collections. It also does not really lend itself to
replication in an easy way.

goals
-----

- Use the filesystem
  - each object should be stored in their own .json file
  - directories and symbolic links should be used for indexing

example
-------

```js
const SymDb = require('symdb');

const db = new SymDb({ root : './db' });

const Product = db.Model('product', {
    product_id : Number
    , name : String
    , description : String
    , type : String
});

async function go() {
    let obj = await Product.add({
        product_id : 1
        , name : 'Test'
        , type : 'test-product'
    });

    //you'll notice that the object now has a ._id attribute that is a uuid
    console.log(obj); 

    let results = await Product.get({ type : 'test-product' });

    //results is an array of objects whose type value is 'test-product'
    console.log(results);
}

go();
```

api
---

### symdb = new SymDb(opts)

* **opts.root** - string - the path to the root directory in which database files should be stored

## Model = symdb.Model(name, schema)

* **name** - string - the name of the model/collection
* **schema** - object - an object which contains `key:Type` pairs 
  * the `Types` are generally, `String`, `Number`, or some other function that will format the value to how you want it indexed. 
  * **NOTE**: this is not thoroughly tested and needs love

### Model.get(lookup[, context][, callback]) => Promise

```js
let results = Model.get({
    weight : SymDb.gt(42)
});

// alse these
SymDb.gt(10)
SymDb.gte(10)
SymDb.lt(9)
SymDb.lte(9)
SymDb.startsWith('bart')
SymDb.contains('bart')
SymDb.between(1, 10)
SymDb.contains(['a','b', 'c'])
SymDb.compare(function (z) { return z === 1234 })
```

### Model.add(obj[, context][, callback]) => Promise

### Model.update(obj[, context][, callback]) => Promise

### Model.del(obj[, context][, callback]) => Promise

## Model Events

Example:

```js
Model.on('update:before', (event, cb) => {
    //cb must be called when done;

    event.data.password = null;

    return cb();
});
```
Callback with an error to prevent the operation from continuing 

```js
Model.on('add:before', (event, cb) => {
    if (!event.user.canAdd) {
        return cb(new Error('user does not have add permissions'));
    }

    return cb();
});

try {
    let obj = await Model.add({ href : 'https://www.google.com' }, { user : { canAdd : false } });
}
catch (e) {
    //should have thrown 'user does not have add permissions'
}
```

### Model.on('get:before', (event, cb) => {})

### Model.on('get:after', (event, cb) => {})

### Model.on('add:before', (event, cb) => {})

### Model.on('add:after', (event, cb) => {})

### Model.on('update:before', (event, cb) => {})

### Model.on('update:after', (event, cb) => {})

### Model.on('delete:before', (event, cb) => {})

### Model.on('delete:after', (event, cb) => {})

### Model.on('save:before', (event, cb) => {})

### Model.on('save:after', (event, cb) => {})


todo
----

- [ ] docs
- [ ] wildcard lookups
- [ ] case-insensitive lookups
- [ ] range lookups
- [x] lookups on non-indexed attributes
- [x] deep attribute indexing
- [ ] fulltext search
- [ ] fix cleanup of empty index directories
- [x] rewrite .update() handling to not call delete() then save()
- [x] paging
- [x] sorting
- [ ] https://github.com/davedoesdev/getdents
- [ ] automatic blob storage (Buffers, ReadStreams, SymDbFile)
  - [x] Buffers
  - [ ] Readable Streams
  - [ ] SymDbFile (a wrapper around a long string to be stored in a file outside of the json object)
  - [ ] need to handle deleting blobs on update:before
  - [ ] toggle blobs on/off per db/model
- [ ] change on-disk format to have a wrapping json object that contains metadata
  - [ ] does the object have blobs? 
  - [ ] if so, which keys?
  - [ ] keep symbolic links references in the metadata?

license
-------

MIT