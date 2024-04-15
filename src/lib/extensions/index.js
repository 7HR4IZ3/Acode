
export default async function () {
  try {
    acode.setLoadingMessage("Loading terminal...");
    const terminal = await import("lib/extensions/terminal");
    await terminal.default.initialize();
  } catch (err) {
    console.error(err);
  }

  try {
    acode.setLoadingMessage("Loading language client...");
    const languageclient = await import("lib/extensions/languageclient");
    await languageclient.default.initialize();
  } catch (err) {
    console.error(err);
  }

  try {
    acode.setLoadingMessage("Loading other extensions...");
    const coderunner = await import("lib/extensions/coderunner");
    await coderunner.default.initialize();
  } catch (err) {
    console.error(err);
  }

  try {
    const manager = await import("lib/extensions/workspace");
    await manager.default.initialize();
  } catch (err) {
    console.error(err);
  }

  try {
    const browser = await import("lib/extensions/browser");
    await browser.default.initialize();
  } catch (err) {
    console.error(err);
  }
}
