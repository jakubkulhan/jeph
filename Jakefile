task("all", "clean and build bundle",
	"clean", "build:bundle");

task("build:recompile", "build recompile script",
	result(__dirname + "/build/recompile.php"),
	__dirname + "/src/recompile.php",
	function () {
		run("cp", __dirname + "/src/recompile.php", __dirname + "/build/recompile.php");
	});

task("build:image", "build image with loader",
	result(__dirname + "/build/image.php"),
	__dirname + "/js2php/src/image/*.js",
	function () {
		run("touch", __dirname + "/js2php/src/image/*");
		run("cd", __dirname + "/js2php;", __dirname + "/js2php/util/jake", "build:image", "loadFunction");
		run("mv", __dirname + "/js2php/build/image.php", __dirname + "/build");
		run("touch", __dirname + "/js2php/src/image/*");
		run("cd", __dirname + "/js2php;", __dirname + "/js2php/util/jake", "build:image");
		run("touch", __dirname + "/build/image.php");
	});

task("build:bundle", "build jeph bundle",
	"build:recompile", "build:image",
	result(__dirname + "/build/bundle.php"),
	__dirname + "/src/*.js",
	__dirname + "/src/*/*.js",
	__filename,
	function () {
		var code = "<?php\n", imageCode = "", serialized,
			var_export = PHP.fn("var_export");

		// TODO: handling and reporting of errors

		// init makes directory structure
		code += "@mkdir(dirname(__FILE__) . '/jeph', 0755);\n";
		code += "@mkdir(dirname(__FILE__) . '/jeph/c', 0755);\n";
		code += "@mkdir(dirname(__FILE__) . '/jeph/f', 0755);\n";
		code += "@mkdir(dirname(__FILE__) . '/jeph/cache', 0755);\n";
		code += "@mkdir(dirname(__FILE__) . '/jeph/src', 0755);\n";

		// then uploads jeph sources
		puts("[ INCLUDING jeph source ]");
		[].concat(PHP.fn("glob")(__dirname + "/src/*.js"), PHP.fn("glob")(__dirname + "/src/*/*.js"))
			.forEach(function (f) {
				code += "file_put_contents(dirname(__FILE__) . '/jeph/" +
					f.substring((__dirname + "/src/").length) + "', " +
					var_export(PHP.fn("file_get_contents")(f), true) + ");\n";
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

		// TODO: .htaccess

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

task("try", "create try/ directory with bundle installed",
	"build:bundle",
	function () {
		run("rm -rf", __dirname + "/try/*");
		run("mkdir -p", __dirname + "/try");
		run("chmod 777", __dirname + "/try");
		run("cp", __dirname + "/build/bundle.php", __dirname + "/try");
	});
