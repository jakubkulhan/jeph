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
	'5': '<!DOCTYPE html>'
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
