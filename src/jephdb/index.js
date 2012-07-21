var Property = require("./Property"),
	Store = require("./Store"),
	Entity = require("./Entity"),
	Query = require("./Query"),
	currentNamespace = "",
	definedProperties = {},
	definedTransformations = [],
	sha1 = PHP.fn("sha1"),
	generateID = function () {
		return sha1(PHP.fn("uniqid")("", true));
	};

function jephdb(store) {
	if (!(store instanceof Store)) {
		throw new Error("given argument is not an instance of Store");
	}

	this.store = store;
	this.entities = {};
}

jephdb.prototype.get = function get(id) {
	if (typeof this.entities[id] !== "undefined") {
		return this.entities[id];
	}

	var o = this.store.load(id);

	if (!o) {
		return undefined;
	}

	return this.entities[id] = this.bindEntity(new Entity(o.id, unwrapData(o.data, o.transformed),
		o.transformed));
};

function unwrapData(data, transformed) {
	for (var k in data) {
		if (typeof data[k] === "object") {
			if (typeof data[k].function !== "undefined") {
				data[k] = eval("return " + data[k].function + ";");
			} else {
				data[k] = data[k].object;
			}
		}
	}

	for (var k in transformed) {
		if (transformed[k] === false) {
			delete data[k];
		}
	}

	return data;
}

jephdb.prototype.create = function create(id, object) {
	if (typeof id === "object") {
		object = id;
		id = generateID();
	}

	return this.entities[id] = this.bindEntity(new Entity(id, object));
};

jephdb.prototype.save = function save(entity) {
	if (typeof this.entities[entity.id] === "undefined") {
		this.entities[entity.id] = this.bindEntity(entity);
	}

	applyAllTransformations(entity, this);

	var toSave = {}, transformed = {};

	for (var k in entity) {
		if (k !== "id") {
			if (typeof entity._transformed[k] !== "undefined") {
				transformed[k] = true;
			}

			if (typeof entity[k] === "function") {
				if (typeof entity._transformed[k] === "undefined") {
					toSave[k] = { function: entity[k].toString() };
				} else {
					toSave[k] = true;
					transformed[k] = false;
				}

			} else if (typeof entity[k] === "object") {
				toSave[k] = { object: entity[k] };

			} else {
				toSave[k] = entity[k];
			}
		}
	}

	if (this.store.save(entity.id, toSave, transformed)) {
		entity.undirty();
		return true;
	}

	return false;
};

function applyAllTransformations(entity, db) {
	var changed;

	do {
		changed = false;

		for (var i = 0, l = definedTransformations.length; i < l; ++i) {
			if (transform(entity, definedTransformations[i], db)) {
				changed = true;
			}
		}

	} while (changed);
}

function transform(entity, transformation, db) {
	var transformatters = {}, v, needTransform = false, ret = false;

	for (var k in transformation) {
		v = transformation[k];

		if (typeof v === "undefined" || v === null || typeof v === "boolean") { // presence
			if (typeof entity[k] === "undefined" && v) { return false; }

		} else if (typeof v === "number" || typeof v === "string") { // equality
			if (typeof entity[k] === "undefined" || entity[k] !== v) { return false; }

		} else if (typeof v === "entity" && v instanceof RegExp) { // match
			if (typeof entity[k] === "undefined" || !v.test(entity[k])) { return false; }

		} else if (typeof v === "function") { // transformatter
			if (typeof entity[k] === "undefined") { // can only add new attributes
				transformatters[k] = v;
				needTransform = true;
			}

		} else { // WTF!
			throw new Error(v + " is not matcher or transformatter");
		}
	}

	if (!needTransform) { return false; }

	for (var k in transformatters) {
		v = transformatters[k].call(entity, db);

		if (typeof v !== "undefined") {
			ret = true;
			entity.addProperty(k, v, true);
		}
	}

	return ret;
}

jephdb.prototype.query = function query(condition, order, limit, offset, aggregate) {
	var q = new Query(condition, order, limit, offset, aggregate),
		db = this;

	q.fetch = function fetch() {
		var result = db.store.query(this), entities = [];

		if (Object.keys(this.aggregate).length > 0) {
			return result;
		}

		for (var i = 0, l = result.length; i < l; ++i) {
			if (typeof db.entities[result[i].id] !== "undefined") {
				// FIXME: what if data from database are different from entity's data?
				entities[i] = db.entities[result[i].id];
			}

			db.entities[result[i].id] = entities[i] =
				db.bindEntity(new Entity(result[i].id,
					unwrapData(result[i].data, result[i].transformed),
					result[i].transformed));
		}

		return entities;
	};

	return q;
};

jephdb.prototype.bindEntity = function bindEntity(entity) {
	var db = this;

	applyAllTransformations(entity, this);

	Object.defineProperty(entity, "save", { value: function save() {
		return db.save(this);
	} });

	return entity;
};

jephdb.namespace = function namespace(name, callback) {
	var previousNamespace = currentNamespace;
	currentNamespace = currentNamespace + name + "/";

	try {
		callback(this);
	} finally {
		currentNamespace = previousNamespace;
	}
};

jephdb.property = function property(name, description, callback) {
	name = currentNamespace + name;

	if (!description) {
		return definedProperties[name];
	}

	if (typeof description === "function") {
		callback = description;
		description = undefined;
	}

	definedProperties[name] = new Property(name, description);

	if (typeof callback === "function") {
		callback(definedProperties[name]);
	}
};

jephdb.transformation = function transformation(t) {
	definedTransformations.push(t);
	return this;
}

exports = jephdb;
