var Store = require("jephdb/Store"),
	jephdb = require("jephdb");

function MySQLStore(options) {
	if (typeof options.host === "undefined") {
		throw new Error("you have to specify host option");
	}

	if (typeof options.database === "undefined") {
		throw new Error("you have to specify database option");
	}

	var dsn = "mysql:dbname=" + options.database + ";host=" + options.host;

	if (typeof options.username !== "undefined") {
		if (typeof options.password !== "undefined") {
			this.connection = PHP.cls("PDO")(dsn, options.username, options.password);
		} else {
			this.connection = PHP.cls("PDO")(dsn, options.username);
		}
	} else {
		this.connection = PHP.cls("PDO")(dsn);
	}

	this.connection.exec("SET NAMES 'utf8'");

	var conn = this.connection;

	this.tables = [];

	@@ foreach (`conn->native->query('SHOW FULL TABLES', PDO::FETCH_NUM) as $row) { @@
		this.tables.push(@@ $row[0] @@);
	@@ } @@

	if (this.tables.indexOf("entities") === -1) {
		this.connection.exec("CREATE TABLE `entities` (" +
				"`pk` INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
				"`id` CHAR(40) NOT NULL," +
				"`data` MEDIUMBLOB," +
				"`transformed` MEDIUMBLOB," +
				"UNIQUE KEY(`id`)" +
			") ENGINE=InnoDB");
	}

	this.loadStatement = this.connection.prepare(
			"SELECT `data`, `transformed` FROM `entities` WHERE `id` = ?");

	this.saveStatement = this.connection.prepare(
			"REPLACE `entities` SET `id` = ?, `data` = ?, `transformed` = ?");
}

MySQLStore.prototype = Object.create(Store.prototype);

MySQLStore.prototype.load = function load(id) {
	this.loadStatement.execute([id]);
	var ret = this.loadStatement.fetch();
	this.loadStatement.closeCursor();

	if (!ret) {
		return undefined;
	}

	return { id: id,
		data: JSON.parse(ret[0]),
		transformed: JSON.parse(ret[1]) };
};

MySQLStore.prototype.save = function save(id, object, transformed) {
	var conn = this.connection;
	transformed = transformed || {};

	try {
		conn.beginTransaction();

		for (var k in object) {
			var index = this.getIndexFor(k);

			conn.exec("DELETE FROM `" + index + "` WHERE `entity_id` = " + conn.quote(id));

			conn.exec("INSERT INTO `" + index + "` (`value`, `entity_id`) VALUES " +
				(!Array.isArray(object[k]) ? [ object[k] ] : object[k]).map(function (v) {
					return "(" + conn.quote(String(v)) + ", " + conn.quote(id) + ")";a
				}).join());
		}

		this.saveStatement.execute([ id, JSON.stringify(object), 
			JSON.stringify(transformed) ]);

		conn.commit();
		return true;

	} catch (e) {
		conn.rollBack();
		throw e;
	}
};

MySQLStore.prototype.query = function query(q) {
	var sql = "SELECT " +
		(q.aggregate.count
		 	? "COUNT(*)"
			: "`entities`.`id`, `entities`.`data`, `entities`.`transformed`") +
		" FROM `entities` ",
		joins = [], joined = [],
		where = [], order = [],
		conn = this.connection;

	for (var i = 0, cond, w; i < q.conditions.length; ++i) {
		cond = q.conditions[i];
		w = [];

		for (var k in cond) {
			var v = cond[k],
				index = this.getIndexFor(k);

			if (joined.indexOf(index) === -1) {
				joined.push(index);
				joins.push("LEFT JOIN `" + index + "` ON `entities`.`id` = `" +
					index + "`.`entity_id`");
			}

			if (typeof v === "undefined" || v === null || typeof v === "boolean") {
				if (this.tables.indexOf(index) === -1) {
					w.push(v ? "TRUE" : "FALSE");
				} else {
					w.push("`" + index + "`.`entity_id` IS " + (v ? "NOT " : "") + "NULL");
				}

			} else if (typeof v === "number") {
				if (this.tables.indexOf(index) === -1) {
					w.push("FALSE");
				} else {
					w.push("`" + index + "`.`value` = " + String(v));
				}

			} else if (typeof v === "string") {
				if (this.tables.indexOf(index) === -1) {
					w.push("FALSE");
				} else {
					w.push("`" + index + "`.`value` = " + conn.quote(String(v)));
				}

			} else {
				// FIXME: <, >, <=, >= operators using object, RegExps
				throw new Error("querying using " + v + " not supported");
			}
		}

		where.push("(" + w.join(") AND (") + ")");
	}

	for (var k in q.order) {
		var v = q.order[k],
			index = k.replace(/\//g, "_") + "_index";

		if (joined.indexOf(index) === -1) {
			joined.push(index);
			joins.push("LEFT JOIN `" + index + "` ON `entities`.`id` = `" +
				index + "`.`entity_id`");
		}

		order.push("`" + index + "`.`value` " + (v < 1 ? "DESC" : "ASC"));
	}

	order.push("`entities`.`pk` ASC");

	sql += joins.join("");

	if (where.length) {
		sql += " WHERE (" + where.join(") OR (") + ")";
	}

	if (order.length) {
		sql += " ORDER BY " + order.join(", ");
	}

	if (typeof q.limit !== "undefined") {
		sql += " LIMIT " + q.limit;
	}

	if (typeof q.offset !== "undefined") {
		if (typeof q.limit === "undefined") {
			sql += " LIMIT 18446744073709551615";
		}

		sql += " OFFSET " + q.offset;
	}

	if (q.aggregate.count) {
		return Number(conn.query(sql).fetch()[0]);

	} else {
		var result = [];

		@@ foreach (`conn->native->query(`sql) as $row) { @@
			result.push({
				id: @@ $row[0] @@,
				data: JSON.parse(@@ $row[1] @@),
				transformed: JSON.parse(@@ $row[2] @@) });
		@@ } @@

		return result;
	}
};

MySQLStore.prototype.getIndexFor = function getIndexFor(k) {
	var index = k.replace(/\//g, "_") + "_index", property = jephdb.property(k); // FIXME

	if (this.tables.indexOf(index) === -1) {
		var valueType;

		if (property && property.type === "id") {
			valueType = "CHAR(40)";

		} else if (property && property.type === "string") {
			valueType = "CHAR(255)"; // VARCHAR hits key length limit 767 bytes

		} else if (property && property.type === "int") {
			valueType = "INT";

		} else if (property && property.type === "double") {
			valueType = "DOUBLE";

		} else {
			valueType = "SMALLINT(1)"; // index only presence
		}

		this.connection.exec("CREATE TABLE `" + index + "` (" +
				"`value` " + valueType + "," +
				"`entity_id` CHAR(40) NOT NULL," +
				"PRIMARY KEY(`value`, `entity_id`)" +
			") ENGINE=InnoDB;");

		this.tables.push(index);
	}

	return index;
};

exports = MySQLStore;
