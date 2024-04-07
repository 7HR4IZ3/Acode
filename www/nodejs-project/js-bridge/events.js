class BaseEventHandler {
  #getProxy;
  #getContext;

  constructor(getContextCallback, getProxyCallback) {
    this.#getProxy = getProxyCallback;
    this.#getContext = getContextCallback;
  }

  processAction(action, data, respond) {
    const callback = this["action:" + action];
    if (!callback) return false;

    try {
      respond(callback.call(this, data));
    } catch (error) {
      respond(null, error);
    }
    return true;
  }

  "action:evaluate"({ value }) {
    return this.#getContext()[value];
  }

  async "action:await_proxy"(request) {
    let response,
      target = this.#getProxy(request.location);
    if (Array.isArray(request.stack)) {
      const stack = request.stack;
      if (!target) {
        target = this.#getContext()[stack.splice(0, 1)];
      }
      for (let item of stack) {
        target = target[item];
      }
    }
    if (target) {
      response = await target;
    }
    return response;
  }

  "action:call_proxy"(request) {
    let response,
      target = this.#getProxy(request.location);
    if (Array.isArray(request.stack)) {
      const stack = request.stack;
      if (!target) {
        target = this.#getContext()[stack.splice(0, 1)];
      }
      for (let item of stack) {
        target = target[item];
      }
    }
    if (target) {
      response = target(...(request.args || []));
    }
    return response;
  }

  "action:call_proxy_constructor"(request) {
    let response,
      target = this.#getProxy(request.location);
    if (Array.isArray(request.stack)) {
      const stack = request.stack;
      if (!target) {
        target = this.#getContext()[stack.splice(0, 1)];
      }
      for (let item of stack) {
        target = target[item];
      }
    }
    if (target) {
      response = new target(...(request.args || []));
    }
    return response;
  }

  "action:get_proxy_repr"(request) {
    let response,
      target = this.#getProxy(request.location);
    if (target) {
      if (request.string) response = String(target);
      else response = require("util").inspect(target);
    }
    return response;
  }

  "action:get_proxy_index"(request) {
    let response,
      target = this.#getProxy(request.location);
    if (Array.isArray(request.stack)) {
      const stack = request.stack;
      if (!target) {
        target = this.#getContext()[stack.splice(0, 1)];
      }
      for (let item of stack.slice(0, -1)) {
        target = target[item];
      }
      request.target = stack.at(-1)
    }
    if (target) {
      response = target[request.target];
      if (typeof response == "function") {
        return response.bind(target);
      }
    }
    return response;
  }

  "action:get_proxy_attributes"(request) {
    let response,
      target = this.#getProxy(request.location);
    if (Array.isArray(request.stack)) {
      const stack = request.stack;
      if (!target) {
        target = this.#getContext()[stack.splice(0, 1)];
      }
      for (let item of stack) {
        target = target[item];
      }
    }
    if (target) {
      response = Reflect.ownKeys(target);
    }
    return response;
  }

  "action:set_proxy_index"(request) {
    return this["action:set_proxy_attribute"](request);
  }

  "action:get_proxy_attribute"(request) {
    let response,
      target = this.#getProxy(request.location);
    if (Array.isArray(request.stack)) {
      const stack = request.stack;
      if (!target) {
        target = this.#getContext()[stack.splice(0, 1)];
      }
      for (let item of stack.slice(0, -1)) {
        target = target[item];
      }
      request.target = stack.at(-1)
    }
    if (target) {
      response = target[request.target];
      if (typeof response == "function") {
        try {
          return response.bind(target);
        } catch (err) {}
      }
    }
    return response;
  }

  "action:set_proxy_attribute"(request) {
    let target = this.#getProxy(request.location);
    if (Array.isArray(request.stack)) {
      const stack = request.stack;
      if (!target) {
        target = this.#getContext()[stack.splice(0, 1)];
      }
      for (let item of stack.slice(0, -1)) {
        target = target[item];
      }
      request.target = stack.at(-1)
    }
    if (target) {
      target[request.target] = request.value;
    }
    return true;
  }

  "action:get_primitive"(request) {
    let target = this.#getProxy(request.location);
    if (Array.isArray(request.stack)) {
      const stack = request.stack;
      if (!target) {
        target = this.#getContext()[stack.splice(0, 1)];
      }
      for (let item of stack) {
        target = target[item];
      }
    }
    return target;
  }
}

module.exports = { BaseEventHandler };
