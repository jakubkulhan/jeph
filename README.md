# Jeph

Jeph is an application framework that enables you to run Javascript-written
applications on top of regular PHP scripting engine. Jeph uses
[js2php](https://github.com/jakubkulhan/js2php) to compile Javascript code and
js2php's runtime environment.

Hello, world in Jeph looks like this:

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

	var body = require(__dirname + "/message.js");

	jeph(function (req, res) {
		res.writeHead(200, {
			"Content-Type": "text/plain; charset=UTF-8",
			"Content-Length": body.length });

		res.end(body);
	});


	jeph/src/message.js:

	return "Hello from message.js!";

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

- load configuration
- create objects, object graph

What to do at run time:

- connect to database
- handle requests

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
