import pty from "lib/pty";

let loader = acode.require("loader");
let progress = new Map();

export class ReconnectingWebSocket extends EventTarget {
  onopen;
  onclose;
  onerror;
  onmessage;

  constructor(
    url,
    protocols,
    autoConnect = false,
    autoReconnect = true,
    delay = 1,
    autoClose = 60 * 3
  ) {
    super();

    this.url = url;
    this.protocols = protocols;
    this.autoReconnect = autoReconnect;
    this.autoClose = autoClose;
    this.delay = delay; // Reconnect delay in milliseconds
    this.connection = null;
    this.eventListeners = {};
    this.sendQueue = new Array();

    this.$closeTimeout = null;
    this.$retries = 0;
    this.$maxRetries = 20;

    autoConnect && this.connect();
  }

  get readyState() {
    if (this.connection) {
      return this.connection.readyState;
    }
    return WebSocket.CLOSED;
  }

  connect(retry = true) {
    this.autoReconnect = true;
    if (this.readyState !== WebSocket.CLOSED) return;
    try {
      this.$retries += 1;
      this.connection = new WebSocket(this.url, this.protocols);

      this.connection.onopen = event => {
        this.dispatchEvent(new Event("open"));
        this.onopen?.(event);

        if (this.sendQueue.length) {
          let newQueue = [...this.sendQueue];
          this.sendQueue = [];
          newQueue.map(data => this.send(data));
        }
        this.$retries = 0;
      };

      this.connection.onmessage = event => {
        this.dispatchEvent(
          new MessageEvent("message", {
            data: event.data
          })
        );
        this.onmessage?.(event);
      };

      this.connection.onclose = event => {
        if (this.autoReconnect && this.$retries < this.$maxRetries) {
          setTimeout(() => this.connect(), this.delay * 1000);
        } else {
          this.dispatchEvent(
            new CloseEvent("close", {
              reason: event.reason,
              code: event.code,
              wasClean: event.wasClean
            })
          );
          this.onclose?.(event);
        }
      };

      this.connection.onerror = error => {
        this.dispatchEvent(new ErrorEvent("error"));
        this.onerror?.(error);
      };

      if (this.autoClose && this.autoClose > 0) {
        this.$closeTimeout = setTimeout(
          () => this.close(),
          this.autoClose * 1000
        );
      }
    } catch {
      if (retry && this.autoReconnect) {
        setTimeout(() => this.connect(), this.delay * 1000);
      }
    }
  }

  reconnect() {
    if (this.connection && this.connection.readyState !== WebSocket.CLOSED) {
      this.connection.close();
    }
    this.connect();
  }

  send(data) {
    // console.log("[Sending]", data, this.connection?.readyState);
    if (this.connection) {
      if (this.connection.readyState === WebSocket.OPEN) {
        this.connection.send(data);
      } else {
        this.sendQueue.push(data);
        console.warn("WebSocket not open. Unable to send data.");
      }
    } else {
      this.sendQueue.push(data);
      this.connect();
    }

    if (this.$closeTimeout) {
      clearTimeout(this.$closeTimeout);
      this.$closeTimeout = setTimeout(
        () => this.close(),
        this.autoClose * 1000
      );
    }
  }

  close(autoReconnect = false) {
    this.autoReconnect = autoReconnect;
    if (this.connection) {
      this.connection.close();

      let event = new CloseEvent("close", {
        reason: "Server disconnected.",
        code: 1000,
        wasClean: true
      });
      this.dispatchEvent(event);
      this.onclose?.(event);
      this.connection = null;
    }
  }
}

export function formatUrl(path, formatTermux = false) {
  if (path.startsWith("content://com.termux.documents/tree")) {
    path = path.split("::")[1];
    if (formatTermux) {
      path = path.replace(/^\/data\/data\/com\.termux\/files\/home/, "$HOME");
    }
    return path;
  } else if (path.startsWith("file:///storage/emulated/0/")) {
    let sdcardPath =
      "/sdcard" +
      path
        .substr("file:///storage/emulated/0".length)
        .replace(/\.[^/.]+$/, "")
        .split("/")
        .join("/") +
      "/";
    return sdcardPath;
  } else if (
    path.startsWith(
      "content://com.android.externalstorage.documents/tree/primary"
    )
  ) {
    path = path.split("::primary:")[1];
    let androidPath = "/sdcard/" + path;
    return androidPath;
  } else {
    return;
  }
}

