var JephDB = require("../JephDB"),
	MemoryStore = require("../MemoryStore"),
	Entity = require("../Entity");
	Query = require("../Query");

test("JephDB()", function () {
	try { new JephDB(new MemoryStore); } catch (e) { assert(false, "should not throw"); }
	try { new JephDB; assert(false, "did not throw"); } catch (e) {}
});

test("JephDB.prototype.create()", function () {
	var db = new JephDB(new MemoryStore);

	assertNotEqual(db.create().id, db.create().id);

	var e = db.create("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assert(e instanceof Entity);
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assert(e.isDirty());
	assertEqual(db.create("da39a3ee5e6b4b0d3255bfef95601890afd80709"), e);

	var e = db.create({ foo: "bar" });
	assert(e instanceof Entity);
	assertEqual(e.get("foo"), "bar");
	assertEqual(e.getMeta("foo"), undefined);
	assert(e.isDirty());

	var e = db.create(undefined, { foo: "bar" });
	assert(e instanceof Entity);
	assertEqual(e.get("foo"), undefined);
	assertEqual(e.getMeta("foo"), "bar");
	assert(e.isDirty());

	var e = db.create("c40659d10a9e77b78e164ea6e1e161d20286acfe", { foo: "data" }, { foo: "metadata" });
	assert(e instanceof Entity);
	assertEqual(e.id, "c40659d10a9e77b78e164ea6e1e161d20286acfe");
	assertEqual(e.get("foo"), "data");
	assertEqual(e.getMeta("foo"), "metadata");
	assert(e.isDirty());
});

test("JephDB.prototype.get()", function () {
	var db = new JephDB(new MemoryStore);
	assert(db.store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", { foo: "data" }, { foo: "metadata" }));

	var e = db.get("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assert(e instanceof Entity);
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.get("foo"), "data");
	assertEqual(e.getMeta("foo"), "metadata");
	assert(!e.isDirty());

	assertEqual(db.get("da39a3ee5e6b4b0d3255bfef95601890afd80709"), e);

	var e = db.get("311ef27c77cf9d41ec6b4ff2251d3f4426f8691e");
	assert(e instanceof Entity);
	assertEqual(e.id, "311ef27c77cf9d41ec6b4ff2251d3f4426f8691e");
	assertEqual(e.get("foo"), undefined);
	assertEqual(e.getMeta("foo"), undefined);
	assert(e.isDirty());
});

test("JephDB.prototype.query()", function () {
	var db = new JephDB(new MemoryStore);
	assert(db.store.save("311ef27c77cf9d41ec6b4ff2251d3f4426f8691e", { a: "foo" }));
	assert(db.store.save("f94053878039f2100ded7df35b36687f56e1f64b", { a: "bar" }));
	assert(db.store.save("d7488d63755138faebf8eaafbb5b872a77793dbd", { }));
	assert(db.store.save("4cb7242c5c78617580d19d5fe5649db9bc16fd49", { }));
	assert(db.store.save("084bfcd85205bbe8aa0c35058bb4eb9a08578427", { }));

	db.query({}, function (err, result) {
		assert(!err);
		assert(Array.isArray(result));
		assertEqual(result.length, 5);
		assertEqual(result.map(function (e) { return e.id; }).join(), "311ef27c77cf9d41ec6b4ff2251d3f4426f8691e,f94053878039f2100ded7df35b36687f56e1f64b,d7488d63755138faebf8eaafbb5b872a77793dbd,4cb7242c5c78617580d19d5fe5649db9bc16fd49,084bfcd85205bbe8aa0c35058bb4eb9a08578427");
	});

	db.query({ a: true }, function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "foo,bar");
	});

	db.query({ a: false }, function (err, result) {
		assert(!err);
		assertEqual(result.length, 3);
		assertEqual(result.map(function (e) { return String(e.get("a")); }).join(), "undefined,undefined,undefined");
	});

	db.query({ a: true }, { a: 1 }, function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "bar,foo");
	});

	db.query({ a: true }, { a: -1 }, function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "foo,bar");
	});

	db.query({ a: true }, {}, 1, function (err, e) {
		assert(!err);
		assert(e instanceof Entity, "limit is 1, should return just the first entity");
		assertEqual(e.get("a"), "foo");
	});

	db.query({ a: true }, {}, 1, 1, function (err, e) {
		assert(!err);
		assert(e instanceof Entity, "limit is 1, should return just the first entity");
		assertEqual(e.get("a"), "bar");
	});

	db.query({ a: true }).count(function (err, c) {
		assert(!err);
		assertEqual(c, 2);
	});

	db.query({ a: false }).count(function (err, c) {
		assert(!err);
		assertEqual(c, 3);
	});
});

