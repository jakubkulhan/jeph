var Store = require("../Store"),
	MemoryStore = require("../MemoryStore"),
	Query = require("../Query");

test("MemoryStore()", function () {
	assert((new MemoryStore) instanceof Store);
});

test("MemoryStore.prototype.save()", function () {
	var store = new MemoryStore;
	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", {}, {}));
	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", {}));
	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709"));

	try { store.save(undefined); assert(false, "did not throw"); } catch (e) {}
	try { store.save(null); assert(false, "did not throw"); } catch (e) {}
	try { store.save(42); assert(false, "did not throw"); } catch (e) {}
	try { store.save("hello"); assert(false, "did not throw"); } catch (e) {}
	try { store.save({}); assert(false, "did not throw"); } catch (e) {}
	try { store.save([]); assert(false, "did not throw"); } catch (e) {}
	try { store.save(function () {}); assert(false, "did not throw"); } catch (e) {}
});

test("MemoryStore.prototype.load()", function () {
	var store = new MemoryStore;
	assertEqual(store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709"), undefined);

	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", {}, {}));

	var o = store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(o, undefined);
	assertEqual(o.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(typeof o.data, "object");
	assertEqual(typeof o.metadata, "object");

	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", {}));

	var o = store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(o, undefined);
	assertEqual(o.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(typeof o.data, "object");
	assertEqual(typeof o.metadata, "object");

	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709"));

	var o = store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(o, undefined);
	assertEqual(o.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(typeof o.data, "object");
	assertEqual(typeof o.metadata, "object");

	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", { foo: "data" }, { foo: "metadata" }));
	var o = store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(o, undefined);
	assertEqual(o.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(typeof o.data, "object");
	assertEqual(typeof o.metadata, "object");
	assertEqual(o.data.foo, "data");
	assertEqual(o.metadata.foo, "metadata");
});

test("MemoryStore.prototype.query()", function () {
	var store = new MemoryStore;
	assert(store.save("311ef27c77cf9d41ec6b4ff2251d3f4426f8691e", { a: "foo" }));
	assert(store.save("f94053878039f2100ded7df35b36687f56e1f64b", { a: "bar" }));
	assert(store.save("d7488d63755138faebf8eaafbb5b872a77793dbd", { }));
	assert(store.save("4cb7242c5c78617580d19d5fe5649db9bc16fd49", { }));
	assert(store.save("084bfcd85205bbe8aa0c35058bb4eb9a08578427", { }));

	var all = store.query(new Query);
	assert(all instanceof Array);
	assertEqual(all.length, 5);
	assertEqual(all.map(function (e) { return e.id; }).join(), "311ef27c77cf9d41ec6b4ff2251d3f4426f8691e,f94053878039f2100ded7df35b36687f56e1f64b,d7488d63755138faebf8eaafbb5b872a77793dbd,4cb7242c5c78617580d19d5fe5649db9bc16fd49,084bfcd85205bbe8aa0c35058bb4eb9a08578427");

	var as = store.query(new Query({ a: true }));
	assertEqual(as.length, 2, "present");
	assertEqual(as.map(function (e) { return e.data.a; }).join(), "foo,bar");

	var notAs = store.query(new Query({ a: false }));
	assertEqual(notAs.length, 3, "not present");
	assertEqual(notAs.map(function (e) { return String(e.data.a); }).join(), "undefined,undefined,undefined");

	var orderAs = store.query(new Query({ a: true }, { a: 1 }));
	assertEqual(orderAs.length, 2, "order");
	assertEqual(orderAs.map(function (e) { return e.data.a; }).join(), "bar,foo");

	var orderReverseAs = store.query(new Query({ a: true }, { a: -1 }));
	assertEqual(orderReverseAs.length, 2, "order reverse");
	assertEqual(orderReverseAs.map(function (e) { return e.data.a; }).join(), "foo,bar");

	var limitAs = store.query(new Query({ a: true }, {}, 1));
	assertEqual(limitAs.length, 1, "limit");
	assertEqual(limitAs.map(function (e) { return e.data.a; }).join(), "foo");

	var offsetAs = store.query(new Query({ a: true }, {}, 1, 1));
	assertEqual(offsetAs.length, 1, "offset");
	assertEqual(offsetAs.map(function (e) { return e.data.a; }).join(), "bar");

	assertEqual(store.query((new Query({ a: true })).count()), 2);
	assertEqual(store.query((new Query({ a: false })).count()), 3);
});
