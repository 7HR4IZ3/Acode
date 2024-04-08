const isProxy = Symbol("isProxy");
const getTarget = Symbol("getTarget");
const getCallstack = Symbol("getCallstack");
const getProxyData = Symbol("getProxyData");

class BaseProxy {
  #target;

  constructor(target) {
    this.#target = target;
    return new Proxy(() => {}, this.#proxyHandlers);
  }

  get #proxyHandlers() {
    let self = this;
    return {
      get: function (target, property) {
        if (property === isProxy) return true;
        if (property === getTarget) return self.#target;

        if (property === "then") {
          if (self.#target.$$__ignoreThen__$$) return undefined;
          if (self.#target.$$__obj_type__$$ === "awaitable") {
            return (resolve, reject) => {
              try {
                const next = self.#target.client.recieveSync({
                  target: property, action: "await_proxy",
                  location: self.#target.$$__location__$$
                });
                if (
                  next[isProxy] &&
                  next[getTarget].$$__obj_type__$$ === "awaitable"
                ) {
                  next[getTarget].$$__ignoreThen__$$ = true;
                }
                return resolve(next);
              } catch (err) {
                return reject(err);
              }
            };
          }
          return undefined;
        }

        if (property == "toJSON") {
          return () => ({
            $$__reverse__$$: true,
            $$__type__$$: "bridge_proxy",
            $$__obj_type__$$: "reverse_proxy",
            $$__location__$$: self.#target.$$__location__$$
          });
        }
        if (["prototype"].includes(property)) return target[property];

        if (typeof property == "string" && property.endsWith("$$")) {
          if (property === "$$Class") {
            // Create ClassWrapper
            property == property.slice(0, -2);
            return null;
          }
        }

        let useKwargs, isolate;
        let hasExtra = property.includes("$");
        if (property.includes("$")) {
          if (property === "$") {
          } else {
            if (property.startsWith("$")) {
              isolate = true;
              property = property.slice(1);
            }
            if (property.endsWith("$")) {
              useKwargs = true;
              property = property.slice(0, -1);
            }
          }
        }

        return self.#target.client.recieveSync({
          target: property,
          action: "get_proxy_attribute",
          location: self.#target.$$__location__$$
        });
      },
      set: function (target, property, value) {
        return self.#target.client.recieveSync({
          value: value,
          target: property,
          action: "set_proxy_attribute",
          location: self.#target.$$__location__$$
        });
      },
      ownKeys: function (target) {
        return Object.keys(
          self.#target.client.recieveSync({
            action: "get_proxy_attributes",
            location: self.#target.$$__location__$$
          })
        );
      },
      deleteProperty: function (target, prop) {
        // to intercept property deletion
        return self.#target.client.recieveSync({
          target: prop,
          action: "delete_proxy_attribute",
          location: self.#target.$$__location__$$
        });
      },
      has: function (target, prop) {
        return self.#target.client.recieveSync({
          target: prop,
          action: "has_proxy_attribute",
          location: self.#target.$$__location__$$
        });
      },
      apply: function (target, _thisArg, args) {
        return self.#target.client.recieveSync({
          args: args,
          action: "call_proxy",
          location: self.#target.$$__location__$$
        });
      },
      construct: function (target, args) {
        return self.#target.client.recieveSync({
          args: args,
          action: "call_proxy_constructor",
          location: self.#target.$$__location__$$
        });
      }
    };
  }
}

class ChainProxy extends Function {
  #target;
  #callstack;

