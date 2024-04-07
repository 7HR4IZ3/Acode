import SidebarApp from "./sidebarApp";

const SIDEBAR_APPS_LAST_SECTION = "sidebarAppsLastSection";
const RIGHT_SIDEBAR_APPS_LAST_SECTION = "rightSidebarAppsLastSection";

export function createSidebarManager(SIDEBAR_ID) {
  /**@type {HTMLElement} */
  let $apps;
  /**@type {HTMLElement} */
  let $sidebar;
  /**@type {string} */
  let currentSection = localStorage.getItem(SIDEBAR_ID);
  /**@type {SidebarApp[]} */
  const apps = [];

  /**
   * @param {string} icon icon of the app
   * @param {string} id id of the app
   * @param {HTMLElement} el element to show in sidebar
   * @param {string} title title of the app
   * @param {(container:HTMLElement)=>void} initFunction
   * @param {boolean} prepend weather to show this app at the top of the sidebar or not
   * @param {(container:HTMLElement)=>void} onSelected
   * @returns {void}
   */
  function add(
    icon,
    id,
    title,
    initFunction,
    prepend = false,
    onSelected = () => {}
  ) {
    currentSection ??= id;

    const active = currentSection === id;
    const app = new SidebarApp(
      $sidebar,
      icon,
      id,
      title,
      initFunction,
      onSelected
    );

    app.active = active;
    prepend ? $apps.prepend(app.icon) : $apps.append(app.icon);
    apps.push(app);
  }

  /**
   * Removes a sidebar app with the given ID.
   * @param {string} id - The ID of the sidebar app to remove.
   * @returns {void}
   */
  function remove(id) {
    const app = apps.find(app => app.id === id);
    if (!app) return;
    app.remove();
    apps.splice(apps.indexOf(app), 1);
    if (app.active) {
      const firstApp = apps[0];
      firstApp.active = true;
    }
  }

  /**
   * Initialize sidebar apps
   * @param {HTMLElement} $el
   */
  function init($el) {
    $sidebar = $el;
    $apps = $sidebar.get(".apps");
    $apps.addEventListener("click", onclick);
  }

  /**
   * Gets the container of the app with the given ID.
   * @param {string} id
   * @returns
   */
  function get(id) {
    const app = apps.find(app => app.id === id);
    return app?.container;
  }

  /**
   * Handles click on sidebar apps
   * @param {MouseEvent} e
   */
  function onclick(e) {
    const target = e.target;
    const { action, id } = target.dataset;

    if (action !== "sidebar-app") return;

    localStorage.setItem(SIDEBAR_ID, id);
    const activeApp = apps.find(app => app.active);
    const app = apps.find(app => app.id === id);
    activeApp && (activeApp.active = false);
    app.active = true;
  }

  return {
    init,
    add,
    get,
    remove
  };
}

export const sidebarApps = createSidebarManager(SIDEBAR_APPS_LAST_SECTION);
export const rightSidebarApps = createSidebarManager(
  RIGHT_SIDEBAR_APPS_LAST_SECTION
);

/**
 * Loads all sidebar apps.
 */
export async function loadApps() {
  sidebarApps.add(...(await import("./files")).default);
  sidebarApps.add(...(await import("./searchInFiles")).default);
  sidebarApps.add(...(await import("./extensions")).default);
  sidebarApps.add(...(await import("./git")).default);
}

export default sidebarApps;
