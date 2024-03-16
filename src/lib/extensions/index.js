export default async function () {
  try {
    let terminal = await import("lib/extensions/terminal");
    await terminal.default.initialize();
  } catch (err) {
    console.error(err);
  }

  try {
    let languageclient = await import("lib/extensions/languageclient");
    await languageclient.default.initialize();
  } catch (err) {
    console.error(err);
  }

  try {
    let coderunner = await import("lib/extensions/coderunner");
    await coderunner.default.initialize();
  } catch (err) {
    console.error(err);
  }
}
