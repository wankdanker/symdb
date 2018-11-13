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
var SymDb = require('symdb');

var db = new SymDb({ root : './db' });

var Product = db.Model('product', {
    product_id : Number
    , name : String
    , description : String
    , type : String
});

Product.add({
    product_id : 1
    , name : 'Test'
    , type : 'test-product'
}, function (err, obj) {
    console.log(obj); //you'll notice that the object now has a ._id attribute that is a uuid

    Product.get({ type : 'test-product' }, function (err, results) {
        console.log(results); //results is an array of objects whose type value is 'test-product'
    });
});
```

todo
----

- [ ] wildcard lookups
- [ ] case-insensitive lookups
- [ ] range lookups
- [x] lookups on non-indexed attributes
- [x] deep attribute indexing
- [ ] fulltext search
- [ ] fix cleanup of empty index directories
- [ ] rewrite .update() handling to not call delete() then save()
- [x] paging
- [x] sorting

license
-------

MIT