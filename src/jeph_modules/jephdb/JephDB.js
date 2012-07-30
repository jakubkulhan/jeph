var Property = require("./Property"),
	Store = require("./Store"),
	Entity = require("./Entity"),
	Query = require("./Query");

//
// constructor
//

function JephDB(store) {
	if (!(store instanceof Store)) {
		throw new Error("Given argument is not an instance of Store");
	}

	this.store = store;
	this.entities = {};
}

//
// methods
//

JephDB.prototype.create = function create(id, data, metadata, fromDatabase) {
	if (this.entities[id] !== undefined) {
		if (this.entities[id].isDirty()) {
			return this.entities[id];
		}

		this.entities[id].update(data, metadata);
		updateEntity(this, this.entities[id], true);
		return this.entities[id];
	}

	var e;
	bindEntity(this, e = new Entity(id, data, metadata));
	e.isDirty(!fromDatabase);
	return this.entities[e.id] = e;
};

JephDB.prototype.get = function get(id) {
	if (this.entities[id] !== undefined) { return this.entities[id]; }
	var e = this.store.load(id);
	if (e === undefined) { return this.create(id); }
	return this.create(e.id, e.data, e.metadata, true);
};

JephDB.prototype.query = function query(condition, order, limit, offset, aggregate, callback) {
	var q, db = this;

	if (!(condition instanceof Query)) {
		q = new Query(condition);
	} else {
		q = condition;
	}

	q.setEndCallback(function (callback) {
		try {
			if (Object.keys(this.aggregate).length > 0) {
				return callback(null, db.store.query(this));
			}

			if (this.limit === 1) {
				var result = db.store.query(this);

				if (result.length < 1) {
					return callback(null, undefined);
				}

				return callback(null, db.create(result[0].id, result[0].data, result[0].metadata, true));
			}

			return callback(null, db.store.query(this).map(function (e) {
				return db.create(e.id, e.data, e.metadata, true);
			}));
		} catch (e) {
			callback(e, null);
		}
	});

	if (typeof order === "function") {
		return q.end(order);
	}
	q.sort(order);

	if (typeof limit === "function") {
		return q.end(limit);
	}
	q.take(limit);

	if (typeof offset === "function") {
		return q.end(offset);
	}
	q.skip(offset);

	if (typeof aggregate === "function") {
		return q.end(aggregate);
	}
	q.aggregate = aggregate || {};

	if (typeof callback === "function") {
		return q.end(callback);
	}

	return q;
};

JephDB.prototype.save = function save(e) {
	if (this.entities[e.id] === undefined) {
		bindEntity(this, e);
	} else {
		updateEntity(this, e);
	}

	if (!e.isDirty()) {
		return e;
	}

	var data = e.get(), metadata = e.getMeta(), dataCopy = {};

	for (var k in data) {
		dataCopy[k] = data[k];

		if (typeof data[k] === "function") {
			if (metadata[k] === undefined || !metadata[k].transformed) {
				metadata[k] = {};
				metadata[k].function = data[k].toString();
			}

			delete dataCopy[k];
		}

		if (metadata[k] !== undefined &&
			(metadata[k].function !== undefined || metadata[k].query !== undefined))
		{
			delete dataCopy[k];
		}
	}

	this.store.save(e.id, dataCopy, metadata);
	e.isDirty(false);
	return e;
};

//
// utility functions
//

function bindEntity(db, e) {
	updateEntity(db, e, true);
	Object.defineProperty(e, "save", { value: function () {
		return db.save(this);
	}});
}

function updateEntity(db, e, force) {
	if (!e.isDirty() && !force) { return; }

	var changed, i, k, t, f, v,
		data = e.get(), metadata = e.getMeta(), savedDirty = e.isDirty();

	for (k in data) {
		if (data[k] instanceof Query) {
			if (metadata[k] === undefined) {
				metadata[k] = {};
			}

			metadata[k].query = data[k];
			metadata[k].query.setEndCallback(undefined);

			delete data[k];
		}
	}

	for (k in metadata) {
		if (metadata[k].function !== undefined) {
			e.set(k, eval("return " + metadata[k].function + ";"));

		} else if (metadata[k].query !== undefined) {
			db.query(metadata[k].query, function (err, result) {
				if (err) { throw new err; }
				e.set(k, result);
			});
		}
	}

	e.isDirty(savedDirty);

	do {
		changed = false;

		for (i in db.transformations) {
			t = db.transformations[i];

			if (!e.match(t, true)) { continue; }

			for (k in t) {
				f = t[k];

				if (typeof f !== "function") { continue; }
				if (e.get(k) !== undefined) { continue; }

				if ((v = f.call(e, db)) !== undefined) {
					changed = true;

					if (v instanceof Query) {
						v.setEndCallback(undefined);
						e.setMeta(k, { query: v });
						db.query(v, function (err, result) {
							if (err) { throw err; }
							e.set(k, result)
						});
					} else {
						e.set(k, v);
						e.setMeta(k, { transformed: true });
					}
				}
			}
		}
	} while (changed);
}


//
// definition functions
//

var currentNamespace = "";
JephDB.properties = JephDB.prototype.properties = {};
JephDB.transformations = JephDB.prototype.transformations = [];

JephDB.namespace = JephDB.prototype.namespace = function namespace(name, callback) {
	var previousNamespace = currentNamespace;

	try {
		currentNamespace = currentNamespace + name + "/";
		callback(this);
	} finally {
		currentNamespace = previousNamespace;
	}
};

JephDB.property = JephDB.prototype.property = function property(name, options, callback) {
	name = currentNamespace + name;

	if (!options) {
		return JephDB.properties[name];
	}

	if (typeof options === "function") {
		callback = options;
		options = undefined;
	}

	JephDB.properties[name] = new Property(name, options);

	if (typeof callback === "function") {
		callback(JephDB.properties[name]);
	}
};

JephDB.transformation = JephDB.prototype.transformation = function transformation(t) {
	JephDB.transformations.push(t);
	return this;
}

//
// export Store, MemoryStore and UnionStore through JephDB
//

JephDB.Store = require("./Store");
JephDB.MemoryStore = require("./MemoryStore");
JephDB.UnionStore = require("./UnionStore");

exports = JephDB;
