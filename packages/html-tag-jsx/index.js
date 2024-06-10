
const tag = require("html-tag-js");

function createElement(type, props, _key) {
  if (props.children !== undefined) {
    if (!Array.isArray(props.children)) {
      props.children = [props.children]
    }
  }
  
  if (typeof type === "function") {
    return type(props);
  }

  return tag(type, props)
}

module.exports = {
  createElement
}
