function Query(condition, order, limit, offset, aggregate) {
	this.conditions = [];
	this.order = order || {};
	this.limit = limit;
	this.offset = offset;
	this.aggregate = aggregate || {};

	if (condition) {
		this.conditions.push(condition);
	}
}

Query.prototype.where = function where(condition) {
	this.conditions.push(condition);
	return this;
};

Query.prototype.sort = function sort(order) {
	for (var k in order) {
		this.order[k] = order[k];
	}
	return this;
};

Query.prototype.take = function take(n) {
	this.limit = n;
	return this;
};

Query.prototype.skip = function skip(n) {
	this.offset = n;
	return this;
};

Query.prototype.count = function count() {
	this.aggregate.count = true;
	return this;
};

exports = Query;
