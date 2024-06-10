const langMap = {
  'en-us': {
    name: 'English',
    async strings() {
      return await import('../lang/en-us.json?raw');
    },
  },
  'es-sv': {
    name: 'Español',
    async strings() {
      return await import('../lang/es-sv.json?raw');
    },
  },
  'fr-fr': {
    name: 'Francais',
    async strings() {
      return await import('../lang/fr-fr.json?raw');
    },
  },
  'tl-ph': {
    name: 'Tagalog',
    async strings() {
      return await import('../lang/tl-ph.json?raw');
    },
  },
  'de-de': {
    name: 'Deutsch',
    async strings() {
      return await import('../lang/de-de.json?raw');
    },
  },
  'id-id': {
    name: 'Indonesian',
    async strings() {
      return await import('../lang/id-id.json?raw');
    },
  },
  'uz-uz': {
    name: 'O\'zbekcha',
    async strings() {
      return await import('../lang/uz-uz.json?raw');
    },
  },
  'ru-ru': {
    name: 'Русский',
    async strings() {
      return await import('../lang/ru-ru.json?raw');
    },
  },
  'pl-pl': {
    name: 'Polski',
    async strings() {
      return await import('../lang/pl-pl.json?raw');
    }
  },
  'pt-br': {
    name: 'Português',
    async strings() {
      return await import('../lang/pt-br.json?raw');
    },
  },
  'pu-in': {
    name: 'ਪੰਜਾਬੀ',
    async strings() {
      return await import('../lang/pu-in.json?raw');
    },
  },
  'tr-tr': {
    name: 'Türkçe',
    async strings() {
      return await import('../lang/tr-tr.json?raw');
    },
  },
  'uk-ua': {
    name: 'Українська',
    async strings() {
      return await import('../lang/uk-ua.json?raw');
    },
  },
  'hi-in': {
    name: 'हिंदी',
    async strings() {
      return await import('../lang/hi-in.json?raw');
    },
  },
  'zh-cn': {
    name: '中文简体',
    async strings() {
      return await import('../lang/zh-cn.json?raw');
    },
  },
  'zh-hant': {
    name: '繁體中文',
    async strings() {
      return await import('../lang/zh-hant.json?raw');
    },
  },
  'zh-tw': {
    name: '繁體中文 (台灣)',
    async strings() {
      return await import('../lang/zh-tw.json?raw');
    },
  },
  'ir-fa': {
    name: 'فارسی',
    async strings() {
      return await import('../lang/ir-fa.json?raw');
    },
  },
  'ar-ye': {
    name: 'العربية',
    async strings() {
      return await import('../lang/ar-ye.json?raw');
    },
  },
  'ja-jp': {
    name: '日本語',
    async strings() {
      return await import('../lang/ja-jp.json?raw');
    },
  },
  'bn-bd': {
    name: 'বাংলা',
    async strings() {
      return await import('../lang/bn-bd.json?raw');
    },
  },
  'cs-cz': {
    name: 'Čeština',
    async strings() {
      return await import('../lang/cs-cz.json?raw');
    },
  },
  'vi-vn': {
    name: 'Tiếng Việt',
    async strings() {
      return await import('../lang/vi-vn.json?raw');
    },
  },
  'be-by': {
    name: 'Беларуская',
    async strings() {
      return await import('../lang/be-by.json?raw');
    },
  },
  'hu-hu': {
    name: 'Magyar',
    async strings() {
      return await import('../lang/hu-hu.json?raw');
    },
  },
  'ml-in': {
    name: 'മലയാളം',
    async strings() {
      return await import('../lang/ml-in.json?raw');
    },
  },
  'mm-unicode': {
    name: 'ဗမာစာ(Unicode)',
    async strings() {
      return await import('../lang/mm-unicode.json?raw');
    },
  },
  'mm-zawgyi': {
    name: 'ဗမာစာ(Zawgyi)',
    async strings() {
      return await import('../lang/mm-zawgyi.json?raw');
    },
  },
  'ko-kr': {
    name: '한국어',
    async strings() {
      return await import('../lang/ko-kr.json?raw');
    },
  },
  'it-it': {
    name: 'Italiano',
    async strings() {
      return await import('../lang/it-it.json?raw');
    },
  },
};

export default {
  async set(code) {
    code = code?.toLowerCase();
    const lang = langMap[code] || langMap['en-us'];
    const strings = await lang.strings();
    // window["strings"] = strings;
    window["strings"] = JSON.parse(strings.default);
  },
  list: Object.keys(langMap).map((code) => [code, langMap[code].name]),
  getName(code) {
    code = code?.toLowerCase();
    code = code in langMap ? code : 'en-us';
    return langMap[code].name;
  },
}
