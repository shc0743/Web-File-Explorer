// CommandPanel
import { LoadCSS } from "@/assets/js/ResourceLoader.js";


const cpTemplate = document.createElement('template');
cpTemplate.innerHTML = `
<div class="cp-editor" autofocus contenteditable />
`;


export class CommandPanel {

    #wrapper = null;
    #el = null;

    constructor() {
        this.#wrapper = document.createElement('dialog');
        this.#wrapper.classList.add('cp');
        this.#wrapper.classList.add('cp-wrapper');
        (document.body || document.documentElement).append(this.#wrapper);

        this.#el = document.createElement('div');
        this.#el.classList.add('cp');
        this.#el.classList.add('CommandPanel');
        this.#el.append(cpTemplate.content.cloneNode(true));
        this.#wrapper.append(this.#el);

        this.#el.querySelector('.cp-editor')?.addEventListener('blur', this.#onblur.bind(this));
        this.#el.querySelector('.cp-editor')?.addEventListener('keydown', this.#onkeydown.bind(this));
        this.#el.querySelector('.cp-editor')?.addEventListener('paste', this.#cleanPaste.bind(this));
        this.#el.querySelector('.cp-editor')?.addEventListener('input', this.#oninput.bind(this));
    }
        
    open() {
        this.#wrapper.showModal();
        this.#el.querySelector('.cp-editor').innerText = '';
    }

    close() {
        this.#wrapper.close();
        
    }

    #onblur() {
        this.close();
    }
    #onkeydown(ev) {
        if (ev.key === 'Escape') return this.close();
        if (ev.key === 'Enter') {
            ev.preventDefault();

            return;
        }

    }
    #oninput() {
        const editor = this.#el.querySelector('.cp-editor');
        console.assert(editor);
        if (editor.innerText.includes('\n')) editor.innerText = editor.innerText.replaceAll('\n', '');
    }
    #cleanPaste(event) {
        event.preventDefault();
        let paste = event.clipboardData.getData('text');

        // filter
        paste = paste.replaceAll('\r', '').replaceAll('\n', '');

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return false;
        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(document.createTextNode(paste));
    }

};



LoadCSS(`
.cp.cp-wrapper {
    border: 0; padding: 0;
    width: 0; height: 0;
}
.cp.CommandPanel {
    position: fixed;
    top: 10px;
    left: 0; right: 0;
    margin: 0 auto;
    padding: 10px;
    width: 50%;
    border: 1px solid var(--border-color, #cccccc);
    border-radius: 4px;
    background: var(--color-scheme-background, var(--background));
    box-shadow: #cccccc 0px 0px 4px 2px;

    --color: black;
}
.cp.CommandPanel .cp-editor {
    box-sizing: border-box;
    font-family: Consolas, monospace;
    width: 100%;
    border: 1px solid var(--color);
    padding: 5px;
    white-space: pre;
    overflow: hidden;
    border-radius: 4px;
    outline: 0;
}
`);


