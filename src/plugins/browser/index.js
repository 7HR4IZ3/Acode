import settings from 'lib/settings';
import themes from 'theme/list';

const SERVICE = 'Browser';

function open(url, isConsole = false) {
  const ACTION = url ? 'open' : 'show';
  const success = () => { };
  const error = () => { };
  const theme = themes.get(settings.value.appTheme).toJSON('hex');
  cordova.exec(
    success, error, SERVICE, ACTION,
    [url || "about:blank", theme, isConsole]
  );
}

function reload() {
  return new Promise((resolve, reject) => {
    cordova.exec(
      resolve, reject,
      SERVICE, 'reload', []
    );
  });
}

export default {
  open, reload
}