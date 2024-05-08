import tile from "components/tile";
import helpers from "utils/helpers";
import constants from "./constants";
import appSettings from './settings';
import Sidebar from 'components/sidebar';
import startDrag from 'handlers/editorFileTab';

export const id = Symbol("view.id");
export const name = Symbol("view.name");
export const content = Symbol("view.content");

export default class EditorView {
  /**
   * Associated tile for the file, that is append in the open file list,
   * when clicked make the file active.
   * @type {HTMLElement}
   */
  #tab;
  /**
   * @type {function} event handler
   */
  #onFilePosChange;
    /**
   * Name of the file
   * @type {string}
   */
  #name = constants.DEFAULT_FILE_NAME;
  /**
   * Unique ID of the file, changed when file is renamed or location/uri is changed.
   * @type {string}
   */
  #id = constants.DEFAULT_FILE_SESSION;

  #content;
  #options;
  #editorManager;

  focused = false;
  focusedBefore = false;

  constructor(name, options, editorManager) {
    this.#name = name;
    this.#options = (options || {});
    this.#editorManager =
      editorManager || window.editorManager;
    this.#content = options?.content || (
      <div className="view-content"></div>
    )

    this.#tab = tile({
      text: name,
      tail: tag('span', {
        className: 'icon cancel',
        dataset: {
          action: 'close-file'
        },
      }),
    });
    this.#tab.addEventListener(
      'click', tabOnclick.bind(this)
    );
    this.tab.lead(
      <span
        className={options?.icon || "file file_type_default"}
        style={{ paddingRight: '5px' }}
      ></span>
    );

    const { addView, getView } = this.#editorManager;

    // if options are passed
    if (options) {
      // if options doesn't contains id, and provide a new id
      if (!options.id) {
        if (options.uri) this.#id = options.uri.hashCode();
        else this.#id = helpers.uuid();
      } else this.#id = options.id;
    }

    if (!this.#id) {
      // if options aren't passed, that means default file is being created
      this.#id = constants.DEFAULT_FILE_SESSION;
    }

    if (this.#id) {
      const view = getView(this.id, 'id');
      if (view) {
        view.makeActive();
        return view;
      }
    }

    this.#editorManager.addView(this);
    this.#editorManager.emit('new-view', this);

    this.#onFilePosChange = () => {
      const { openFileListPos } = appSettings.value;
      if (
        openFileListPos === appSettings.OPEN_FILE_LIST_POS_HEADER ||
        openFileListPos === appSettings.OPEN_FILE_LIST_POS_BOTTOM
      ) {
        this.tab.oncontextmenu = startDrag;
      } else {
        this.tab.oncontextmenu = null;
      }
    };
    this.#onFilePosChange();

    appSettings.on('update:openFileListPos', this.#onFilePosChange);
  }
  
  get [name]() {
    return this.#name;
  }
  
  set [name](value) {
    this.#name = value;
  }
  
  get info() {
    return this.#options.info;
  }
  
  set info(value) {
    this.#options.info = value;
    if (this.#editorManager.activeView === this) {
      this.#editorManager.header.subText = value || "";
    }
  }

  get tab() {
    return this.#tab;
  }

  get content() {
    return this.#content;
  }

  get [content]() {
    return this.#content;
  }

  set [content](element) {
    if (!element) return;
    if (!element instanceof Element)
      throw new Error("EditorView content must be a Node");

    if (this.#content !== element) {
      this.#content.replaceWith(element);
    }
    this.#content = element;
  }

  /**
   * File unique id.
  */
  get id() {
    return this.#id;
  }

  /**
  * File unique id.
  * @param {string} value
  */
  set id(value) {
    this.onSetId?.(value);
    this[id] = value;
  }

  set [id](value) {
    this.#id = value;
  }

  /**
   * DON'T remove, plugin need this property to get filename.
   */
  get name() {
    return this.#name;
  }

  set name(name) {
    this.#name = name;
    if (this.#editorManager.activeView === this) {
      this.#editorManager.header.text = this.name;
    }
  }
  
  get editorManager() {
    return this.#editorManager;
  }

  set editorManager(manager) {
    if (this.#editorManager === manager) return;

    if (this.#editorManager.activeFile === this) {
      this.#editorManager.files.at(-1)?.makeActive();
    }

    this.tab.remove();
    this.#editorManager.files = this.#editorManager.files.filter(
      item => item !== this
    )

    this.#editorManager = manager;
    this.#editorManager.addView(this);
    this.#editorManager.openFileList.append(this.tab);
    this.makeActive();
  }

  /**
   * Makes this file active
  */
  makeActive() {
    const { activeView, switchView } = this.#editorManager;

    if (activeView) {
      if (activeView.id === this.id) return;
      activeView.focusedBefore = activeView.focused;
      activeView.remove();
    }

    switchView(this.id);

    this.#editorManager.activeFile?.tab
      .classList.remove("active");
    this.#editorManager.activeFile = this;

    this.#editorManager.header.text = this.name;
    this.#editorManager.header.subText = this.info || "";

    this.#tab.classList.add('active');
    this.#tab.scrollIntoView();
  }

  remove() {
    this.editorManager.views = this.editorManager.views.filter(
      (view) => view.id !== this.id
    );
    const { views, activeFile } = this.editorManager;
    if (activeFile.id === this.id) {
      this.editorManager.activeFile = null;
    }
    this.destroy();

    if (!views.length) {
      Sidebar.hide();
      this.editorManager.activeFile = null;
      if (this.editorManager.isMain) {
        acode.newEditorFile();
      } else {
        this.editorManager.onupdate('remove-view');
        this.editorManager.emit('remove-view', this);
        this.editorManager.destroy();
        return true;
      }
    } else {
      views[views.length - 1].makeActive();
    }

    this.editorManager.onupdate('remove-view');
    this.editorManager.emit('remove-view', this);
    return false;
  }

  destroy() {
    appSettings.off(
      'update:openFileListPos',
      this.#onFilePosChange
    );
    // this.content?.remove();
    this.#tab?.remove();
    this.#tab = null;
  }
}

/**
 * 
 * @param {MouseEvent} e 
 * @returns 
 */
function tabOnclick(e) {
  e.preventDefault();
  const { action } = e.target.dataset;
  if (action === 'close-file') {
    this.remove();
    return;
  }
  this.makeActive();
}
