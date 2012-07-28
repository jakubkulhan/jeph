module.exports = {
	Document: function Document(content) {
		this.content = content;
	},

	Doctype: function Doctype(doctype) {
		this.doctype = doctype || "html";
	},

	Comment: function Comment(comment, content) {
		this.comment = comment;
		this.content = content || [];
	},

	Code: function Code(code, content) {
		this.code = code;
		this.content = content || [];
	},

	Tag: function Tag(name, attributes, content) {
		this.name = name || "div";
		this.attributes = attributes || {};
		this.content = content || [];
	},

	Text: function Text(text) {
		this.text = text;
	},

	Echo: function Echo(code) {
		this.code = code;
	},

	EchoDontEscape: function EchoDontEscape(code) {
		this.code = code;
	}
};

Object.defineProperty(module.exports.Doctype.prototype, "doctypes", { value: {
	'5': '<!DOCTYPE html>',
	'xml': '<?xml version="1.0" encoding="utf-8" ?>',
	'transitional': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
	'strict': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
	'frameset': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">',
	'1.1': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">',
	'basic': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">',
	'mobile': '<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">'
}});

Object.defineProperty(module.exports.Tag.prototype, "addAttribute", {
	value: function addAttribute(name, value) {
		if (this.attributes[name] === undefined) {
			this.attributes[name] = value;
		} else {
			if (!Array.isArray(this.attributes[name])) {
				this.attributes[name] = [ this.attributes[name] ];
			}
			this.attributes[name].push(value);
		}
	}
});

Object.defineProperty(module.exports.Tag.prototype, "isVoid", {
	value: function isVoid() {
		return [ "area", "base", "br", "col", "command", "embed", "hr", "img",
			"input", "keygen", "link", "meta", "param", "source", "track",
			"wbr" ].indexOf(this.name) !== -1;
	}
});

Object.defineProperty(module.exports.Tag.prototype, "isRaw", {
	value: function isRaw() {
		return [ "script", "style", "textarea", "title" ].indexOf(this.name) !== -1;
	}
});
