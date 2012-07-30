# Jeph

Jeph is an application framework that enables you to run Javascript-written
applications on top of regular PHP scripting engine. Jeph uses
[js2php](https://github.com/jakubkulhan/js2php) to compile Javascript code and
js2php's runtime environment.

Hello, world in Jeph looks like this:

	var jeph = require("jeph");

	jeph(function (req, res) {
		var body = "Hello, world!\n";

		res.writeHead(200, {
			"Content-Type": "text/plain; charset=UTF-8",
			"Content-Length": body.length });

		res.end(body);
	});

If you want to run it, you have to upload `build/bundle.php` to your server
and create PHP-writable directory called `jeph` alongside it. Then open `bundle.php`
in your browser. It creates Jeph's directory structure, extracts Jeph source files
into `jeph/`, and redirects you to the application root. Now upload hello-world
script into `jeph/src/main.js`, this is Jeph's entry point. If you reload page
in the browser, you'll see `Hello, world!`.

`jeph/src/main.js` is an entry point. But it can load other files too:

	jeph/src/main.js:

	var jeph = require("jeph"),
		body = require("./message.js");

	jeph(function (req, res) {
		res.writeHead(200, {
			"Content-Type": "text/plain; charset=UTF-8",
			"Content-Length": body.length });

		res.end(body);
	});


	jeph/src/message.js:

	exports = "Hello from message.js!";

## Building

Default bundle is made from `src/` directory in this repository. If you want to make
your own application bundled, put your sources into `src/src/` and run:

	$ ./js2php/util/jake all

`build/bundle.php` will contain your bundled application.

## Under the hood

### `jeph/`

`jeph/` directory structure:

	jeph/
	  c/                  --> PHP classes; file names same as class with extension .php
	  f/                  --> PHP functions; file names same as function with extension .php
	  cache/              --> compiled Javascript sources
	  recompile.php       --> recreates Jeph application file
	  recompile.init.php  --> recompile.php configuration created by `bundle.php`
	  jeph.js             --> main Jeph Javascript source, initializes environment, loads src/main.js
	  src/                --> application sources
	    main.js           --> application entry point

### Application lifecycle

Ordinary PHP application's lifecycle looks like this:

1. a client requests PHP application
2. the application loads configuration
3. object graph is created according to the configuration
4. the script executes its code

Jeph's lifecycle is like this:

1. a client requests Jeph application
3. it [`unserialize()`s](http://php.net/unserialize) object graph
2. and then executes callbacks added by calling `jeph()`

However, if there are new files in `jeph/src/`, the lifecycle is like this:

1. a client requests Jeph application and `jeph/src/main.js` is newer than Jeph
   application file
2. the application hands over execution to `jeph/recompile.php`
3. it compiles Jeph sources, and files from `jeph/src/`
4. then executes compiled code (it creates object graph and registers request handlers by calling `jeph()`)
5. then [`serialize()`s](http://php.net/serialize) object graph and rewrites Jeph application file
   with new serialized object graph and compiled sources
6. and then executes callbacks added by calling `jeph()`

### Compile time vs. run time

Jeph differentiates between compile time and run time. Run time is everything that
happens within `jeph()`-registered callbacks. Compile time is everything else. You
should do as much as possible at compile time.

What to do at compile time:

- `require()` files (`require()` is only available at compile time)
- load configuration
- create objects, object graph

What to do at run time:

- connect to database
- handle request

## JephDB

JephDB (`src/jeph_modules/jephdb`) is Jeph's database layer. JephDB is an
object/document-based database. Objects/documents are called entities. An entity is
an arbitrary Javascript object. Each entity also has an unique ID - 40 octets long HEX
string (like SHA1 hash).

Entities are retrieved from and stored into stores. JephDB comes with two stores -
`MemoryStore` and `UnionStore`. `MemoryStore` saves data only in memory, they are not persisted.
More on `UnionStore` later.

	var JephDB = require("jephdb"),
		db = new JephDB(new JephDB.MemoryStore);


	// create new entity, ID will be auto-generated
	var e = db.create({
		foo: "bar"
	});

	// entity now lives only in memory of JephDB instance
	// .save() method sends it to store
	e.save();

	// the same thing
	db.save(e);


	// create new entity with given ID and immediately save it
	var e = db.create("da39a3ee5e6b4b0d3255bfef95601890afd80709", {
		foo: "bar",
		fn: function () { return "hey there!"; }
	}).save();


	// retrieve entity by ID
	var e = db.get("da39a3ee5e6b4b0d3255bfef95601890afd80709");

	// entity properties are accessed by calling .get(propertyName)
	e.get("foo"); // returns "bar"
	e.get("fn")(); // "hey there!"

	// changed by calling .set(propertyName, newValue)
	e.set("foo", "baz!!!")
	e.get("foo") // "baz!!!"

### Querying

JephDB supports basic querying, like conditions, ordering, limit, offset and count.

	// select all entities
	db.query();

	// select entities that have property foo
	db.query({ foo: true });

	// select entities that do not have property foo
	db.query({ foo: false });

	// select entities where foo is string "bar"
	db.query({ foo: "bar" });

	// select entities where foo is number 42
	db.query({ foo: 42 });

	// select entities that have property foo, fluent interface
	db.query().where({ foo: true });

	// sort selected entities by foo in descending order and then by bar in ascending order
	db.query().sort({ foo: -1, bar: 1});

	// select at max 5 entities
	db.query().take(5);

	// do not take first 5 entities
	db.query().skip(5);

	// do not retrieves entities themselves, only count entities that have property foo
	db.query({ foo: true }).count()

	// results are provided to callback
	db.query({ foo: true }, function (err, result) {
		// ... process result ...
	});

	// every query method accepts callback as its last argument
	db.query().where({ foo: true }).sort({ foo: -1 }, function (err, result) {
		// ...
	});

	// when query is limited by .take(1), result is not an array, but a single entity
	db.query().sort({ added_at: -1 }).take(1, function (err, entity) {
		// ...
	});

	// result of count is a number
	db.query().count(function (err, numberOfEntities) {
		// ...
	});

### Transformations

Transformations add new properties to an entity:

	db.transformation({
		// value of a property is obtained by evaluating function
		hello: function () { return "world"; }
	});

	var e = db.create({});

	e.get("hello"); // "world"

Transformations use same conditions as queries:

	db.transformation({
		text: true,
		importantText: function () {
			// this is bound to an entity
			return "!!! " + this.get("text") + " !!!";
		}
	});

	var e = db.create({ text: "the text" });

	e.get("importantText"); // "!!! the text !!!"

Object is transfomed until there are no new properties to be added, order of
transformations does not matter:

	db.transformation({
		b: true,
		c: function () { return this.get("b"); }
	});

	db.transformation({
		a: true,
		b: function () { return this.get("a"); }
	});

	var e = db.create({ a: "foo" });
	e.get("a"); // "foo"
	e.get("b"); // "foo"
	e.get("c"); // "foo"

Transformation function can return undefined, property won't be added:

	db.transformation({
		stars: true,
		goodMovie: function () {
			if (this.get("stars") < 4) {
				return undefined;
			}

			return true;
		}
	});

	var StarWarsEpisode4 = db.create({ stars: 5 });
	// .get() without property name will return all properties
	StarWarsEpisode4.get(); // { stars: 5, goodMovie: true }

	var StarWarsEpisode2 = db.create({ stars: 2 });
	StarWarsEpisode2.get(); // { stars: 2 }

JephDB instance is passed to transformation function as its first argument:

	var path = require("path");

	db.transformation({
		parent: true,
		relativePath: true,
		absolutePath: function (db) {
			return path.normalize(db.get(this.get("parent")).get("absolutePath") +
				"/" + this.get("relativePath"));
		}
	});

	var root = db.create({ absolutePath: "/" }),
		branch = db.create({ parent: root.id, relativePath: "branch" }),
		leaf1 = db.created({ parent: branch.id, relativePath: "leaf1" }),
		leaf2 = db.created({ parent: branch.id, relativePath: "leaf2" });

	branch.get("absolutePath"); // "/branch"
	leaf1.get("absolutePath");  // "/branch/leaf1"
	leaf2.get("absolutePath");  // "/branch/leaf2"

### Query properties

If property's value is a query, query data are fetched:

	db.create({ item: "item1" }).save();
	db.create({ item: "item2" }).save();
	db.create({ item: "item3" }).save();

	var e = db.create({ list: db.query({ item: true }) }).save();

	e.get("list").map(function (e) { return e.get("item"); });
	// [ "item1", "item2", "item3" ]

Everytime entity is retrieved:

	db.create({ item: "item4" }).save();

	db.query({ list: true }).take(1, function (err, e) {
		e.get("list").map(function (e) { return e.get("item"); });
		// [ "item1", "item2", "item3", "item4" ]
	});

Transformations can return queries, too:

	db.transformation({
		itemKind: true,
		list: function (db) {
			return db.query({ item: true, kind: this.get("itemKind") });
		}
	});

	db.create({ item: "foo item 1", kind: "foo" }).save();
	db.create({ item: "foo item 2", kind: "foo" }).save();
	db.create({ item: "bar item 1", kind: "bar" }).save();

	var e = db.create({ itemKind: "foo" });
	e.get("list").map(function (e) { return e.get("item"); });
	// [ "foo item 1", "foo item 2" ]

	var e = db.create({ itemKind: "bar" });
	e.get("list").map(function (e) { return e.get("item"); });
	// [ "bar item 1" ]

### `UnionStore`

`UnionStore` combines data from many underlying stores. `UnionStore` saves data to
only one of its stores.

	var JephDB = require("jephdb");

	var a = new JephDB.MemoryStore,
		b = new JephDB.MemoryStore,
		c = new JephDB.MemoryStore;

	// stores to union store can be added by constructor,
	// first store supplied is save store
	var store = new JephDB.UnionStore(a, b, c);


	// or by calling .add(store, useAsSaveStore)
	// i.e. the same thing
	var store = new JephDB.UnionStore;
	store.add(a, true);
	store.add(b);
	store.add(c);

	// if none of .add() calls would set second argument to true, store will be readonly


	(new JephDB(a)).create({ item: "a" }).save();
	(new JephDB(b)).create({ item: "b" }).save();
	(new JephDB(c)).create({ item: "c" }).save();

	var db = new JephDB(new JephDB.UnionStore(a, b, c));

	db.query({ item: true }, function (err, result) {
		result.map(function (e) { return e.get("item"); });
		// [ "a", "b", "c" ]
	});

	db.create({ item: "from union" }).save();

	db.query({ item: true }, function (err, result) {
		result.map(function (e) { return e.get("item"); });
		// [ "a", "from union", "b", "c" ]
	});

## JephDBHandler

`JephDBHandler` combines power of Jeph and JephDB. If you access a page from an
application there is always something the page is all about. E.g. product detail page
is all about the product. I call this object/entity a root. A root entity can be
accessed by URL, i.e. it has URL, or just path, within the application. Also to be
able to serve request it has to have a handler.

JephDBHandler is a Jeph handler that can be registered as any other handler:

	var jeph = require("jeph"),
		JephDB = require("JephDB"),
		db = new JephDB(new JephDB.MemoryStore);

	jeph(jeph.JephDBHandler(db));

When a request is issued, for example with URI `/hello`, JephDBHandler queries
database for entities that have `jeph/path` equal to `/hello` and `jeph/handle` is
present. Then it calls `jeph/handle` with request, response and database as its arguments.

	db.create({
		"jeph/path": "/hello",
		"jeph/handle": function (req, res, db) {
			var body = "Hello, world!";

			res.writeHead(200, { "content-type": "text/plain",
				"content-length": body.length });

			res.end(body);
		}
	}).save();

Everything that is possible with JephDB is possible when used in JephDBHandler, most
notably transformations:

	db.transformation({
		"body": true,
		"jeph/handle": function (req, res, db) {
			// `this` is bound to an entity

			res.writeHead(200, { "content-type": "text/plain",
				"content-length": this.get("body").length });

			res.end(this.get("body"));
		}
	});

	db.create({
		"jeph/path": "/",
		"body": "Index"
	}).save();

	db.create({
		"jeph/path": "/hello",
		"body": "Hello, world!"
	}).save();

	// request to /      will show: Index
	// request to /hello will show: Hello, world!

JephDBHandler comes with some predefined transformations.

	var index = db.create({
		"jeph/path": "/",
		"body": "Index"
	}).save();

	var branch = db.create({
		"jeph/path/parent": index.id,
		"jeph/path/relative": "branch",
		"body": "Branch"
	}).save();

	db.create({
		"jeph/path/parent": branch.id,
		"jeph/path/relative": "leaf1",
		"body": "Leaf 1"
	}).save();

	db.create({
		"jeph/path/parent": branch.id,
		"jeph/path/relative": "leaf2",
		"body": "Leaf 2"
	}).save();

	// request to /             will show: Index
	// request to /branch       will show: Branch
	// request to /branch/leaf1 will show: Leaf 1
	// request to /branch/leaf2 will show: Leaf 2


## Jaml

Jaml is Jeph's template language and engine. It uses indentation-based approach to
structure blocks, similarly to [Jade](http://jade-lang.com/) or
[Haml](http://haml.info/). It compiles Jaml source code into Javascript function:

	var jaml = require("jaml"),
		template = jaml.compile("p Hello, world!");

	template(); // returns "<p>Hello, world!</p>"

Returned functions are independent of anything, so they can be easily `toString()`ed
and saved into a file:

	var fs = require("fs"),
		path = require("path"),
		jaml = require("jaml");

	var templateFile = __dirname + "/template.jaml",
		template = jaml.compile(fs.readFileSync(templateFile, "utf8"));

	fs.writeFile(
		path.basename(templateFile, ".jaml") + ".js",
		"exports = " + template.toString() + ";"
	);

### Doctype

	!!! 5
	HTML: <!DOCTYPE html>

Only predefined doctype is `5`, others get wrapped in `<!DOCTYPE ...>`

	!!! HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"
	HTML: <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">


### Tags

	p Hello, world!
	HTML: <p>Hello, world!</p>

	p Hello,
		a(href="#") world!
	HTML: <p>Hello, <a href="#">world!</a></p>

Shortcuts for IDs and classes:

	p.with-class Hello with class
	HTML: <p class="with-class">Hello, with class</p>

	p#with-id Hello with ID
	HTML: <p id="with-id">Hello with ID</p>

	p#with-id.and-with-class Hello with both
	HTML: <p id="with-id" class="and-with-class">Hello with both</p>

	#with-id Tag defaults to DIV
	HTML: <div id="with-id">Tag defaults to DIV</div>

Attribute values are Javascript code:

	p(some="attribute" another-attribute=variable) Hello with attributes
	Locals: { variable: "hey there!" }
	HTML: <p some="attribute" another-attribute="hey there!">Hello with attributes</p>

	p(some=attribute) undefineds are not shown
	Locals: { attribute: undefined }
	HTML: <p>undefineds are not shown</p>

Tags can be inlined:

	p: a(href="#") Inline tag
	HTML: <p><a href="#">Inline tag</a></p>

### Code

Any code is just Javascript.

	= echoAndEscape
	Locals: { echoAndEscape: "<script>document.write('HA-HA-HA!');</script>" }
	HTML: &lt;script&gt;document.write('HA-HA-HA!');&lt;/script&gt;

	!= echoAndDontEscape
	Locals: { echoAndDontEscape: "<script>document.write('HA-HA-HA!');</script>" }
	HTML: <script>document.write('HA-HA-HA!');</script>


	- var foo = "<b>bar</b>";
	!= foo

	Locals: {}
	HTML: <b>bar</b>

Blocks are created automatically:

	- var youAreUsingJaml = true;
	- if (youAreUsingJaml)
		p Great!
	- else
		p So sad :(

	HTML: <p>Great!</p>

	- var obj = { foo: "bar", bar: "baz" };
	ul
		- for (var k in obj)
			li: a(href="/" + k)= obj[k]

	HTML: <ul><li><a href="/foo">bar</a></li><li><a href="/bar">baz</a></li></ul>

Echoing can be inlined.

	- var inlineEchoAndEscape = "<script>document.write('HA-HA-HA!');</script>";
	p= inlineEchoAndEscape

	HTML: <p>&lt;script&gt;document.write('HA-HA-HA!');&lt;/script&gt;</p>


	- var inlineEchoAndDontEscape = "<script>document.write('HA-HA-HA!');</script>";
	p!= inlineEchoAndDontEscape

	HTML: <p><script>document.write('HA-HA-HA!');</script></p>

### Text

Text is denoted by bar (`|`):

	p
		| This
		| is
		| long
		| text.

	HTML: <p>This is long text.</p>

	p
		| There is
		a(href="#") a link.

	HTML: <p>There is <a href="#">a link.</a></p>

Text is concatenated by space by default. In `script`, `style` and `pre` by new line.

### Comments

Comments are denoted by `//`, they are not shown in HTML:

	// this won't be shown

	HTML:

You can comment out whole block:

	//
		p
			| There is
			| a paragraph
			| commented out.

	HTML:

## License

The MIT license

    Copyright (c) 2012 Jakub Kulhan <jakub.kulhan@gmail.com>

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
