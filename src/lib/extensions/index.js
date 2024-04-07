export default async function () {
  try {
    acode.setLoadingMessage("Loading terminal...");
    let terminal = await import("lib/extensions/terminal");
    await terminal.default.initialize();
  } catch (err) {
    console.error(err);
  }

  try {
    acode.setLoadingMessage("Loading language client...");
    let languageclient = await import("lib/extensions/languageclient");
    await languageclient.default.initialize();
  } catch (err) {
    console.error(err);
  }

  try {
    acode.setLoadingMessage("Loading other extensions...");
    let coderunner = await import("lib/extensions/coderunner");
    await coderunner.default.initialize();
  } catch (err) {
    console.error(err);
  }
}
