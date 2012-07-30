var Store = require("./Store"),
	Entity = require("./Entity");

function MemoryStore() {
	this.entities = {};
}

MemoryStore.prototype = Object.create(Store.prototype);

MemoryStore.prototype.load = function load(id) {
	return this.entities[id];
};

MemoryStore.prototype.save = function save(id, data, metadata) {
	if (typeof id !== "string" || id.length !== 40) {
		throw new Error("ID has to be 40-bytes long string (SHA1 hash in hex)");
	}

	data = data || {};
	metadata = metadata || {};

	this.entities[id] = { id: id, data: data, metadata: metadata };
	return true;
};

MemoryStore.prototype.query = function query(q) {
	var that = this, result = [], ids = {},
		testEntity = new Entity("da39a3ee5e6b4b0d3255bfef95601890afd80709");

	if (q.conditions.length < 1) {
		for (var k in this.entities) {
			result.push(this.entities[k]);
		}

	} else {
		for (var i = 0, l = q.conditions.length, cond; i < l; ++i) {
			cond = q.conditions[i];

			Object.keys(this.entities).forEach(function (id) {
				e = that.entities[id];

				if (ids[e.id] !== undefined) { return; }

				testEntity.update(e.data, e.metadata);
				if (!testEntity.match(cond)) { return; }

				ids[e.id] = true;
				result.push(e);
			});
		}
	}

	result = MemoryStore.sortResult(q, result);

	var ret = [];

	if (q.limit === undefined && q.offset === undefined) {
		ret = result;

	} else {
		for (var i = q.offset || 0, l = q.limit === undefined ? 2147483647 : i + q.limit;
			i < l && i < result.length; ++i)
		{
			ret.push(result[i]);
		}
	}

	if (q.aggregate.count !== undefined) {
		return ret.length;
	}

	return ret;
};

MemoryStore.sortResult = function sortResult(q, result) {
	for (var k in q.order) {
		result.sort(function (a, b) {
			if (a.data[k] == b.data[k]) { return 0; } // intentionally ==
			else {
				return (a.data[k] < b.data[k] ? -1 : 1) * (q.order[k] < 1 ? -1 : 1);
			}
		});
	}

	return result;
};

exports = MemoryStore;
