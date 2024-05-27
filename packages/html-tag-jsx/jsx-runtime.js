const tag = require("html-tag-js");

const Fragment = Symbol("jsx.fragment");

function jsx(type, props, key) {
  if (props.children) {
    if (!Array.isArray(props.children)) {
      props.children = [props.children]
    }
  }

  if (type === Fragment) {
    return tag("div", props);
  } else if (typeof type === "string") {
    return tag(type, props);
  } else if (typeof type === "function") {
    return type(props);
  }

  throw new Error("Invalid type");
}

module.exports = { Fragment, jsx, jsxs: jsx }
