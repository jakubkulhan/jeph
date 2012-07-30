function Query(condition, order, limit, offset, aggregate, endCallback) {
	this.conditions = [];
	this.order = order || {};
	this.limit = limit;
	this.offset = offset;
	this.aggregate = aggregate || {};
	this.endCallback = endCallback || function () {};

	if (condition) {
		this.conditions.push(condition);
	}
}

Query.prototype.where = function where(condition, callback) {
	this.conditions.push(condition);
	return this.end(callback);
};

Query.prototype.sort = function sort(order, callback) {
	for (var k in order) {
		this.order[k] = order[k];
	}
	return this.end(callback);
};

Query.prototype.take = function take(n, callback) {
	this.limit = n;
	return this.end(callback);
};

Query.prototype.skip = function skip(n, callback) {
	this.offset = n;
	return this.end(callback);
};

Query.prototype.count = function count(callback) {
	this.aggregate.count = true;
	return this.end(callback);
};

Query.prototype.setEndCallback = function setEndCallback(endCallback, callback) {
	this.endCallback = endCallback;
	return this.end(callback);
};

Query.prototype.end = function end(callback) {
	if (typeof callback === "function") {
		return this.endCallback.call(this, callback);
	}

	return this;
};

Query.prototype.clone = function clone() {
	var q = new Query, i, k, l;

	for (i = 0, l = this.conditions.length; i < l; ++i) {
		q.conditions[i] = {};
		for (k in this.conditions[i]) {
			q.conditions[i][k] = this.conditions[i][k];
		}
	}

	for (k in this.order) {
		q.order[k] = this.order[k];
	}

	q.limit = this.limit;
	q.offset = this.offset;

	for (k in this.aggregate) {
		q.aggregate[k] = this.aggregate[k];
	}

	q.endCallback = this.endCallback;

	return q;
};

exports = Query;