/*export function unFormatUrl(fileUrl) {
  if (fileUrl.startsWith("file://")) {
    let filePath = fileUrl.slice(7);
    
    filePath = filePath.replace("/storage/emulated/0", '/sdcard');
    filePath = filePath.replace('/sdcard', '').slice(1);

    const pathSegments = filePath.split("/");

    // Extract the first folder and encode it
    const firstFolder = encodeURIComponent(pathSegments[0]);

    // Combine the content URI
    const contentUri = `content://com.android.externalstorage.documents/tree/primary%3A${firstFolder}::primary:${filePath}`;
    return contentUri;
  } else {
    return fileUrl;
  }
}*/

export function unFormatUrl(fileUrl) {
  if (!(fileUrl.startsWith("file:///") || fileUrl.startsWith("/"))) {
    return fileUrl;
  }

  // Remove the "file:///" and "/" prefix
  let path = fileUrl.replace(/^file:\/\//, "").slice(1);
  path = path.replace("storage/emulated/0", "sdcard");

  if (
    path.startsWith("$HOME") ||
    path.startsWith("data/data/com.termux/files/home")
  ) {
    let termuxPrefix =
      "content://com.termux.documents/tree/%2Fdata%2Fdata%2Fcom.termux%2Ffiles%2Fhome::/data/data/com.termux/files/home";

    // Remove $HOME or termux default home path and merge the rest
    let termuxPath = path.startsWith("$HOME")
      ? path.substr("$HOME".length)
      : path.substr("data/data/com.termux/files/home".length);
    return termuxPrefix + termuxPath;
  } else if (path.startsWith("sdcard")) {
    let sdcardPrefix =
      "content://com.android.externalstorage.documents/tree/primary%3A";
    let relPath = path.substr("sdcard/".length);

    let sourcesList = JSON.parse(localStorage.storageList || "[]");
    for (let source of sourcesList) {
      if (source.uri.startsWith(sdcardPrefix)) {
        let raw = decodeURIComponent(source.uri.substr(sdcardPrefix.length));
        if (relPath.startsWith(raw)) {
          return source.uri + "::primary:" + relPath;
        }
      }
    }

    // Extract the folder name after sdcard
    let folderName = relPath.split("/")[0];
    // Add the folder name and merge the rest
    let sdcardPath =
      sdcardPrefix + folderName + "::primary:" + path.substr("sdcard/".length);
    return sdcardPath;
  } else {
    return fileUrl;
  }
}
export function getFolderName(sessionId) {
  if (window.acode) {
    let file =
      window.editorManager.files.find(
        file => file.session["id"] == sessionId
      ) || window.editorManager.activeFile;
    if (file?.uri) {
      let formatted = formatUrl(file.uri);
      if (formatted) return formatted;
    }
  }
  return undefined;
}

export function getExtension(fileName) {
  let url = acode.require("url");
  return url.extname(fileName);
}

// Utilities
let expectedLength,
  chunks = [],
  DEBUG = false;

function addHeaders(data, sep) {
  let length = data.length;
  // console.log(data, data.length)
  return "Content-Length: " + String(length) + sep + data;
}

function checkJSON(data) {
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}

let handleMessage = (wrapper, dataString, dataLength) => {
  if (!dataString && dataLength) {
    expectedLength = dataLength;
    return;
  }

  // If currentMessage matches the local data length, send and return
  if (
    dataLength &&
    (dataString.length === dataLength || dataString.length === dataLength - 4)
  ) {
    DEBUG && console.log("DSending:", dataString, checkJSON(dataString));
    return wrapper.dispatchEvent("message", dataString);
  }

  // If currentMessage matches the expected data length, send and return
  if (
    expectedLength &&
    (dataString.length === expectedLength ||
      dataString.length === expectedLength - 4)
  ) {
    DEBUG && console.log("ESending:", dataString, checkJSON(dataString));
    return wrapper.dispatchEvent("message", dataString);
  }

  // If no local data length use global expected length
  if (!dataLength && expectedLength) {
    dataLength = expectedLength;
  }

  // Else check if has previous message
  if (chunks.length >= 1) {
    // If previous message, check if current message plus previous messsges
    // length matches the expected length
    const completeMessage = chunks.join("") + dataString;
    if (
      completeMessage.length === dataLength ||
      completeMessage.length === dataLength - 4
    ) {
      // Reset chunks array and expected length
      chunks = [];
      // expectedLength = null;

      DEBUG &&
        console.log("Sending:", completeMessage, checkJSON(completeMessage));
      return wrapper.dispatchEvent("message", completeMessage);
    }
  } else {
    // Add the data to the chunks array
    // and set global length to local length
    chunks.push(dataString);
    expectedLength = dataLength;
  }
};

// Main Handlers
export function commandAsWorker(command, args) {
  let backend, wrapper, $prms;
  let providerTarget = new EventTarget();

  let createBackend = async () => {
    backend = await pty.host.run({
      args, type: "process", command,
      // command: await pty.host.getCommandPath(command),
      onmessage: data => {
        let dataString = data.toString();
        DEBUG && console.log("Raw:", dataString);

        // Check if the data contains 'Content-Length'
        if (dataString.includes("Content-Length")) {
          let messages = dataString.split("Content-Length:");

          for (let message of messages) {
            if (!message?.length) continue;
            DEBUG &&
              console.log("\n\nHandling message:", message, expectedLength);

            // Extract the content length
            const contentLengthMatch = ("Content-Length:" + message).match(
              /Content-Length: (\d+)/
            );
            if (contentLengthMatch) {
              message = message.split("\r\n\r\n")[1];
              handleMessage(
                wrapper,
                message,
                parseInt(contentLengthMatch[1], 10)
              );
            } else {
              handleMessage(wrapper, message);
            }
          }
        } else {
          handleMessage(wrapper, dataString);
        }
      }
    });
    backend.addEventListener("open", ev =>
      wrapper.dispatchEvent("open")
    );
    backend.addEventListener("error", ev =>
      wrapper.dispatchEvent("error")
    );
    return backend;
  };

  return (wrapper = {
    state() {
      return backend?.state || WebSocket.CLOSED;
    },

    async initialize() {
      if ($prms) return;
      $prms = createBackend();
      backend = await $prms;
      $prms = null;
    },

    addEventListener: (...args) => providerTarget.addEventListener(...args),
    async postMessage(message) {
      DEBUG && console.log("Posting:", message);
      if (!backend) $prms = createBackend();
      if ($prms) {
        backend = await $prms;
        $prms = null;
      }

      backend.send(addHeaders(JSON.stringify(message), "\r\n\r\n"));
    },
    dispatchEvent: (event, data) => {
      if (event === "message") {
        wrapper.onmessage?.({ data: JSON.parse(data) });
      } else if (event === "open") {
        providerTarget.dispatchEvent(new Event("open"));
      } else if (event === "error") {
        providerTarget.dispatchEvent(new ErrorEvent("error"));
      } else {
        providerTarget.dispatchEvent(new CustomEvent(event, { detail: data }));
      }
    }
  });
}

export function showToast(message) {
  (window.acode?.require("toast") || console.log)(message);
}

export function setupProgressHandler(client) {
  client.connection.onNotification("$/progress", params => {
    client.ctx.dispatchEvent?.("progress", params);
  });

  client.connection.onRequest("window/workDoneProgress/create", params => {
    client.ctx.dispatchEvent?.("create/progress", params);
  });
}

export function getCodeLens(callback) {
  window.require(["ace/ext/code_lens"], callback);
}
