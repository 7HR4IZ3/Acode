import EditorFile from './editorFile';

/**
 * 
 * @param {import('./editorFile').FileOptions[]} files 
 * @param {(count: number)=>void} callback
 */
export default async function restoreFiles(files, create, manager) {
  let rendered = false;

  if (Array.isArray(files[0]?.files)) {
    for (const subFiles of files) {
      if (!subFiles.isMain)
        (manager = await create())
      manager?.switchTo();
      await restoreFiles(subFiles.files, null, manager);
    }
    return;
  }

  await Promise.all(
    files.map(async (file, i) => {
      rendered = file.render;

      if (i === files.length - 1 && !rendered) {
        file.render = true;
      }

      const { filename, render = false } = file;
      const options = {
        ...file, render,
        emitUpdate: false,
      };
      new EditorFile(filename, options, manager);
    })
  );
}