function Store() {
	throw new Error("this is just abstract base");
}

Store.prototype.load = function load(id) {
	throw new NotImplementedError;
};

Store.prototype.save = function save(id, object) {
	throw new NotImplementedError;
};

Store.prototype.query = function query(q) {
	throw new NotImplementedError;
};

exports = Store;