  constructor(target, callstack) {
    super();
    this.#target = target;
    this.#callstack = callstack || [];
    return new Proxy(this, this.#proxyHandlers);
  }

  toString() {
    return `[You must await proxy object first]`;
  }

  get [getTarget]() {
    return this.#target;
  }

  get [getCallstack]() {
    return this.#callstack;
  }

  set [getCallstack](value) {
    if (!Array.isArray(value)) throw new Error("Callstack must be an array");
    this.#callstack = value;
  }

  get #proxyHandlers() {
    let self = this;
    return {
      get: function (target, property) {
        if (property === isProxy) return true;
        if (property === getTarget) return self.#target;
        if (property === getCallstack) return self.#callstack;

        if (typeof property == "string" && property.endsWith("$$")) {
          const next = new ChainProxy(self.#target, self.#callstack);
          if (!(property === "$$")) {
            next[getCallstack].push(property.slice(0, -2));
          }
          return null;
        }

        if (property == "toJSON") {
          return () => ({
            $$__type__$$: "bridge_proxy",
            $$__obj_type__$$: "reverse_proxy",
            $$__location__$$: self.#target.$$__location__$$,
            $$__reverse__$$: true,
            $$__proxy__$$: self.#callstack
          });
        }

        if (property == "then") {
          if (self.#callstack.length) {
            return (resolve, reject) => {
              self.#target.client
                .recieve({
                  action: "get_proxy_attribute",
                  stack: self.#callstack,
                  location: self.#target.$$__location__$$
                })
                .then(resolve)
                .catch(reject);
            };
          } else if (self.#target.$$__obj_type__$$ === "awaitable") {
            return (resolve, reject) => {
              self.#target.client
                .recieve({
                  target: property,
                  action: "await_proxy",
                  location: self.#target.$$__location__$$
                })
                .then(resolve)
                .catch(reject);
            };
          }
        }

        if (typeof property === "symbol") {
          if (property === Symbol.iterator) {
            // This is just for destructuring arrays
            return function* iter() {
              for (let i = 0; i < 100; i++) {
                const next = new ChainProxy(self.#target, [
                  ...self.#callstack,
                  i
                ]);
                yield next;
              }
              throw SyntaxError(
                "You must use `for await` when iterating over a Python object in a for-of loop"
              );
            };
          }
          if (property === Symbol.asyncIterator) {
            return async function* iter() {
              const it = await self.call(0, ["Iterate"], [{ ffid }]);
              while (true) {
                const val = await it.Next();
                if (val === "$$STOPITER") {
                  return;
                } else {
                  yield val;
                }
              }
            };
          }
          // log('Get symbol', next.callstack, property)
          return;
        }

        if (Number.isInteger(parseInt(property))) property = parseInt(property);

        return new ChainProxy(self.#target, [...self.#callstack, property]);
      },

      set: function (target, property, value) {
        return new Promise((resolve, reject) => {
          self.#target.client
            .recieve({
              action: "set_proxy_attribute",
              stack: self.#callstack,
              location: self.#target.$$__location__$$,
              value: value
            })
            .then(resolve)
            .catch(reject);
        });
      },
      ownKeys: function (target) {
        self.#target.client
          .recieve({
            action: "get_proxy_attributes",
            stack: self.#callstack,
            location: self.#target.$$__location__$$
          })
          .then(data => {
            self.#target.keys = data;
          });
        return [
          ...new Set([...Reflect.ownKeys(target), ...(self.#target.keys || [])])
        ];
      },
      deleteProperty: function (target, prop) {
        // to intercept property deletion
        return new Promise((resolve, reject) => {
          self.#target.client
            .recieve({
              action: "delete_proxy_attribute",
              target: prop,
              location: self.#target.$$__location__$$
            })
            .then(resolve)
            .catch(reject);
        });
      },
      has: function (target, prop) {
        return new Promise((resolve, reject) => {
          self.#target.client
            .recieve({
              action: "has_proxy_attribute",
              target: prop,
              location: self.#target.$$__location__$$
            })
            .then(resolve)
            .catch(reject);
        });
      },
      apply: function (target, _thisArg, args) {
        // console.log("Calling:", self.#callstack)
        return new Promise((resolve, reject) => {
          let final = self.#callstack[self.#callstack.length - 1];
          let kwargs = {};
          let isolate = false;

          if (final === "apply") {
            self.#callstack.pop();
            args = [args[0], ...args[1]];
          } else if (final === "call") {
            self.#callstack.pop();
          } else if (final?.includes("$")) {
            kwargs = args.pop();

            if (final === "$") {
              self.#callstack.pop();
            } else {
              if (final?.startsWith("$")) {
                isolate = true;
                final = final.slice(1);
                self.#callstack[self.#callstack.length - 1] = final;
              }
              if (final?.endsWith("$")) {
                self.#callstack[self.#callstack.length - 1] = final.slice(
                  0,
                  -1
                );
              }
            }
          }
          // } else if (final === 'valueOf') {
          //   self.#callstack.pop()
          //   const ret = this.value(ffid, [...self.#callstack])
          //   return ret
          // } else if (final === 'toString') {
          //   self.#callstack.pop()
          //   const ret = this.inspect(ffid, [...self.#callstack])
          //   return ret
          // }

          self.#target.client
            .recieveSync({
              action: "call_proxy",
              stack: self.#callstack,
              location: self.#target.$$__location__$$,
              args: args,
              kwargs: kwargs,
              isolate
            })
            .then(resolve)
            .catch(reject);
        });
      },
      construct: function (target, args) {
        // console.log("Construct:", self.#callstack)
        let final = self.#callstack[self.#callstack.length - 1];
        let kwargs = {};
        let isolate = false;

        if (final === "apply") {
          self.#callstack.pop();
          args = [args[0], ...args[1]];
        } else if (final === "call") {
          self.#callstack.pop();
        } else if (final?.includes("$")) {
          kwargs = args.pop();

          if (final === "$") {
            self.#callstack.pop();
          } else {
            if (final?.startsWith("$")) {
              isolate = true;
              final = final.slice(1);
              self.#callstack[self.#callstack.length - 1] = final;
            }
            if (final?.endsWith("$")) {
              self.#callstack[self.#callstack.length - 1] = final.slice(0, -1);
            }
          }
        }

        return new Promise((resolve, reject) => {
          self.#target.client
            .recieve({
              action: "call_proxy_constructor",
              stack: self.#callstack,
              location: self.#target.$$__location__$$,
              args: args,
              kwargs: kwargs,
              isolate
            })
            .then(resolve)
            .catch(reject);
          return;
        });
      }
    };
  }
}

module.exports = {
  isProxy,
  getTarget,
  BaseProxy,
  ChainProxy
};