test("JephDB.prototype.query() - chaining", function () {
	var db = new JephDB(new MemoryStore);
	assert(db.store.save("311ef27c77cf9d41ec6b4ff2251d3f4426f8691e", { a: "foo" }));
	assert(db.store.save("f94053878039f2100ded7df35b36687f56e1f64b", { a: "bar" }));
	assert(db.store.save("d7488d63755138faebf8eaafbb5b872a77793dbd", { }));
	assert(db.store.save("4cb7242c5c78617580d19d5fe5649db9bc16fd49", { }));
	assert(db.store.save("084bfcd85205bbe8aa0c35058bb4eb9a08578427", { }));

	db.query().where({}, function (err, result) {
		assert(!err);
		assert(Array.isArray(result));
		assertEqual(result.length, 5);
		assertEqual(result.map(function (e) { return e.id; }).join(), "311ef27c77cf9d41ec6b4ff2251d3f4426f8691e,f94053878039f2100ded7df35b36687f56e1f64b,d7488d63755138faebf8eaafbb5b872a77793dbd,4cb7242c5c78617580d19d5fe5649db9bc16fd49,084bfcd85205bbe8aa0c35058bb4eb9a08578427");
	});

	db.query().where({ a: true }, function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "foo,bar");
	});

	db.query().where({ a: false }, function (err, result) {
		assert(!err);
		assertEqual(result.length, 3);
		assertEqual(result.map(function (e) { return String(e.get("a")); }).join(), "undefined,undefined,undefined");
	});

	db.query().where({ a: true }).sort({ a: 1 }, function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "bar,foo");
	});

	db.query().where({ a: true }).sort({ a: -1 }, function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "foo,bar");
	});

	db.query().where({ a: true }).take(1, function (err, e) {
		assert(!err);
		assert(e instanceof Entity, "limit is 1, should return just the first entity");
		assertEqual(e.get("a"), "foo");
	});

	db.query().where({ a: true }).take(1).skip(1, function (err, e) {
		assert(!err);
		assert(e instanceof Entity, "limit is 1, should return just the first entity");
		assertEqual(e.get("a"), "bar");
	});

	db.query().where({ a: true }).count(function (err, c) {
		assert(!err);
		assertEqual(c, 2);
	});

	db.query().where({ a: false }).count(function (err, c) {
		assert(!err);
		assertEqual(c, 3);
	});
});

test("JephDB.prototype.query() - foreign query object", function () {
	var db = new JephDB(new MemoryStore);
	assert(db.store.save("311ef27c77cf9d41ec6b4ff2251d3f4426f8691e", { a: "foo" }));
	assert(db.store.save("f94053878039f2100ded7df35b36687f56e1f64b", { a: "bar" }));
	assert(db.store.save("d7488d63755138faebf8eaafbb5b872a77793dbd", { }));
	assert(db.store.save("4cb7242c5c78617580d19d5fe5649db9bc16fd49", { }));
	assert(db.store.save("084bfcd85205bbe8aa0c35058bb4eb9a08578427", { }));

	db.query(new Query({}), function (err, result) {
		assert(!err);
		assert(Array.isArray(result));
		assertEqual(result.length, 5);
		assertEqual(result.map(function (e) { return e.id; }).join(), "311ef27c77cf9d41ec6b4ff2251d3f4426f8691e,f94053878039f2100ded7df35b36687f56e1f64b,d7488d63755138faebf8eaafbb5b872a77793dbd,4cb7242c5c78617580d19d5fe5649db9bc16fd49,084bfcd85205bbe8aa0c35058bb4eb9a08578427");
	});
	db.query(new Query({ a: true }), function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "foo,bar");
	});

	db.query(new Query({ a: false }), function (err, result) {
		assert(!err);
		assertEqual(result.length, 3);
		assertEqual(result.map(function (e) { return String(e.get("a")); }).join(), "undefined,undefined,undefined");
	});

	db.query(new Query({ a: true }, { a: 1 }), function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "bar,foo");
	});

	db.query(new Query({ a: true }, { a: -1 }), function (err, result) {
		assert(!err);
		assertEqual(result.length, 2);
		assertEqual(result.map(function (e) { return e.get("a"); }).join(), "foo,bar");
	});

	db.query(new Query({ a: true }, {}, 1), function (err, e) {
		assert(!err);
		assert(e instanceof Entity, "limit is 1, should return just the first entity");
		assertEqual(e.get("a"), "foo");
	});

	db.query(new Query({ a: true }, {}, 1, 1), function (err, e) {
		assert(!err);
		assert(e instanceof Entity, "limit is 1, should return just the first entity");
		assertEqual(e.get("a"), "bar");
	});

	db.query(new Query({ a: true }).count(), function (err, c) {
		assert(!err);
		assertEqual(c, 2);
	});

	db.query(new Query({ a: false }).count(), function (err, c) {
		assert(!err);
		assertEqual(c, 3);
	});
});

