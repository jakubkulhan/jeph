var Store = require("../Store");

function MemoryStore() {
	this.entities = {};
}

MemoryStore.prototype = Object.create(Store.prototype);

MemoryStore.prototype.load = function load(id) {
	return this.entities[id];
};

MemoryStore.prototype.save = function save(id, object, transformed) {
	this.entities[id] = { id: id, data: object, transformed: transformed };
	return true;
};

MemoryStore.prototype.query = function query(q) {
	var that = this, result = [], ids = {};

	if (q.conditions.length < 1) {
		for (var k in this.entities) {
			result.push(this.entities[k]);
		}

	} else {
		for (var i = 0, l = q.conditions.length, cond; i < l; ++i) {
			cond = q.conditions[i];

			Object.keys(this.entities).forEach(function (id) {
				e = that.entities[id];

				var k, c;

				if (typeof ids[e.id] !== "undefined") { return; }

				for (k in cond) {
					c = cond[k];

					if (typeof c === "undefined" || c === null || typeof c === "boolean") {
						if (c && typeof e.data[k] === "undefined") { return; }
						if (!c && typeof e.data[k] !== "undefined") { return; }

					} else if (typeof c === "string" || typeof c === "number") {
						if (e.data[k] !== c) { return; }

					} else {
						// FIXME: <, >, <=, >= operators using object, RegExps
						throw new Error("querying using " + c + " is not supported");
					}
				}

				ids[e.id] = true;
				result.push(e);
			});
		}
	}

	for (var k in q.order) {
		result.sort(function (a, b) {
			if (a[k] == b[k]) { return 0; } // intentionally ==
			else {
				return (a[k] < b[k] ? -1 : 1) * (q.order < 1 ? -1 : 1);
			}
		});
	}

	var ret = [];

	for (var i = q.offset || 0, l = typeof q.limit === "undefined" ? 2147483647 : q.limit;
		i < l && i < result.length; ++i)
	{
		ret.push(result[i]);
	}

	return ret;
};

exports = MemoryStore;
