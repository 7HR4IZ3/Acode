import './styles.scss';
import settings from 'lib/settings';
import Sidebar from 'components/sidebar';

/**@type {HTMLElement} */
let container;

export default [
  'git',                        // icon
  'git',                            // id
  strings['git'] || "Git",                   // title
  initApp,                            // init function
  false,                              // prepend
  onSelected,                         // onSelected function
];

/**
 * Initialize files app
 * @param {HTMLElement} el 
 */
function initApp(el) {
  container = el;
}

/**
 * On selected handler for files app
 * @param {HTMLElement} el 
 */
function onSelected(el) {}

/**
 * Click handler for files app
 * @param {MouseEvent} e 
 * @returns 
 */
function clickHandler(e) {}
