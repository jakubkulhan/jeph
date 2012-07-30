function Property(name, options) {
	options = options || {};

	for (var k in options) {
		this[k] = options[k];
	}

	this.name = name;
}

exports = Property;
