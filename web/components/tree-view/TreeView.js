


export const TreeNodeTemplate = document.createElement('template');
TreeNodeTemplate.innerHTML = `
<div id="title" style="white-space:nowrap">
    <tree-toggle-button></tree-toggle-button>
    <slot name="title"></slot>
</div>

<div id="content" style="padding-left: calc(1em + 2px);">
    <slot></slot>
</div>
`;
export const TreeToggleButtonTemplate = document.createElement('template');
TreeToggleButtonTemplate.innerHTML = `
<div style="display: inline-block; width: 1em; height: 1em; text-align: center; border: 1px solid; font-family: monospace; cursor: pointer; user-select: none;" tabindex=0>
    <span id="extend">+</span>
    <span id="collapse">-</span>
</div>
`;


class HTMLTreeViewElement extends HTMLElement {
    constructor() {
        super();

    }

}

class HTMLTreeNodeElement extends HTMLElement {
    #shadowRoot = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#shadowRoot.append(TreeNodeTemplate.content.cloneNode(true));
        (this.#shadowRoot.querySelector('tree-toggle-button') || {}).for = this;
        (this.#shadowRoot.querySelector('tree-toggle-button') || {}).collapsed = this.collapsed;


    }

    connectedCallback() {
        this.querySelectorAll('tree-text,tree-icon').forEach(el => el.setAttribute('slot', 'title'));
        this.#update();

    }

    update() {
        return this.#update.apply(this, arguments);
    }

    #update() {
        this.#collapsed = (this.getAttribute('collapsed') === 'true' || this.getAttribute('collapsed') === 'collapsed' || this.getAttribute('collapsed') === '');
        (this.#shadowRoot.querySelector('tree-toggle-button') || {}).setAttribute('collapsed', String(this.#collapsed));
        (this.#shadowRoot.querySelector('#content') || {}).hidden = this.#collapsed;

    }

    static get observedAttributes() { return ['collapsed']; }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'collapsed':
                this.#update();
                break;

            default: ;
        }
    }

    #collapsed = false;
    get collapsed() { return this.#collapsed; }
    set collapsed(val) {
        this.setAttribute('collapsed', String(val === 'false' ? false : this.#collapsed = !!val));
        this.#update();
        return true;
    }



}

class HTMLTreeToggleButtonElement extends HTMLElement {
    #shadowRoot = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#shadowRoot.append(TreeToggleButtonTemplate.content.cloneNode(true));

        this.addEventListener('click', this.#onclick);
        this.addEventListener('dblclick', this.#ondblclick);
        this.addEventListener('keydown', this.#onkeydown);

        Object.defineProperties(this, { collapsed: { get: this.#get_collapsed, set: this.#set_collapsed, enumerable: true } });

    }

    update() {
        this.#collapsed = (this.getAttribute('collapsed') === 'true' || this.getAttribute('collapsed') === 'collapsed' || this.getAttribute('collapsed') === '');
        (this.#shadowRoot.querySelector('#extend') || {}).hidden = !this.#collapsed;
        (this.#shadowRoot.querySelector('#collapse') || {}).hidden = this.#collapsed;
            
    }

    connectedCallback() {
        this.update();

    }

    static get observedAttributes() { return ['collapsed']; }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'collapsed':
                this.update();
                break;
        
            default: ;
        }
    }

    #collapsed = false;
    #get_collapsed() { return this.#collapsed; }
    #set_collapsed(val) {
        this.setAttribute('collapsed', String(val === 'false' ? false : this.#collapsed = !!val));
        this.update();
        return true;
    }

    #onclick() {
        this.collapsed = !this.collapsed;
        this.for && (this.for.collapsed = this.collapsed);
    }
    #ondblclick() {
        this.collapsed = !this.collapsed;
        this.for && (this.for.collapsed = this.collapsed);
        this.for && (this.for.querySelectorAll('tree-node').forEach(el => el.collapsed = this.collapsed));
        
    }
    #onkeydown(ev) {
        if (ev.key === 'Enter') return this.#onclick();
        
    }


}


customElements.define('tree-view', HTMLTreeViewElement);
customElements.define('tree-node', HTMLTreeNodeElement);
customElements.define('tree-toggle-button', HTMLTreeToggleButtonElement);


{
    const css = document.createElement('style');
    css.innerHTML = `
    tree-view, tree-node {
        display: block;
    }

    `;
    (document.head || document.documentElement).append(css);
}


export { HTMLTreeViewElement, HTMLTreeNodeElement, HTMLTreeToggleButtonElement };