test("JephDB.prototype.save()", function () {
	var db = new JephDB(new MemoryStore);
	var e = db.create("da39a3ee5e6b4b0d3255bfef95601890afd80709", { foo: "bar" });
	assert(e.isDirty());
	db.save(e);
	assert(!e.isDirty());
	
	var e = db.store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(e, undefined);
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.data.foo, "bar");
});

test("JephDB.prototype.save() - transformed, special cases", function () {
	JephDB.transformations.length = 0;
	var db = new JephDB(new MemoryStore);

	db.create({ foo: "c" }).save();
	db.create({ foo: "a" }).save();
	db.create({ foo: "b" }).save();

	JephDB.transformation({
		fn: true,
		transformedFn: function () { return function () { return "transformedFn"; }; }
	});

	JephDB.transformation({
		q: true,
		transformedQ: function (db) { return db.query({ foo: true }).sort({ foo: 1 }); }
	});

	var e = db.create("da39a3ee5e6b4b0d3255bfef95601890afd80709", {
		fn: function () { return "fn"; },
		q: (new Query({ foo: true })).sort({ foo: -1 })
	});

	assertEqual(typeof e.get("fn"), "function");
	assertEqual(e.get("fn")(), "fn");
	assertEqual(typeof e.get("transformedFn"), "function");
	assertEqual(e.get("transformedFn")(), "transformedFn");
	assert(Array.isArray(e.get("q")));
	assertEqual(e.get("q").map(function (e) { return e.get("foo"); }).join(), "c,b,a");
	assert(Array.isArray(e.get("transformedQ")));
	assertEqual(e.get("transformedQ").map(function (e) { return e.get("foo"); }).join(), "a,b,c");

	assert(e.isDirty());
	db.save(e);
	assert(!e.isDirty());
	
	assertEqual(typeof e.get("fn"), "function");
	assertEqual(e.get("fn")(), "fn");
	assertEqual(typeof e.get("transformedFn"), "function");
	assertEqual(e.get("transformedFn")(), "transformedFn");
	assert(Array.isArray(e.get("q")));
	assertEqual(e.get("q").map(function (e) { return e.get("foo"); }).join(), "c,b,a");
	assert(Array.isArray(e.get("transformedQ")));
	assertEqual(e.get("transformedQ").map(function (e) { return e.get("foo"); }).join(), "a,b,c");

	var e = db.store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(e, undefined);
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.data.fn, undefined);
	assertEqual(e.data.q, undefined);
	assertNotEqual(e.metadata.fn, undefined);
	assertNotEqual(e.metadata.q, undefined);

	var db = new JephDB(db.store);
	var e = db.get("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assert(!e.isDirty());
	
	assertEqual(typeof e.get("fn"), "function");
	assertEqual(e.get("fn")(), "fn");
	assertEqual(typeof e.get("transformedFn"), "function");
	assertEqual(e.get("transformedFn")(), "transformedFn");
	assert(Array.isArray(e.get("q")));
	assertEqual(e.get("q").map(function (e) { return e.get("foo"); }).join(), "c,b,a");
	assert(Array.isArray(e.get("transformedQ")));
	assertEqual(e.get("transformedQ").map(function (e) { return e.get("foo"); }).join(), "a,b,c");
});
