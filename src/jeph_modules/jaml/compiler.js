var nodes = require("./nodes.js"),
    parser = require("./parser.js");

module.exports.compile = function compile(s) {
    return parser.parse(s).compile();
};

function compileContent(content, space) {
    space = space || " ";
    var ret = "", prevNode;
    for (var i in content) {
        if ((content[i] instanceof nodes.Text &&
                (prevNode instanceof nodes.Text || prevNode instanceof nodes.Tag ||
                    prevNode instanceof nodes.Echo || prevNode instanceof nodes.EchoDontEscape)) ||
            (content[i] instanceof nodes.Tag &&
                (prevNode instanceof nodes.Text || prevNode instanceof nodes.Echo ||
                    prevNode instanceof nodes.EchoDontEscape)))
        {
            ret += "__buf.push(" + JSON.stringify(space) + ");\n";
        }

        ret += content[i].compile();
        prevNode = content[i];
    }
    return ret;
}

function escape(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


Object.defineProperty(nodes.Document.prototype, "compile", { value: function () {
    var body = "var __buf = [], __class, __tmp, __escape = " + escape.toString() + ";\n";
    body += "with (__o || {}) {\n" + compileContent(this.content) + "}\nreturn __buf.join('');\n";
    return new Function("__o", body);
}});

Object.defineProperty(nodes.Doctype.prototype, "compile", { value: function () {
    return "__buf.push(" + JSON.stringify(
        this.doctypes[this.doctype] !== undefined
            ? this.doctypes[this.doctype]
            : "<!DOCTYPE " + this.doctype + ">") + ");\n";
}});

Object.defineProperty(nodes.Comment.prototype, "compile", { value: function () {
    // FIXME: conditional comments
    return "";
}});

Object.defineProperty(nodes.Code.prototype, "compile", { value: function () {
    return this.code + "\n" +
        (this.content.length
            ? "{\n" + compileContent(this.content) + "\n}"
            : "");
}});

Object.defineProperty(nodes.Tag.prototype, "compile", { value: function () {
    var ret = "__buf.push('<" + this.name + "');\n";

    if (this.attributes.id !== undefined) {
        var id = this.attributes.id;
        delete this.attributes.id;

        if (Array.isArray(id)) {
            id = id[id.length - 1];
        }

        if (typeof id === "string") {
            ret += "__buf.push(' id=\"" + escape(id) + "\"');\n";
        } else if (id instanceof nodes.Code) {
            ret += "__buf.push(' id=\"' + (" + id.code + ") + '\"');\n";
        } else {
            throw new Error("Cannot handle attribute id, " + id + " given");
        }
    }

    if (this.attributes.class !== undefined) {
        var cls = this.attributes.class;
        delete this.attributes.class;

        if (!Array.isArray(cls)) {
            cls = [ cls ];
        }

        ret += "__class = [];\n";
        for (var i in cls) {
            if (typeof cls[i] === "string") {
                ret += "__class.push(" + JSON.stringify(escape(cls[i])) + ");\n";
            } else if (cls[i] instanceof nodes.Code) {
                ret += "__tmp = " + cls[i].code + ";\n";
                ret += "if (__tmp !== undefined) { __class.push(__escape(__tmp)); }\n";
            } else {
                throw new Error("Cannot handle attribute class, " + cls[i] + " given");
            }
        }
        ret += "if (__class.length) { __buf.push(' class=\"' + __escape(__class.join(' ')) + '\"'); }\n";
    }

    var attrNames = Object.keys(this.attributes);
    attrNames.sort();

    for (var i in attrNames) {
        var n = attrNames[i], v = this.attributes[n];
        ret += "__tmp = " + v.code + ";\n";
        ret += "if (__tmp !== undefined) { __buf.push(' " + n + "=\"' + __escape(__tmp) + '\"'); }\n";
    }

    ret += "__buf.push('>');\n";
    ret += compileContent(this.content, (this.isRaw() || this.name === "pre")? "\n" : " ");
    if (!this.isVoid()) { ret += "__buf.push('</" + this.name + ">');\n"; }

    return ret;
}});

Object.defineProperty(nodes.Text.prototype, "compile", { value: function () {
    return "__buf.push(" + JSON.stringify(escape(this.text)) + ");\n";
}});

Object.defineProperty(nodes.Echo.prototype, "compile", { value: function () {
    return "__buf.push(__escape(" + this.code + "));\n";
}});

Object.defineProperty(nodes.EchoDontEscape.prototype, "compile", { value: function () {
    return "__buf.push(" + this.code + ");\n";
}});
