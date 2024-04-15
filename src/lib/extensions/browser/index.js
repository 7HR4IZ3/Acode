import Page from "components/page";
import Browser from "plugins/browser";
import sideButton from "components/sideButton";

class BrowserManager {
  #page;
  #toggle;

  constructor() {
    this.#page = new Page("Browser");
    this.#toggle = sideButton({
      bottom: true,
      text: "Browser",
      icon: "html5",
      onclick: () => { Browser.open() }
    });
  }

  initialize() {
    this.#toggle.show();
  }
}

export default new BrowserManager();
