var fs = require("fs");

task("all", "clean and build bundle",
	"clean", "build:jaml", "build:bundle", "clean:js2php", "test");

task("build:jaml", "build jaml parser",
	result(__dirname + "/src/jeph_modules/jaml/parser.js"),
	__dirname + "/src/jeph_modules/jaml/parser.pegjs",
	function () {
		run("cd", __dirname + "/src/jeph_modules/jaml;", __dirname + "/js2php/util/jake", "build:parser");
	});

task("build:recompile", "build recompile script",
	result(__dirname + "/build/recompile.php"),
	__dirname + "/src/recompile.php",
	function () {
		run("cp", __dirname + "/src/recompile.php", __dirname + "/build/recompile.php");
	});

task("build:image", "build image with loader",
	result(__dirname + "/build/image.php"),
	__dirname + "/js2php/src/image/*.js",
	__dirname + "/js2php/src/*",
	function (php52) {
		if (php52) {
			run("touch", __dirname + "/js2php/src/JSParser.phpeg");
			run("cd", __dirname + "/js2php;", __dirname + "/js2php/util/jake", "build:parser", "5.2");
		}

		try {
			run("grep loadFunction " + __dirname + "/js2php/build/image.php > /dev/null");
		} catch (e) {
			run("touch", __dirname + "/js2php/src/image/*");
		}

		run("cd", __dirname + "/js2php;", __dirname + "/js2php/util/jake", "build:image", "loadFunction");
		run("cp", __dirname + "/js2php/build/image.php", __dirname + "/build");
	});

