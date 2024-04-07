import About from '../pages/about';
import editorSettings from './editorSettings';
import backupRestore from './backupRestore';
import themeSetting from 'pages/themeSetting';
import appSettings from './appSettings';
import formatterSettings from './formatterSettings';
import rateBox from 'dialogs/rateBox';
import Donate from 'pages/donate';
import plugins from 'pages/plugins';
import settingsPage from 'components/settingsPage';
import previewSettings from './previewSettings';
import removeAds from 'lib/removeAds';
import helpers from 'utils/helpers';
import openFile from 'lib/openFile';
import settings from 'lib/settings';
import confirm from 'dialogs/confirm';
import actionStack from 'lib/actionStack';
import filesSettings from './filesSettings';
import scrollSettings from './scrollSettings';
import searchSettings from './searchSettings';

const CUSTOM_SETTINGS = [];

export function addCustomSettings(setting, settingPage) {
  // TODO: Support other language using strings
  if (typeof setting !== "object")
    throw new Error("Invalid object type");

  if (!setting.key)
    throw new Error("Setting key and text required");
  
  const entry = [setting, settingPage];
  CUSTOM_SETTINGS.push(entry);
  return () => (CUSTOM_SETTINGS = CUSTOM_SETTINGS.filter(
    item => item !== entry
  ))
}

export default function mainSettings() {
  const title = strings.settings.capitalize();
  const items = [
    {
      key: 'about',
      text: strings.about,
      icon: 'acode',
      index: 0,
    },
    {
      key: 'donate',
      text: strings.support,
      icon: 'favorite',
      iconColor: 'orangered',
      sake: true,
      index: 1,
    },
    {
      key: 'editor-settings',
      text: strings['editor settings'],
      icon: 'text_format',
      index: 3,
    },
    {
      key: 'app-settings',
      text: strings['app settings'],
      icon: 'tune',
      index: 2,
    },
    {
      key: 'formatter',
      text: strings.formatter,
      icon: 'stars',
    },
    {
      key: 'theme',
      text: strings.theme,
      icon: 'color_lenspalette',
    },
    {
      key: 'backup-restore',
      text: strings.backup.capitalize() + '/' + strings.restore.capitalize(),
      icon: 'cached',
    },
    {
      key: 'rateapp',
      text: strings['rate acode'],
      icon: 'googleplay'
    },
    {
      key: 'plugins',
      text: strings['plugins'],
      icon: 'extension',
    },
    {
      key: 'reset',
      text: strings['restore default settings'],
      icon: 'historyrestore',
      index: 5,
    },
    {
      key: 'preview-settings',
      text: strings['preview settings'],
      icon: 'play_arrow',
      index: 4,
    },
    {
      key: 'editSettings',
      text: `${strings['edit']} settings.json`,
      icon: 'edit',
    },
    {
      key: "other-settings",
      text: strings["extra settings"] || "Extra Settings",
      icon: "settings_applications"
    }
  ];

  if (IS_FREE_VERSION) {
    items.push({
      key: 'removeads',
      text: strings['remove ads'],
      icon: 'cancel',
    });
  }

  /**
   * Callback for settings page for handling click event
   * @this {HTMLElement}
   * @param {string} key 
   */
  async function callback(key) {
    switch (key) {
      case 'theme':
        themeSetting();
        break;

      case 'about':
        About();
        break;

      case 'donate':
        Donate();
        break;

      case 'rateapp':
        rateBox();
        break;

      case 'plugins':
        plugins();
        break;

      case 'formatter':
        formatterSettings();
        break;

      case 'editSettings': {
        actionStack.pop();
        openFile(settings.settingsFile);
        break;
      }

      case 'reset':
        const confirmation = await confirm(strings.warning, strings['restore default settings']);
        if (confirmation) {
          await settings.reset();
          location.reload();
        }
        break;

      case 'removeads':
        try {
          await removeAds();
          this.remove();
        } catch (error) {
          helpers.error(error);
        }
        break;

      default:
        settings.uiSettings[key]?.show();
        break;
    }
  }

  const page = settingsPage(title, items, callback);
  page.show();
  
  settings.uiSettings['main-settings'] = page;
  settings.uiSettings['app-settings'] = appSettings();
  settings.uiSettings['file-settings'] = filesSettings();
  settings.uiSettings['backup-restore'] = backupRestore();
  settings.uiSettings['editor-settings'] = editorSettings();
  settings.uiSettings['scroll-settings'] = scrollSettings();
  settings.uiSettings['search-settings'] = searchSettings();
  settings.uiSettings['preview-settings'] = previewSettings();
  
  settings.uiSettings['other-settings'] = settingsPage(
    strings["extra settings"] || "Extra Settings",
    CUSTOM_SETTINGS.map(entry => entry[0]),
    (key) => {
      const entry = CUSTOM_SETTINGS.find(
        item => item[0].key === key
      );
      if (entry) entry[1]?.show();
    }
  );
}
