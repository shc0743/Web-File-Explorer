
import { addCSS, registerResizableWidget } from './BindMove.js';

export const ConRoot_Template = document.createElement('template');
ConRoot_Template.innerHTML = `
<resizable-widget style="left: 20px; top: 20px; width: 60%; height: 60%; --padding: 0;">
    <widget-caption slot="widget-caption">
        <span>JavaScript Console</span>
        <button class=jscon-btn data-id=CLOSE style="float:right">x</button>
    </widget-caption>
    <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        <div class="jscon-tabbtn-container" data-id="TABS">
            <button class="jscon-btn jscon-tabbtn" data-id="Console" data-is-current>Console</button><!--
            --><button class="jscon-btn jscon-tabbtn" data-id="Source">Source</button>
        </div>

        <div class="panels" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
            <div data-panel="Console" class="console-panel">
                <div class="console-btns">
                    <button class="jscon-btn" data-id="ClearConsole">Clear</button>
                    <span class=split></span>
                    <label><input type=checkbox data-id="AllowPaste">&nbsp;Allow paste</label>
                    <span class=split></span>
                    <input placeholder="Filter..." disabled style="flex:1" data-id="ConsoleFilter" />
                </div>
                <div class="console-content">
                    <div class="console-messages">
                    
                    </div>
                    <div class="console-input">
                        <textarea data-id="cons" rows=1></textarea>
                    </div>
                </div>
            </div>

            <div data-panel="Source" hidden>
                Source
            </div>
        </div>
    </div>
</resizable-widget>

<dialog data-id="allowPasteConfirm">
    <div>Are you sure you want to allow paste?</div>
    <form method=dialog>
        <button type=submit data-id="doAllowPaste">Yes</button>
        <button type=submit autofocus>No</button>
    </form>
</dialog>
`;
addCSS(`
$$$ {
    z-index: 1073741823;
    --background: #FFFFFF; /* 以后再适配夜间模式，现在能用要紧 */
}
$$$ [hidden] {
    display: none!important;
}
$$$ ::selection {
    background-color: rgb(141 199 248 / 60%);
}
$$$ .jscon-btn {
    border: 0; background: var(--background, inherit);
    transition: .1s;
}
$$$ .jscon-btn:hover {
    --background: var(--color-scheme-background-hover, #dee1e6);
}
$$$ .jscon-tabbtn-container {
    --background: var(--color-scheme-background, #f1f3f4);
    background: var(--background);
}
$$$ .jscon-tabbtn {
    --background: var(--color-scheme-background, #f1f3f4);
    padding: 5px; margin: 0;
    border-bottom: 2px solid var(--background);
}
.jscon-tabbtn+.jscon-tabbtn {
    margin-left: 5px;
}
$$$ .jscon-tabbtn[data-is-current] {
    border-bottom: 2px solid #1a73e8;
}
$$$ .console-panel {
    display: flex; flex-direction: column; 
    flex: 1; overflow: hidden;
}
$$$ .console-btns {
    display: flex;
    border-bottom: 1px solid;
    padding: 5px;
}
$$$ .console-btns button {
    padding: 0;
}
$$$ .console-btns .split {
    border-right: 1px solid;
    display: inline-block;
    width: 1px;
    margin: 0 5px;
}
$$$ .console-messages {
    flex: 1;
    cursor: default;
}
$$$ .console-messages > .row {
    font-family: consolas, lucida console, courier new, monospace;
    border-bottom: 1px solid #f0f0f0;
    padding: 2px 5px;
    font-size: small;
    white-space: normal; word-break: break-all;
}
$$$ .console-content {
    padding: 10px;
    padding-top: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
}
$$$ .console-input {
    display: flex;
    margin-top: 5px;
}
$$$ .console-input::before {
    content: ">";
    font-family: monospace;
    display: inline-block;
    width: 1em; height: 1em;
    color: #367cf1;
}
$$$ .console-input textarea {
    border: none;
    outline: none;
    flex: 1;
    resize: none;
    font-family: consolas, lucida console, courier new, monospace;
}
$$$ .is-symbol { color: #c80000 }
$$$ .is-number, $$$ .is-boolean { color: #1a1aa6 }
$$$ .is-null, $$$ .is-undefined { color: #80868b }
$$$ .is-object, $$$ .is-function { font-style: italic }
$$$ .row[data-type=error] {
    background-color: #fff0f0;
    color: red;
}
$$$ .row[data-type=warn] {
    background-color: #fffbe6;
    color: #5c3c00;
}
`.replaceAll('$$$', 'jscon-console-root'));


