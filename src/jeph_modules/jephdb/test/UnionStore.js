var UnionStore = require("../UnionStore"),
	MemoryStore = require("../MemoryStore"),
	Query = require("../Query");

test("UnionStore.prototype.load()", function () {
	var a = new MemoryStore,
		b = new MemoryStore,
		c = new MemoryStore;

	assert(a.save("71581332102117fa99e7f5a07f1c5c15b0c667a9", { foo: "a" }));
	assert(b.save("8dc26d83cf61dc3e2a8a0ab369348b4abb1152ca", { foo: "b" }));
	assert(c.save("9c69884522664b7d904a69b7938ea16843064ca0", { foo: "c" }));
	assert(c.save("71581332102117fa99e7f5a07f1c5c15b0c667a9", { foo: "c" }));

	var store = new UnionStore(a, b, c);

	var e = store.load("71581332102117fa99e7f5a07f1c5c15b0c667a9");
	assertEqual(e.id, "71581332102117fa99e7f5a07f1c5c15b0c667a9");
	assertEqual(e.data.foo, "a");

	var e = store.load("8dc26d83cf61dc3e2a8a0ab369348b4abb1152ca");
	assertEqual(e.id, "8dc26d83cf61dc3e2a8a0ab369348b4abb1152ca");
	assertEqual(e.data.foo, "b");

	var e = store.load("9c69884522664b7d904a69b7938ea16843064ca0");
	assertEqual(e.id, "9c69884522664b7d904a69b7938ea16843064ca0");
	assertEqual(e.data.foo, "c");
});

test("UnionStore.prototype.save()", function () {
	var a = new MemoryStore,
		b = new MemoryStore,
		c = new MemoryStore;

	var store = new UnionStore(a, b, c);
	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", { foo: "store" }));
	var e = store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(e, undefined);
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.data.foo, "store");

	var e = a.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(e, undefined);
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.data.foo, "store");

	var e = b.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e, undefined);

	var e = c.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e, undefined);
});

test("UnionStore.prototype.query()", function () {
	var a = new MemoryStore,
		b = new MemoryStore,
		c = new MemoryStore;

	assert(a.save("1516726db315828691c4d78464013bde2c6d5948", { foo: "a1" }));
	assert(a.save("f831c7fa1eb2e10a40c27ddfdd015a4d2d2d410a", { foo: "a2" }));
	assert(b.save("6f4b13e63d3ec32530c6adf7491348580a71de5b", { foo: "b2" }));
	assert(b.save("8251108c85ce7544150e2993fd2e00f62d0d9b80", { foo: "b1" }));
	assert(c.save("9aeb51646b1c21ae6ce203b316d68d1e15af5261", { foo: "c2" }));
	assert(c.save("a8c3368f320ba9ab8534bfaf07756ec502a2d5fa", { foo: "c1" }));

	var store = new UnionStore(a, b, c);

	var result = store.query(new Query({ foo: true }));
	assert(Array.isArray(result));
	assertEqual(result.length, 6);
	assertEqual(result.map(function (e) { return e.data.foo; }).join(), "a1,a2,b2,b1,c2,c1");

	var result = store.query(new Query({ foo: true }, { foo: 1 }));
	assert(Array.isArray(result));
	assertEqual(result.length, 6);
	assertEqual(result.map(function (e) { return e.data.foo; }).join(), "a1,a2,b1,b2,c1,c2");

	var result = store.query(new Query({ foo: true }, { foo: 1 }, 3));
	assert(Array.isArray(result));
	assertEqual(result.length, 3);
	assertEqual(result.map(function (e) { return e.data.foo; }).join(), "a1,a2,b1");

	try {
		store.query(new Query(undefined, undefined, undefined, 3));
		assert(false, "did not throw");
	} catch (e) {}

	try {
		store.query(new Query(undefined, undefined, undefined, undefined,
			{ count: true }));
		assert(false, "did not throw");
	} catch (e) {}
});

test("UnionStore.prototype.add()", function () {
	var store = new UnionStore,
		a = new MemoryStore,
		b = new MemoryStore,
		c = new MemoryStore;

	store.add(a);
	store.add(b);
	store.add(c, true);

	assert(store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", { foo: "store" }));
	var e = store.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(e, undefined);
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.data.foo, "store");

	var e = a.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e, undefined);

	var e = b.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e, undefined);

	var e = c.load("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertNotEqual(e, undefined);
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.data.foo, "store");

	var store = new UnionStore;
	
	store.add(a);
	store.add(b);
	store.add(c);

	try {
		store.save("da39a3ee5e6b4b0d3255bfef95601890afd80709", { foo: "store" });
		assert(false, "did not throw");
	} catch (e) {}
});
