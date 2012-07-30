var JephDB = require("../JephDB"),
	MemoryStore = require("../MemoryStore");

test("basic transformations", function () {
	JephDB.transformations.length = 0;
	var db = new JephDB(new MemoryStore);

	JephDB.transformation({
		a: true,
		b: function () { return this.get("a"); }
	});

	db.transformation({
		c: true,
		d: function () { return this.get("c"); }
	});

	var e = db.create("da39a3ee5e6b4b0d3255bfef95601890afd80709", { a: "foo", c: "bar" });
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.get("a"), "foo");
	assertEqual(e.get("b"), "foo");
	assertEqual(e.get("c"), "bar");
	assertEqual(e.get("d"), "bar");
	db.save(e);

	var db = new JephDB(db.store);
	var e = db.get("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.get("a"), "foo");
	assertEqual(e.get("b"), "foo");
	assertEqual(e.get("c"), "bar");
	assertEqual(e.get("d"), "bar");
});

test("transformation returning undefined", function () {
	JephDB.transformations.length = 0;
	var db = new JephDB(new MemoryStore);

	JephDB.transformation({
		a: true,
		b: function () { return undefined; }
	});

	db.create("da39a3ee5e6b4b0d3255bfef95601890afd80709", { a: "foo" }).save();

	var db = new JephDB(db.store);
	var e = db.get("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.get("a"), "foo");
	assertEqual(e.get("b"), undefined);
});

test("transformation returning query", function () {
	JephDB.transformations.length = 0;
	var db = new JephDB(new MemoryStore);

	JephDB.transformation({
		needFoos: true,
		foos: function (db) {
			return db.query({ foo: true }).sort({ foo: 1 });
		},

		reverseFoos: function (db) {
			return db.query({ foo: true }).sort({ foo: -1 });
		}
	});

	db.create({ foo: "b" }).save();
	db.create({ foo: "a" }).save();
	db.create({ foo: "c" }).save();

	db.create("da39a3ee5e6b4b0d3255bfef95601890afd80709", { needFoos: true }).save();

	var db = new JephDB(db.store);
	var e = db.get("da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.id, "da39a3ee5e6b4b0d3255bfef95601890afd80709");
	assertEqual(e.get("needFoos"), true);
	assert(Array.isArray(e.get("foos")));
	assertEqual(e.get("foos").map(function (e) { return e.get("foo"); }).join(), "a,b,c");
	assert(Array.isArray(e.get("reverseFoos")));
	assertEqual(e.get("reverseFoos").map(function (e) { return e.get("foo"); }).join(), "c,b,a");
});

test("transformations dependent on each other's output", function () {
	JephDB.transformations.length = 0;
	var db = new JephDB(new MemoryStore);

	JephDB.transformation({
		a: true,
		b: function () { return this.get("a"); }
	});

	JephDB.transformation({
		b: true,
		c: function () { return this.get("b"); }
	});

	JephDB.transformation({
		c: true,
		d: function () { return this.get("c"); }
	});

	JephDB.transformation({
		d: true,
		e: function () { return this.get("d"); }
	});

	JephDB.transformation({
		e: true,
		f: function () { return this.get("e"); }
	});

	for (var i = 0; i < 120; ++i) {
		// order does not matter => shuffle array
		JephDB.transformations.sort(function () { return Math.round(Math.random()) - 0.5; });

		var e = db.create({ a: "foo" });
		assertEqual(e.get("a"), e.get("b"));
		assertEqual(e.get("a"), e.get("c"));
		assertEqual(e.get("a"), e.get("d"));
		assertEqual(e.get("a"), e.get("e"));
		assertEqual(e.get("a"), e.get("f"));
		assertEqual(e.get("b"), e.get("c"));
		assertEqual(e.get("b"), e.get("d"));
		assertEqual(e.get("b"), e.get("e"));
		assertEqual(e.get("b"), e.get("f"));
		assertEqual(e.get("c"), e.get("d"));
		assertEqual(e.get("c"), e.get("e"));
		assertEqual(e.get("c"), e.get("f"));
		assertEqual(e.get("d"), e.get("e"));
		assertEqual(e.get("d"), e.get("f"));
		assertEqual(e.get("e"), e.get("f"));
	}
});
