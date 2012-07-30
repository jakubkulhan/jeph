var Query = require("../Query");

test("Query()", function () {
	var q = new Query({ a: true, b: false }, { a: 1, b: -1 }, 42, 6);
	assertEqual(q.conditions[0].a, true);
	assertEqual(q.conditions[0].b, false);
	assertEqual(q.order.a, 1);
	assertEqual(q.order.b, -1);
	assertEqual(q.limit, 42);
	assertEqual(q.offset, 6);
});

test("Query.prototype.{where,sort,take,skip}()", function () {
	var q = new Query;

	q.where({ a: true, b: false });
	q.sort({ a: 1, b: -1 });
	q.take(42);
	q.skip(6);

	assertEqual(q.conditions[0].a, true);
	assertEqual(q.conditions[0].b, false);
	assertEqual(q.order.a, 1);
	assertEqual(q.order.b, -1);
	assertEqual(q.limit, 42);
	assertEqual(q.offset, 6);
});

test("Query.prototype.{where,sort,take,skip}() - fluent", function () {
	var q = (new Query)
		.where({ a: true, b: false })
		.sort({ a: 1, b: -1 })
		.take(42)
		.skip(6);

	assertEqual(q.conditions[0].a, true);
	assertEqual(q.conditions[0].b, false);
	assertEqual(q.order.a, 1);
	assertEqual(q.order.b, -1);
	assertEqual(q.limit, 42);
	assertEqual(q.offset, 6);
});

test("Query.prototype.end()", function () {
	var ok, cb = function () {};
	var q = new Query(undefined, undefined, undefined, undefined, undefined,
		function (callback) {
			assertEqual(this, q);
			assertEqual(cb, callback);
			ok = true;
		});

	ok = false;
	q.where({ a: true }, cb);
	assert(ok);

	ok = false;
	q.sort({ a: 1 }, cb);
	assert(ok);

	ok = false;
	q.take(42, cb);
	assert(ok);

	ok = false;
	q.skip(6, cb);
	assert(ok);

	ok = false;
	q.end(cb);
	assert(ok);
});

test("Query.prototype.setEndCallback()", function () {
	var ok, cb = function () {};
	var q = (new Query)
		.setEndCallback(function (callback) {
			assertEqual(this, q);
			assertEqual(cb, callback);
			ok = true;
		});

	ok = false;
	q.where({ a: true }, cb);
	assert(ok);

	ok = false;
	q.sort({ a: 1 }, cb);
	assert(ok);

	ok = false;
	q.take(42, cb);
	assert(ok);

	ok = false;
	q.skip(6, cb);
	assert(ok);

	ok = false;
	q.end(cb);
	assert(ok);
});

test("Query.prototype.clone()", function () {
	var q = new Query({ foo: true }, { foo: -1 }, 42, 6, { count: true }, function () {}),
		q2 = q.clone();

	assertNotEqual(q, q2);
	assertNotEqual(q.conditions, q2.conditions);
	assertEqual(q.conditions.length, q2.conditions.length);
	assertNotEqual(q.conditions[0], q2.conditions[0]);
	assertEqual(q.conditions[0].foo, q2.conditions[0].foo);
	assertNotEqual(q.order, q2.order);
	assertEqual(q.order.foo, q2.order.foo);
	assertEqual(q.limit, q2.limit);
	assertEqual(q.offset, q2.offset);
	assertNotEqual(q.aggregate, q2.aggregate);
	assertEqual(q.aggregate.count, q2.aggregate.count);
	assertEqual(q.endCallback, q2.endCallback);
});
