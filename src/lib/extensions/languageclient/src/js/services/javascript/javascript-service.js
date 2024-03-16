"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavascriptService = void 0;
const base_service_1 = require("../base-service");
const lib_1 = require("./lib");
const eslint_converters_1 = require("./eslint-converters");
class JavascriptService extends base_service_1.BaseService {
    constructor(mode) {
        super(mode);
        this.$defaultEnv = {
            browser: true,
            amd: true,
            builtin: true,
            node: true,
            jasmine: false,
            mocha: true,
            es6: true,
            jquery: false,
            meteor: false,
        };
        this.$defaultParserOptions = {
            ecmaFeatures: {
                globalReturn: true,
                jsx: true,
                experimentalObjectRestSpread: true,
            },
            allowImportExportEverywhere: true,
            allowAwaitOutsideFunction: true,
            ecmaVersion: 12
        };
        this.$defaultRules = {
            "handle-callback-err": 1,
            "no-debugger": 3,
            "no-undef": 1,
            "no-inner-declarations": [1, "functions"],
            "no-native-reassign": 1,
            "no-new-func": 1,
            "no-new-wrappers": 1,
            "no-cond-assign": [1, "except-parens"],
            "no-dupe-keys": 3,
            "no-eval": 1,
            "no-func-assign": 1,
            "no-extra-semi": 3,
            "no-invalid-regexp": 1,
            "no-irregular-whitespace": 3,
            "no-negated-in-lhs": 1,
            "no-regex-spaces": 3,
            "quote-props": 0,
            "no-unreachable": 1,
            "use-isnan": 2,
            "valid-typeof": 1,
            "no-redeclare": 3,
            "no-with": 1,
            "radix": 3,
            "no-delete-var": 2,
            "no-label-var": 3,
            "no-console": 0,
            "no-shadow-restricted-names": 2,
            "no-new-require": 2
        };
        this.$service = new lib_1.Linter();
    }
    get config() {
        var _a, _b, _c, _d;
        var config = {
            rules: (_a = this.globalOptions.rules) !== null && _a !== void 0 ? _a : this.$defaultRules,
            env: (_b = this.globalOptions.env) !== null && _b !== void 0 ? _b : this.$defaultEnv,
            globals: (_c = this.globalOptions.globals) !== null && _c !== void 0 ? _c : {},
            parserOptions: (_d = this.globalOptions.parserOptions) !== null && _d !== void 0 ? _d : this.$defaultParserOptions
        };
        if (config.parserOptions.ecmaVersion == null)
            config.parserOptions.ecmaVersion = 8;
        if (config.parserOptions.ecmaFeatures == null)
            config.parserOptions.ecmaFeatures = this.$defaultParserOptions.ecmaFeatures;
        if (config.parserOptions.ecmaFeatures.experimentalObjectRestSpread == null)
            config.parserOptions.ecmaFeatures.experimentalObjectRestSpread = true;
        return config;
    }
    async doValidation(document) {
        let value = this.getDocumentValue(document.uri);
        if (!value)
            return [];
        try {
            var messages = this.$service.verify(value, this.config);
        }
        catch (e) {
            console.error(e.stack);
            return [];
        }
        return (0, eslint_converters_1.toDiagnostics)(messages, this.optionsToFilterDiagnostics);
    }
}
exports.JavascriptService = JavascriptService;
//# sourceMappingURL=javascript-service.js.map