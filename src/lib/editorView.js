import tile from "components/tile";
import constants from "./constants";
import appSettings from './settings';
import startDrag from 'handlers/editorFileTab';

export const id = Symbol("view.id");
export const name = Symbol("view.name");

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
  #editorManager;

  constructor(name, options, editorManager) {
    this.#name = name;
    this.#editorManager =
      editorManager || window.editorManager;

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

    const { addView, getView } = this.#editorManager;

    // if options are passed
    if (options) {
      // if options doesn't contains id, and provide a new id
      if (!options.id) {
        if (options.uri) this.#id = options.uri.hashCode();
        else this.#id = helpers.uuid();
      } else this.#id = options.id;
    } else if (!options) {
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

  get tab() {
    return this.#tab;
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
    this.#editorManager.addFile(this);
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
      activeView.focusedBefore = activeFile.focused;
      activeView.removeActive();
    }

    switchView(this.id);

    this.tab.classList.add('active');
    this.tab.scrollIntoView();
  }


  remove() {}

  destroy() {
    appSettings.off(
      'update:openFileListPos',
      this.#onFilePosChange
    );
    this.#tab.remove();
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
