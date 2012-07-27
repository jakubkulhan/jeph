function Entity(id, data, transformed) {
	if (typeof id !== "string" || id.length !== 40) {
		throw new Error("ID has to be 40-bytes long string (SHA1 hash in hex)");
	}

	transformed = transformed || {};

	Object.defineProperty(this, "id", { value: id, enumerable: true });
	Object.defineProperty(this, "_transformed", { value: transformed });
	Object.defineProperty(this, "_dirty", { value: {} });

	for (var k in data) {
		this.addProperty(k, data[k]);
	}

	Object.defineProperty(this, "_keys", { value: Object.keys(this).toString(),
		configurable: true });
}

Object.defineProperties(Entity.prototype, {
	addProperty: {
		value: function (p, value, transformed) {
			if (typeof this[p] !== "undefined") {
				throw new Error("entity already has property " + p);
			}

			Object.defineProperty(this, "_" + p, { value: value,
				writable: true, configurable: true });

			Object.defineProperty(this, p, {
				get: function () {
					return value;
				},

				set: function (v) {
					delete this._transformed[p];

					if (this["_" + p] !== v) {
						this._dirty[p] = true;
					}
						
					value = v;
				},

				enumerable: true,
				configurable: true
			});

			if (transformed) {
				this._transformed[p] = true;
			}
		}
	},

	isDirty: {
		value: function (p) {
			if (p) {
				return typeof this._dirty[p] !== "undefined";
			}

			return Object.keys(this._dirty).length > 0 ||
				Object.keys(this).toString() !== this._keys;
		}
	},

	undirty: {
		value: function () {
			for (var k in this) {
				if (k !== "id") {
					this["_" + k] = this[k];
				}
			}

			Object.defineProperty(this, "_keys", { value: Object.keys(this).toString(),
				configurable: true });
		}
	}
});

exports = Entity;
