{ var nodes = require("./nodes"), indentStack = [], indent = ""; }

start
  = INDENT? es:( blank { return undefined; }
               / SAMEDENT e:element { return e; }
               )+
    { return new nodes.Document(es.filter(function (e) { return e !== undefined; })); }

element
  = "!!!" l:line EOS { return new nodes.Doctype(l); }
  / "|" l:line EOS { return new nodes.Text(l); }
  / "-" l:line EOS es:children? { return new nodes.Code(l, es === "" ? [] : es); }
  / "=" l:line EOS { return new nodes.Echo(l); }
  / "!=" l:line EOS { return new nodes.EchoDontEscape(l); }
  / "//" l:line EOS es:children? { return new nodes.Comment(l, es === "" ? [] : es); }
  / tag:(t:id { return new nodes.Tag(t); })?

    idCls:( "#" id:id { return [ "id", id ]; }
          / "." cls:id { return [ "class", cls ]; }
          )*

    &{ return tag || idCls.length; }

    attrs:( "(" a:( name:id __ "=" __ value:attribute
                  { return [ name, new nodes.Code(value) ]; } )+ ")" { return a; })?

    inline:( "=" l:line { return new nodes.Echo(l); }
           / "!=" l:line { return new nodes.EchoDontEscape(l); }
           / ":" [ \t]* e:element { return e; }
           / l:line { if (l.length > 0) { return new nodes.Text(l); } else { return undefined; } }
           )?

    EOS
    es:children?

    {
        if (tag === "") {
            tag = new nodes.Tag;
        }

        if (tag.isVoid() && tag.content.length) {
            throw new SyntaxError("Tag " + tag.name + " is void, it cannot have any content.");
        }

        if (tag.isRaw()) {
            for (var i in tag.content) {
                if (tag.content[i] instanceof nodes.Code ||
                    tag.content[i] instanceof nodes.Text ||
                    tag.content[i] instanceof nodes.Echo ||
                    tag.content[i] instanceof nodes.EchoDontEscape) { continue; }

                throw new SyntaxError("Tag " + tag.name + " is raw, it can contain only text, code, and echo content.");
            }
        }

        for (var i in idCls) {
            tag.addAttribute(idCls[i][0], idCls[i][1]);
        }

        if (attrs) {
            for (var i in attrs) {
                tag.addAttribute(attrs[i][0], attrs[i][1]);
            }
        }

        if (inline) {
            tag.content.push(inline);
        }

        if (es) {
            for (var i in es) {
                tag.content.push(es[i]);
            }
        }

        return tag;
    }

children
  = blank* INDENT
    es:( blank { return undefined; }
       / SAMEDENT e:element { return e; }
       )+
    DEDENT
    { return es.filter(function (e) { return e !== undefined; }); }

id
  = id:( cs:[a-zA-Z0-9_-]+ { return cs.join(""); }
       / ":" &[a-zA-Z0-9_-] { return ":"; }
       )+
    { return id.join(""); }

__
  = [ \t\r\n]*

attribute
  = cs:( !(id __ "=") !"(" !")" c:. { return c; }
       / "(" b:braced ")" { return "(" + b + ")"; }
       )+
    { return cs.join("").trim(); }

braced
  = cs:( !"(" !")" c:. { return c; }
       / "(" b:braced ")" { return "(" + b + ")"; }
       )+
    { return cs.join(""); }

line
  = cs:(!EOL c:. { return c; })* { return cs.join("").trim(); }

blank
  = [ \t]* EOL

EOL
  = "\r\n" / "\n" / "\r"

EOS
  = EOL / !.

SAMEDENT
  = i:[ \t]* &{ return i.join("") === indent; }

INDENT
  = i:[ \t]+ &{ return i.length > indent.length; }
    { indentStack.push(indent); indent = i.join(""); pos = offset; }

DEDENT
  = { indent = indentStack.pop(); }
