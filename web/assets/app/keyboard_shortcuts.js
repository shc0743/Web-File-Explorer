export const NoPrevent = Symbol('NoPrevent');
export default {
    'Ctrl+Shift+P'() { this.commandPanel?.toggle() },
    'Ctrl+K'() { this.appInstance_.instance.transferPanel_isOpen = !this.appInstance_.instance.transferPanel_isOpen },
    'Ctrl+N'() { this.appInstance_.newFileOp('file') },
    'Ctrl+Shift+N'() { this.appInstance_.newFileOp('dir') },
    'Alt+Enter'() { this.appInstance_.showPropertiesDialog?.() },
    'Ctrl+Shift+C'() { this.appInstance_.cfl?.() },
    'Ctrl+,'() { this.location.hash = '#/settings/' },
    'Ctrl+Shift+I'() { this.appInstance_.con?.open() },
    'F2'() { this.appInstance_.renameItem() },
    'F5'() {
        if (!this.location.hash.startsWith('#/s/')) return NoPrevent;
        this.dispatchEvent(new HashChangeEvent('hashchange'));
    },
    'Delete': p_Delete, 'Shift+Delete': p_Delete,
    'Alt'() {
        this.appInstance_.instance
        .$refs.headerBar
        .$refs.mainMenuBar
        .$refs.menubar
        .querySelector('button')?.focus()
    },
    'Alt+ArrowUp'() { globalThis.appInstance_.HeaderBar?.pathUp() },
    
};

function p_Delete(ev) {
    const test = v => (v instanceof HTMLInputElement || v instanceof HTMLTextAreaElement || v.contentEditable === 'true') ? NoPrevent : 0;
    let _St = ev.target;
    while (_St) {
        if (test(_St) === NoPrevent) return NoPrevent;
        _St = _St.parentElement;
    }
    this.appInstance_.explorer?.deleteSelected(ev);
}