task("build:bundle", "build jeph bundle",
	"build:recompile", "build:image",
	result(__dirname + "/build/bundle.php"),
	__dirname + "/build/image.php",
	__dirname + "/src/*",
	__dirname + "/src/*/*",
	__dirname + "/src/*/*/*",
	__dirname + "/src/*/*/*/*",
	__filename,
	function () {
		var code = "<?php\n", imageCode = "", serialized,
			var_export = PHP.fn("var_export");

		// TODO: handling and reporting of errors

		// init makes directory structure
		code += "@mkdir(dirname(__FILE__) . '/jeph', 0775);\n";
		code += "@mkdir(dirname(__FILE__) . '/jeph/c', 0775);\n";
		code += "@mkdir(dirname(__FILE__) . '/jeph/f', 0775);\n";
		code += "@mkdir(dirname(__FILE__) . '/jeph/cache', 0775);\n";

		function getAllSubdirs(dir) {
			var dirs = [];

			PHP.fn("glob")(dir + "/*").forEach(function (d) {
				if (!PHP.fn("is_dir")(d)) { return; }
				dirs.push(d.substring(dir.length + 1));

				getAllSubdirs(d).forEach(function (e) {
					dirs.push(d.substring(dir.length + 1) + "/" + e);
				});
			});

			return dirs;
		}

		// then uploads jeph sources
		puts("[ INCLUDING jeph source ]");
		getAllSubdirs(__dirname + "/src").forEach(function (d) {
			code += "@mkdir(dirname(__FILE__) . " +
				PHP.fn("var_export")("/jeph/" + d, true) + ", 0775);\n";

			PHP.fn("glob")(__dirname + "/src/" + d + "/*.*").forEach(function (f) {
				code += "file_put_contents(dirname(__FILE__) . '/jeph/" +
					f.substring((__dirname + "/src/").length) + "', " +
					var_export(PHP.fn("file_get_contents")(f), true) + ");\n";
			});
		});

		// then uploads recompile script
		puts("[ INCLUDING recompile.php ]");
		code += "file_put_contents(dirname(__FILE__) . '/jeph/recompile.php', " +
			var_export(PHP.fn("file_get_contents")(__dirname + "/build/recompile.php"), true) + ");\n";

		// then populates jeph/c and jeph/f with image functions/classes
		puts("[ INCLUDING image functions and classes ]");
		PHP.fn("file_get_contents")(__dirname + "/build/image.php")
			.split(/\n/).forEach(function (line) {
				var m;

				if ((m = line.match(/^function ([a-zA-Z0-9_]+)/)) !== null) {
					code += "file_put_contents(dirname(__FILE__) . '/jeph/f/" + m[1] + ".php', " +
						var_export("<?php\n" + line, true) + ");\n";

					if (/^function [a-zA-Z0-9_]+\(\$global,\$scope/.test(line)) {
						imageCode += line + "\n";
					}

				} else if ((m = line.match(/^class ([a-zA-Z0-9_]+)/)) !== null) {
					code += "file_put_contents(dirname(__FILE__) . '/jeph/c/" + m[1] + ".php', " +
						var_export("<?php\n" + line, true) + ");\n";

					if (m[1] === "JS" || m[1] === "JSUndefined") {
						imageCode += line + "\n";
					}

				} else if ((m = line.match(/^foreach \(unserialize\(([^)]+)\)/)) !== null) {
					serialized = m[1];
				}
			});

		// stores image's code to be added to jeph.php and serialized object graph
		puts("[ INCLUDING recompile.init.php ]");
		code += "$basePath = dirname($_SERVER['SCRIPT_NAME']);\n";
		code += "file_put_contents(dirname(__FILE__) . '/jeph/recompile.init.php', " +
			var_export("<?php\n$imageCode = " + var_export(imageCode, true) + ";\n" +
				"$serialized = " + serialized + ";\n", true) +
			" . '$basePath = ' . var_export($basePath, TRUE) . \";\\n\"" +
			" . '$mainFile = dirname(__FILE__) . \\'/index.php\\';' . \"\\n\");\n";

		// creates .htaccess
		puts("[ INCLUDING .htaccess ]");
		code += "$htaccess = implode(\"\\n\", array(" +
			"'Options FollowSymlinks'," +

			"'RewriteEngine on'," +
			"'RewriteBase ' . $basePath," +

			"'RewriteRule ^static(.*) jeph/src/static$1'," +

			"'RewriteCond %{REQUEST_FILENAME} !-f'," +
			"'RewriteRule .* index.php [L]'" +
			"));\n";
		code += "file_put_contents(dirname(__FILE__) . '/.htaccess', $htaccess . \"\\n\");\n";

		// uploads static files
		puts("[ INCLUDING static/ ]");
		code += "@mkdir(dirname(__FILE__) . '/jeph/src/static', 0775);";
		function includeStaticFiles(dir, base) {
			base = base || dir;

			PHP.fn("glob")(dir + "/*").forEach(function (f) {
				if (PHP.fn("is_dir")(f)) {
					includeStaticFiles(f, base);

				} else {
					code += "file_put_contents(dirname(__FILE__) . '/jeph/src/static' . " +
						var_export(f.substring(base.length), true) + ", " +
						var_export(PHP.fn("file_get_contents")(f), true) + ");\n";
				}
			});
		}
		includeStaticFiles(__dirname + "/src/static");

		// and finally calls recompile script and redirect to index
		code += "$doNotRun = TRUE;\n";
		code += "require dirname(__FILE__) . '/jeph/recompile.php';\n";
		code += "header('Location: http://' . $_SERVER['HTTP_HOST'] . $basePath);\n";

		// save init
		PHP.fn("file_put_contents")(__dirname + "/build/bundle.php", code);
	});

task("clean", "clean build/ directory",
	function () {
		run("rm -rf", __dirname + "/build/*");
		run("rm -rf", __dirname + "/try");
	});

task("clean:js2php", "clean js2php/ directory",
	function () {
		run("cd " + __dirname + "/js2php;", "git co .");
	});

task("test", "run tests",
	function () {
		fs.readdirSync(__dirname + "/src/jeph_modules").forEach(function (m) {
			if (fs.existsSync(__dirname + "/src/jeph_modules/" + m + "/test")) {
				run(__dirname + "/js2php/util/jtest", __dirname + "/src/jeph_modules/" + m + "/test");
			}
		});
	});

task("try", "create try/ directory with bundle installed",
	"build:bundle",
	function () {
		run("rm -rf", __dirname + "/try/*");
		run("mkdir -p", __dirname + "/try");
		run("chmod 777", __dirname + "/try");
		run("cp", __dirname + "/build/bundle.php", __dirname + "/try");
	});
