var Entity = require("../Entity"),
	emptyID = "da39a3ee5e6b4b0d3255bfef95601890afd80709";

test("Entity()", function () {
	assert((new Entity).id !== (new Entity).id);

	var e = new Entity(emptyID);
	assertEqual(e.id, emptyID);
	assertEqual(e.get("foo"), undefined);
	assertEqual(e.getMeta("foo"), undefined);

	var e = new Entity({ foo: "bar" });
	assertEqual(e.get("foo"), "bar");
	assertEqual(e.getMeta("foo"), undefined);

	var e = new Entity(undefined, { foo: "bar" });
	assertEqual(e.get("foo"), undefined);
	assertEqual(e.getMeta("foo"), "bar");
});

test("Entity.prototype.{get,set}()", function () {
	var e = new Entity(emptyID, { foo: "bar" });
	assertEqual(e.get("foo"), "bar");
	e.set("foo", "baz!!!");
	assertEqual(e.get("foo"), "baz!!!");
	e.set("baz", "foo");
	assertEqual(e.get("baz"), "foo");
	assertEqual(e.get("nonexistent"), undefined);
	assertEqual(Object.keys(e.get()).sort().join(), "baz,foo");
});

test("Entity.prototype.{get,set}Meta()", function () {
	var e = new Entity(emptyID, {}, { foo: "bar" });
	assertEqual(e.getMeta("foo"), "bar");
	e.setMeta("foo", "baz!!!");
	assertEqual(e.getMeta("foo"), "baz!!!");
	e.setMeta("baz", "foo");
	assertEqual(e.getMeta("baz"), "foo");
	assertEqual(e.getMeta("nonexistent"), undefined);
	assertEqual(Object.keys(e.getMeta()).sort().join(), "baz,foo");
});

test("Entity.prototype.update()", function () {
	var e = new Entity(emptyID, {}, {});
	assertEqual(e.get("foo"), undefined);
	assertEqual(e.getMeta("foo"), undefined);

	e.update({ foo: "bar" });
	assertEqual(e.get("foo"), "bar");
	assertEqual(e.getMeta("foo"), undefined);

	e.update(undefined, { foo: "bar" });
	assertEqual(e.get("foo"), undefined);
	assertEqual(e.getMeta("foo"), "bar");

	e.update({ foo: "data" }, { foo: "metadata" });
	assertEqual(e.get("foo"), "data");
	assertEqual(e.getMeta("foo"), "metadata");
});

test("Entity.prototype.isDirty()", function () {
	var e = new Entity(emptyID);
	assert(!e.isDirty());

	e.set("foo", "bar");
	assert(e.isDirty());

	e.isDirty(false);
	assert(!e.isDirty());

	e.set("foo", "bar");
	assert(!e.isDirty());

	e.set("foo", "baz!!!");
	assert(e.isDirty());

	e.update({ foo: "xyz" });
	assert(!e.isDirty());
});

test("Entity.prototype.match()", function () {
	var e = new Entity(emptyID);

	try { e.match(undefined); assert(false, "did not throw"); } catch (e) {}
	try { e.match(null); assert(false, "did not throw"); } catch (e) {}
	try { e.match(42); assert(false, "did not throw"); } catch (e) {}
	try { e.match("hello"); assert(false, "did not throw"); } catch (e) {}
	try { e.match(function () {}); assert(false, "did not throw"); } catch (e) {}

	assert(e.match({}));
	assert(!e.match({ foo: true }));
	assert(e.match({ foo: false }));
	assert(e.match({ foo: undefined }));
	assert(e.match({ foo: null }));

	e.set("foo", "bar");
	assert(e.match({}));
	assert(e.match({ foo: true }));
	assert(!e.match({ foo: false }));
	assert(!e.match({ foo: undefined }));
	assert(!e.match({ foo: null }));

	assert(e.match({ foo: "bar" }));
	e.set("foo", "baz!!!");
	assert(!e.match({ foo: "bar" }));

	e.set("foo", 42);
	assert(e.match({ foo: 42 }));
	e.set("foo", 3.14);
	assert(!e.match({ foo: 42 }));

	try { e.match({ foo: {} }); assert(false, "did not throw"); } catch (e) {}
	try { e.match({ foo: function () {} }); assert(false, "did not throw"); } catch (e) {}

	try { e.match({ foo: {} }, true); } catch (e) { assert(false, "should not throw"); }
	try { e.match({ foo: {} }, true); } catch (e) { assert(false, "should not throw"); }

	e.set("foo", "a");
	assert(e.match({ foo: [ "a", "b", "c" ] }));
	e.set("foo", "b");
	assert(e.match({ foo: [ "a", "b", "c" ] }));
	e.set("foo", "d!!!");
	assert(!e.match({ foo: [ "a", "b", "c" ] }));
});