export function register() {
    registerResizableWidget();
}


export class JsCon {
    #el = null;
    #widget = null;
    #consel = null;
    #history = new Array();

    constructor() {
        this.#el = document.createElement('jscon-console-root');
        this.#el.append(ConRoot_Template.content.cloneNode(true));
        this.#widget = this.#el.firstElementChild;
        customElements.whenDefined('resizable-widget').then(() => {
            addCSS('#container{overflow:hidden}', this.#widget.shadowRoot);
        });
        this.#consel = this.#el.querySelector('.console-messages');
        (document.body || document.documentElement).append(this.#el);

        this.#registerEventHandlers();
    }

    #registerEventHandlers() {
        this.#widget.addEventListener('beforeclose', function (ev) {
            
        });
        const closebtn = this.#widget.querySelector('[data-id=CLOSE]');
        closebtn.addEventListener('pointerdown', () => this.close(), true);
        closebtn.addEventListener('click', () => this.close(), true);
        const tabs = this.#widget.querySelector('[data-id=TABS]');
        tabs.addEventListener('click', ev => {
            if (ev.target?.tagName?.toLowerCase() !== 'button') return;
            tabs.querySelectorAll('.jscon-tabbtn[data-is-current]').forEach(el => el.removeAttribute('data-is-current'));
            ev.target.setAttribute('data-is-current', '');
            this.#el.querySelectorAll('.panels > *').forEach(el => el.hidden = true);
            (this.#el.querySelector(`.panels > [data-panel="${ev.target.dataset.id}"]`) || {}).hidden = false;
        });
        const cons = this.#widget.querySelector('[data-id=cons]');
        cons.addEventListener('keydown', ev => {
            if (ev.key === 'Enter') {
                if (ev.shiftKey) {
                    cons.rows = +cons.rows + 1;
                } else {
                    ev.preventDefault();
                    queueMicrotask(() => this.#consoleRun(cons));
                }
            }
        });
        const antipaste = ev => {
            if (!this.#allowPaste) ev.preventDefault();
        };
        cons.addEventListener('paste', antipaste);
        cons.addEventListener('drop', antipaste);
        const ap = this.#widget.querySelector('[data-id=AllowPaste]');
        const pc = this.#el.querySelector('[data-id=allowPasteConfirm]');
        const pcok = this.#el.querySelector('[data-id=doAllowPaste]');
        ap.addEventListener('input', ev => {
            ev.preventDefault();
            ap.checked = false;
            pc.showModal();
        });
        pcok.addEventListener('click', ev => {
            ap.disabled = true;
            ap.checked = true;
            this.#allowPaste = true;
        });
    }

    #allowPaste = false;

    #consoleAddRow(content, type = 'log') {
        const el = document.createElement('div');
        el.classList.add('row');
        const nodes = [];
        for (let i = 0; i < content.length; ++i) try {
            const item = content[i];
            const type = typeof item;
            const node = document.createElement('span');
            switch (type) {
                case 'string':
                    node.classList.add('is-string');
                    node.innerText = item;
                    break;
                
                case 'number':
                case 'symbol':
                case 'boolean':
                case 'function':
                case 'undefined':
                    node.classList.add('is-' + type);
                    node.innerText = String(item);
                    break;
                
                case 'object':
                    if (item === null) {
                        node.classList.add('is-null');
                        node.innerText = item;
                    } else {
                        node.classList.add('is-object');
                        node.innerText = String(item);
                    }
                    break;
            
                default:
                    node.innerText = String(item);
            }
            nodes.push(node);
            nodes.push(' ');
        } catch (error) {
            const node = document.createElement('span');

            node.style.color = 'red';
            try { node.innerText = `[Error writing console: ${error}]`; }
            catch { node.innerText = '[Error writing console: Unknown Error]' }
            
            nodes.push(node);
            nodes.push(' ');
        }
        nodes.pop();
        for (const i of nodes) el.append(i);
        el.dataset.type = type;
        this.#consel.append(el);

        const cons = this.#widget.querySelector('[data-id=cons]');
        cons.rows = 1;
        const ipt = this.#widget.querySelector('.console-content');
        ipt.scrollTop = ipt.offsetHeight + ipt.scrollHeight;
    }

    forbiddenConsoleAPIs = ['close', 'eval', ];

    #consoleRun(el) {
        const code = el.value;
        if (!code) return false;
        el.value = '';

        this.log('>', code);
        this.#history.push(code);
        const thisArg = this;
        const windowProxy = new Proxy({}, {
            get(target, p, receiver) {
                if (thisArg.forbiddenConsoleAPIs.includes(p)) throw new DOMException('SecurityError');
                return Reflect.get(globalThis, p, receiver);
            },
            set(target, p, newValue, receiver) {
                if (thisArg.forbiddenConsoleAPIs.includes(p)) throw new DOMException('SecurityError');
                return Reflect.set(globalThis, p, newValue, receiver);
            },
            has(target, p) {
                if (thisArg.forbiddenConsoleAPIs.includes(p)) throw new DOMException('SecurityError');
                return Reflect.has(globalThis, p);
            },
        });
        try {
            const fn = new (Function)('window', 'globalThis', 'Function', 'safeContext', 'code', `return eval(code)`);
            const obj = {};
            const ret = fn.call(Object.create(null), windowProxy, windowProxy, Function, obj, code);
            this.log('<', ret);
        }
        catch (error) {
            this.error(error);
        }
    }

