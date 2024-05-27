
const tag = require("html-tag-js");

function createElement(type, props, _key) {
  return tag(type, props)
}

module.exports = {
  createElement
}
