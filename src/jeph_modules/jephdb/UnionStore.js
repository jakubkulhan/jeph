var Store = require("./Store"),
	MemoryStore = require("./MemoryStore");

function UnionStore() {
	this.stores = [];

	for (var i = 0, l = arguments.length; i < l; ++i) {
		this.add(arguments[i], i === 0);
	}
}

UnionStore.prototype = Object.create(Store.prototype);

UnionStore.prototype.add = function add(store, isNewSaveStore) {
	if (!(store instanceof Store)) {
		throw new Error("Given argument is not an instance of Store");
	}

	this.stores.push(store);

	if (isNewSaveStore) {
		this.saveStore = store;
	}
};

UnionStore.prototype.load = function load(id) {
	for (var i = 0, l = this.stores.length, e; i < l; ++i) {
		if ((e = this.stores[i].load(id)) !== undefined) {
			return e;
		}
	}

	return undefined;
};

UnionStore.prototype.save = function save(id, data, metadata) {
	if (this.saveStore === undefined) {
		throw new Error("Readonly store");
	}
	
	return this.saveStore.save(id, data, metadata);
};

UnionStore.prototype.query = function query(q) {
	if (q.offset !== undefined) {
		throw new NotImplementedError("Query with offset not implemented");
	}

	if (Object.keys(q.aggregate).length) {
		throw new NotImplementedError("Aggregate query not implemented");
	}

	q = q.clone();
	q.limit = q.limit === undefined ? 2147483647 : q.limit;

	var ret = [];

	for (var result, i = 0, l = this.stores.length, j, m; q.limit && i < l; ++i) {
		result = this.stores[i].query(q);
		q.limit -= result.length;
		for (j = 0, m = result.length; j < m; ++j) {
			ret.push(result[j]);
		}
	}

	return MemoryStore.sortResult(q, ret);
};

exports = UnionStore;
