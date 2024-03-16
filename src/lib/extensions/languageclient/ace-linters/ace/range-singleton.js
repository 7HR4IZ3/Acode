export class AceRange {
    static _instance;
    static getConstructor(editor) {
        if (!AceRange._instance && editor) {
            AceRange._instance = editor.getSelectionRange().constructor;
        }
        return AceRange._instance;
    }
}
