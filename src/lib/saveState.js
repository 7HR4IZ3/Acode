import constants from "./constants";
import { addedFolder } from "./openFolder";
import appSettings from "./settings";

export default (returnState = false) => {
  if (!window.editorManager) return;

  const filesToSave = [];
  const folders = [];
  const { value: settings } = appSettings;

  for (const manager of window.EDITOR_MANAGERS) {
    const managerFiles = [];
    const { editor, files, activeFile } = manager;

    files.forEach(file => {
      if (file.id === constants.DEFAULT_FILE_SESSION) return;

      const fileJson = {
        id: file.id,
        uri: file.uri,
        type: file.type,
        filename: file.filename,
        isUnsaved: file.isUnsaved,
        readOnly: file.readOnly,
        SAFMode: file.SAFMode,
        deletedFile: file.deletedFile,
        cursorPos: editor.getCursorPosition(),
        scrollTop: editor.session.getScrollTop(),
        scrollLeft: editor.session.getScrollLeft(),
        editable: file.editable,
        encoding: file.encoding,
        render: activeFile.id === file.id,
        folds: parseFolds(file.session.getAllFolds())
      };

      if (settings.rememberFiles || fileJson.isUnsaved)
        managerFiles.push(fileJson);
    });
    filesToSave.push({
      isMain: manager.isMain,
      files: managerFiles
    });
  }

  if (settings.rememberFolders) {
    addedFolder.forEach(folder => {
      const { url, saveState, title, listState, listFiles } = folder;
      folders.push({
        url,
        opts: {
          saveState,
          name: title,
          listState,
          listFiles
        }
      });
    });
  }

  if (returnState) return { files: filesToSave, folders };

  localStorage.files = JSON.stringify(filesToSave);
  localStorage.folders = JSON.stringify(folders);
};

function parseFolds(folds) {
  return folds.map(fold => {
    const { range, ranges, placeholder } = fold;
    return {
      range,
      placeholder,
      ranges: parseFolds(ranges)
    };
  });
}