    open() {
        this.#widget.open = true;
        const ipt = this.#widget.querySelector('.console-content');
        ipt.scrollTop = ipt.offsetHeight + ipt.scrollHeight;
        ipt.querySelector('[data-id=cons]')?.focus();
    }
    close() {
        this.#widget.close();
    }

    static get managedConAPIs() {
        return ['log', 'dir', 'debug', 'error', 'warn', 'info', 'assert'];
    }

    #consoleOrigin = null;
    #consoleThis = null;
    registerConsoleAPI(console) {
        if (!console) throw new TypeError('Invalid paramater');
        if (this.#consoleOrigin) throw new Error('Console API already registered');
        this.#consoleOrigin = {};
        this.#consoleThis = console;
        for (const i of JsCon.managedConAPIs) {
            this.#consoleOrigin[i] = console[i];
            console[i] = this[i].bind(this);
        }
        return true;
    }
    unregisterConsoleAPI(console) {
        if (!console) throw new TypeError('Invalid paramater');
        for (const i in this.#consoleOrigin) { console[i] = this.#consoleOrigin[i] };
        this.#consoleOrigin = null;
        return true;
    }

    log() {
        this.#consoleAddRow(arguments, 'log');
        return this.#consoleOrigin.log.apply(this.#consoleThis, arguments);
    }
    dir() {
        this.#consoleAddRow(arguments, 'dir');
        return this.#consoleOrigin.dir.apply(this.#consoleThis, arguments);
    }
    debug() {
        this.#consoleAddRow(arguments, 'debug');
        return this.#consoleOrigin.debug.apply(this.#consoleThis, arguments);
    }
    error() {
        this.#consoleAddRow(arguments, 'error');
        return this.#consoleOrigin.error.apply(this.#consoleThis, arguments);
    }
    warn() {
        this.#consoleAddRow(arguments, 'warn');
        return this.#consoleOrigin.warn.apply(this.#consoleThis, arguments);
    }
    info() {
        this.#consoleAddRow(arguments, 'info');
        return this.#consoleOrigin.info.apply(this.#consoleThis, arguments);
    }
    assert() {
        if (!arguments[0]) this.#consoleAddRow(arguments, 'assertError');
        return this.#consoleOrigin.assert.apply(this.#consoleThis, arguments);
    }

};

