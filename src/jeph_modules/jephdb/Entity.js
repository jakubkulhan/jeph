var generateID = function () {
		return require("crypto").createHash("sha1")
			.update(String(Math.random())).digest("hex");
	};

function Entity(id, data, metadata) {
	if (typeof id !== "string") {
		metadata = data;
		data = id;
		id = generateID();

	} else if (typeof id === "string" && id.length !== 40) {
		throw new Error("ID has to be 40-bytes long string (SHA1 hash in hex)");
	}

	Object.defineProperty(this, "id", { value: id, enumerable: true });
	Object.defineProperty(this, "_data", { value: data || {},
		enumerable: true, configurable: true });
	Object.defineProperty(this, "_metadata", { value: metadata || {},
		enumerable: true, configurable: true });
	Object.defineProperty(this, "_dirty", { value: {}, configurable: true });
}

Object.defineProperties(Entity.prototype, {
	get: {
		value: function (p) {
			if (!p) { return this._data; }
			return this._data[p];
		}
	},

	set: {
		value: function (p, v) {
			if (this._data[p] !== v) {
				this._data[p] = v;
				this._dirty[p] = true;
			}

			return this;
		}
	},

	getMeta: {
		value: function (p) {
			if (!p) { return this._metadata; }
			return this._metadata[p];
		}
	},

	setMeta: {
		value: function (p, v) {
			if (this._metadata[p] !== v) {
				this._metadata[p] = v;
				this._dirty[p] = true;
			}

			return this;
		}
	},

	update: {
		value: function (newData, newMetadata) {
			Object.defineProperty(this, "_data", { value: newData || {},
				enumerable: true, configurable: true });
			Object.defineProperty(this, "_metadata", { value: newMetadata || {},
				enumerable: true, configurable: true });
			Object.defineProperty(this, "_dirty", { value: {}, configurable: true });
			return this;
		}
	},

	match: {
		value: function (matcher, ignoreBadConditions) {
			if (matcher === null || typeof matcher !== "object") {
				throw new Error("Given argument is not an object to be matched against");
			}

			var k, v;

			for (k in matcher) {
				v = matcher[k];

				if (v === undefined || v === null || typeof v === "boolean") {
					if (v && (this._data[k] === undefined &&
						this._metadata[k] === undefined)) { return false; }

					if (!v && (this._data[k] !== undefined ||
						this._metadata[k] !== undefined)) { return false; }

				} else if (typeof v === "string" || typeof v === "number") {
					if (this._data[k] !== v) { return false; }

				} else if (Array.isArray(v)) {
					if (v.indexOf(this._data[k]) === -1) { return false; }

				} else {
					// FIXME: matching using objects - <, >, <=, >=, RegExps
					if (!ignoreBadConditions) {
						throw new Error("matching using " + c + " is not supported");
					}
				}
			}

			return true;
		}
	},

	isDirty: {
		value: function (p) {
			if (typeof p === "boolean") {
				if (p === false) {
					Object.defineProperty(this, "_dirty", { value: {}, configurable: true });
				} else {
					this._dirty["_"] = true;
				}

				return p;
			}

			if (p) {
				return this._dirty[p] !== undefined;
			}

			return Object.keys(this._dirty).length > 0;
		}
	}
});

exports = Entity;
