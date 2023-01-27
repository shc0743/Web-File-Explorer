/*
The MIT License (MIT)
Copyright © 2023 shc0743

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// VList v3


{
    const globStyle = document.createElement('style');
    globStyle.textContent = `
v-list-view {
--background: #ffffff;
--v-list-row-color: #000000;
--v-list-row-bg: #ffffff;
--v-list-row-outline: none;
--v-list-row-hover-color: #000000;
--v-list-row-hover-bg: #e5f3ff;
--v-list-row-hover-outline: none;
--v-list-row-pf-color: #000000;
--v-list-row-pf-bg: #ffffff;
--v-list-row-pf-outline: 1px solid #99d1ff;
--v-list-row-focus-color: #000000;
--v-list-row-focus-bg: #cce8ff;
--v-list-row-focus-outline: 1px solid #99d1ff;
--v-list-row-dragging-color: rgba(0, 0, 0, 0.5);
--padding: 5px;
}
v-list-view {
display: block;
box-sizing: border-box;
overflow: auto;
background: var(--background);
}
v-list-view:focus {
outline: none;
}
`;
    (document.head || document.documentElement).append(globStyle);
}

const rowMarginBottom = 6;
const vListStyle = document.createElement('style');
vListStyle.textContent = `
#container {
    padding: var(--padding);
    box-sizing: content-box;
    position: relative;
}
#header {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: var(--padding);
    border-bottom: 1px solid #ccc;
    background: var(--background);
}
#header.empty {
    padding: 0;
    border: none;
}
#header, v-list-row {
    user-select: none;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
v-list-row {
    position: relative;
    top: var(--offset);
    display: block;
    margin-bottom: ${rowMarginBottom}px;
    --padding: 5px;
    padding: var(--padding);
    border-radius: 2px;
    cursor: default;
    box-sizing: border-box;
    box-sizing: content-box;
    color: var(--v-list-row-color);
    background: var(--v-list-row-bg);
    outline: var(--v-list-row-outline);
}
v-list-row:nth-last-child(1) {
    margin-bottom: 0;
}
v-list-row.pfocus {
    color: var(--v-list-row-pf-color);
    background: var(--v-list-row-pf-bg);
    outline: var(--v-list-row-pf-outline);
}
v-list-row:hover {
    color: var(--v-list-row-hover-color);
    background: var(--v-list-row-hover-bg);
    outline: var(--v-list-row-hover-outline);
}
v-list-row.checked, v-list-row.dragging, v-list-row.dropping {
    color: var(--v-list-row-focus-color);
    background: var(--v-list-row-focus-bg);
}
v-list-row.checked, v-list-row.dragging {
    outline: var(--v-list-row-focus-outline);
}
v-list-row.dragging, v-list-row.dropping {
    color: var(--v-list-row-dragging-color);
}
`;


class HTMLVirtualListElement extends HTMLElement {
    #shadowRoot = null;
    #divContainer = null;
    #header = null;
    #data = null;
    #el = new Map();
    #selection = new Map();
    #height = 0;
    #line_height = 0;
    #mutationObserver = null;
    #resizeObserver = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'open' });
        this.#header = document.createElement('header');
        this.#header.id = 'header';
        {
            let slot1 = document.createElement('slot');
            slot1.name = 'header';
            this.#header.append(slot1);
        }
        this.#shadowRoot.append(this.#header);
        this.#divContainer = document.createElement('div');
        this.#divContainer.id = 'container';
        this.#shadowRoot.append(this.#divContainer);
        this.#shadowRoot.append(vListStyle.cloneNode(true));
        if (!this.#divContainer) throw new Error(`Error in constructor: Failed to find divContainer`);
        this.#resizeObserver = new ResizeObserver(() => {
            globalThis.requestAnimationFrame(() => this.updateOnScroll());
        });
        this.#mutationObserver = new MutationObserver(this.#mutationFn.bind(this));

        this.#registerEventHandlers();

        this.#selection._delete = this.#selection.delete;
        this.#selection.add = this.#addSelection.bind(this);
        this.#selection.delete = this.#deleteSelection.bind(this);
        this.#selection.toArray = function () {
            const r = [];
            for (const i of this) r.push(i[0]);
            return r;
        };


    }

    on(ev, fn, opt = {}, target = null) {
        (target || this).addEventListener(ev, fn.bind(target || this), opt);
    }

    #registerEventHandlers() {
        this.on('contextmenu', this.#oncontextmenu);
        this.on('focus', this.#onfocus);
        this.on('keydown', this.#onkeydown, { capture: true });
        this.on('scroll', this.#onscroll, { passive: true });
        this.on('click', this.#onclick);
        this.on('dblclick', this.#ondblclick, { capture: true });
        this.on('dragstart', this.#ondragstart);
        this.on('dragend', this.#ondragend);
        this.on('dragenter', this.#ondragenter);
        this.on('dragover', this.#ondragover);
        this.on('dragleave', this.#ondragleave);
        this.on('drop', this.#ondrop);
        this.on('dragend', this.#handleDragEndAndDrop);
        this.on('drop', this.#handleDragEndAndDrop);

    }


// data start
    #dataFunc = null;
    get data() {
        return this.#dataFunc || function () { return [] };
    }
    set data(value) {
        if (!(value.call)) throw new TypeError('Unable to call data function');
        this.#dataFunc = value;
        globalThis.queueMicrotask(() => this.update());
        return true;
    }
    get $data() {
        return this.#data || this.data;
    }
// data end


// custom elements lifecycle start
    connectedCallback() {
        this.tabIndex = 0;

        this.role = 'tree';
        this.ariaMultiSelectable = true;

        this.#mutationObserver?.observe(this, {
            attributes: true,
            subtree: true,
            childList: true,
        });
        this.#resizeObserver?.observe(this);

        this.#mutationFn();

    }

    disconnectedCallback() {
        this.tabIndex = 0;

        this.#mutationObserver?.disconnect();
        this.#resizeObserver?.unobserve(this);

    }


    #mutationFn() {
        this.#header.classList[(this.querySelector('[slot="header"]') ? 'remove' : 'add')]('empty');

    }
// custom elements lifecycle end


// common event handlers start
    #oncontextmenu(ev) {
        ev.preventDefault();


    }

    #onfocus(ev) {
        if (!this.#divContainer.querySelector('.checked')) {
            this.#setPfocus();
            return;
        }
    }

    #onkeydown(ev) {
        if (ev.key === 'Tab') return;

        if (ev.key === ' ') {
            ev.preventDefault();
            const el = this.#divContainer.querySelector('v-list-row.pfocus');
            if (el) {
                el.classList.remove('pfocus');
                this.selection = +el.dataset.n;
            }
            return;
        }
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
            ev.preventDefault();
            let el = this.#divContainer.querySelector('v-list-row.current');
            if (!el) el = this.#divContainer.querySelector('v-list-row.checked,v-list-row.pfocus');
            if (!el) el = this.#divContainer.querySelector('v-list-row');
            if (!el) return;
            let elTarget = (ev.key === 'ArrowUp') ? el.previousElementSibling : el.nextElementSibling;
            if (!elTarget) {
                this.scrollBy(0, (this.#line_height + rowMarginBottom) * ((ev.key === 'ArrowUp') ? -1 : 1));
                return;
            }

            if (ev.ctrlKey) {

            }
            else if (ev.shiftKey) {

            }
            else {
                this.selection = elTarget.dataset.n;
            }
            return;
        }
        if (ev.key === 'Enter' && this.selection.size) {
            ev.preventDefault();
            this.dispatchEvent(new CustomEvent('open', { target: this }));
            return;
        }
        if (ev.key === 'Escape') {
            ev.preventDefault();
            this.selection = null;
            return;
        }
        if ((ev.key === 'a' || ev.key === 'A') && ev.ctrlKey) {
            ev.preventDefault();
            this.selection = 'all';
            return;
        }
        // console.log(ev.key);
    }

    #onscroll() {
        globalThis.requestAnimationFrame(() => this.updateOnScroll());
    }

    #onclick(ev) {
        // handle selection
        do {
            const path = ev.composedPath();
            if (!path.length) break;
            const last = path[0];
            if (last !== this && last !== this.#divContainer) break;
            // clear selection
            this.selection = null;
            return;
        } while (0);


        // handle selection
        const path = ev.composedPath();
        for (const i of path) {
            if (i?.tagName?.toLowerCase() === 'v-list-row') {
                if (ev.ctrlKey || ev.shiftKey) {
                    if (ev.ctrlKey) {
                        this.selection.add(i.dataset.n);
                    }
                    // TODO: handle shift-key item selection
                    return;
                }
                this.selection = i.dataset.n;
                break;
            }
        }
    }

    #ondblclick(ev) {
        const path = ev.composedPath();

        for (const i of path) {
            if (i?.tagName?.toLowerCase() === 'v-list-row') {
                this.dispatchEvent(new CustomEvent('open', { target: i }));
                break;
            }
        }
    }
// common event handlers end


// drag&drop event handlers start
    get allowDrag() { return (this.getAttribute('allow-drag') != null) }
    set allowDrag(val) {
        val ?
            this.setAttribute('allow-drag', '') :
            this.removeAttribute('allow-drag');
        return true;
    }

    customDragData = function (i) {
        return ['application/x-vlist-item-drag', JSON.stringify(this.#data[i])];
    }
    customCheckDrag = function (types) {
        const typesarr = [
            'application/x-vlist-item-drag',
            'application/octet-stream',
        ];
        for (const i of types) {
            if (typesarr.includes(i)) return true;
            if (i === 'Files') return { dropEffect: 'copy' };
        }
        return false;
    }
    #ondragstart(ev) {
        const el = this.#checkIfDragAllowed(ev, false);
        if (!el) return;
        el.classList.add('dragging');
        const dd = this.customDragData(el.dataset.n);
        if (dd) ev.dataTransfer.setData(dd[0], dd[1]);
        ev.dataTransfer.setData('text/plain', el.innerText);

    }
    #ondragend(ev) {
        // const el = this.#checkIfDragAllowed(ev, false);
        // if (!el) return;
        // el.classList.remove('dragging');

    }
    #ondragenter(ev) {
        
    }
    #ondragover(ev) {
        const el = this.#checkIfDragAllowed(ev, false);
        if (!el) return;
        const checkResult = this.customCheckDrag(ev.dataTransfer.types);
        if (!checkResult) return;
        // if (ev.dataTransfer.items?.[0]?.kind === 'file') return;
        ev.preventDefault();
        this.#divContainer.querySelectorAll('.dropping').forEach(el => {
            el.classList.remove('dropping');
        });
        el.classList.add('dropping');
        let dropEffect = "none";
        if (checkResult.dropEffect) dropEffect = checkResult.dropEffect;
        else if (ev.shiftKey) dropEffect = "move";
        else if (ev.ctrlKey) dropEffect = "copy";
        else if (ev.altKey) dropEffect = "link";
        else dropEffect = "move";
        ev.dataTransfer.dropEffect = dropEffect;
        this.lastDropEffect = dropEffect;
    }
    #ondragleave(ev) {

    }
    #ondrop(ev) {
        if (!this.#checkIfDragAllowed(ev)) return;
        //console.log(ev.dataTransfer.getData('application/x-vlist-item-drag'));
        // user custom event handlers will do something
        // else this do no effect
    }
    #checkIfDragAllowed(ev, prevent = true) {
        if (!this.allowDrag) return false;
        for (const i of ev.composedPath()) {
            if (i?.tagName?.toLowerCase() === 'v-list-row' || i?.tagName?.toLowerCase() === 'v-list-view') {
                prevent && ev.preventDefault();
                return i;
            }
        }
        return false;
    }
    
    #handleDragEndAndDrop(ev) {
        for (let i of ['dragging', 'dropping'])
            this.#divContainer.querySelectorAll('.' + i).forEach(el => el.classList.remove(i));
    }
// drag&drop event handlers end


// selection managing start
    get selection() {
        return this.#selection;
    }
    set selection(value) {
        if (value == null) {
            this.clearSelection();
            return true;
        }

        this.clearSelection(true);
        const r = this.#updateSelection(value);
        if (r) this.dispatchEvent(new CustomEvent('selectionchanged', { target: this }));
        return r;
    }
    #updateSelection(newSelection) {
        this.#selection.clear();

        if (newSelection instanceof Array || newSelection instanceof Set) {
            for (let i of newSelection) {
                this.#selection.add(i, i);
            }
            this.#updateSelectionElement();
            return true;
        }
        if (!isNaN(newSelection)) {
            newSelection = Number(newSelection);
            this.#selection.add(newSelection);
            this.#updateSelectionElement();
            return true;
        }

        if (newSelection === 'all') {
            let datalen = this.#data.length;
            for (let i = 0; i < datalen; ++i) this.#selection.set(i, i);
            this.#updateSelectionElement();
            return true;
        }

        return false;
    }
    #updateSelectionElement() {
        for (const el of this.#divContainer.querySelectorAll('v-list-row')) {
            if (this.#selection.has(parseInt(el.dataset.n))) {
                el.classList.add('checked');
            }
        }
    }
    clearSelection(clearPfocus = false) {
        this.#selection.clear();
        this.#divContainer.querySelectorAll('v-list-row.checked').forEach(el => el.classList.remove('checked'));
        this.#divContainer.querySelectorAll('v-list-row.pfocus').forEach(el => el.classList.remove('pfocus'));
        if (!clearPfocus) this.#setPfocus();
    }
    #addSelection(i) {
        if (isNaN(i)) return false;
        if (this.noMultiple) this.clearSelection(true);
        this.#selection.set(Number(i), Number(i));
        this.#updateSelectionElement();
        return true;
    }
    #deleteSelection(i) {
        if (isNaN(i)) return false;
        if (!this.#selection._delete.call(this.#selection, Number(i), Number(i))) return false;
        this.#updateSelectionElement();
        return true;
    }

    #setPfocus() {
        this.#divContainer.querySelector('v-list-row')?.classList.add('pfocus');
    }


// multiple handling start
    get noMultiple() { return (this.getAttribute('no-multiple') != null) }
    set noMultiple(val) {
        val ?
            this.setAttribute('no-multiple', '') :
            this.removeAttribute('no-multiple');
        return true;
    }
// multiple handling end
    
// selection managing end
    
    
// filter start
    #filter = null;
    getFilter() {
        return this.#filter;
    }
    async filter(fn) {
        await this.update();
        if (!fn || !fn.call) return;
        this.#filter = fn;
        this.#data = this.#data.filter(fn);
        this.updateHeight();
        await this.#updateOnScroll(true);
        return this.#data.length;
    }
// filter end

    
// painting start
    #m_lineheight_computed = false;
    #computeHeight() {
        if (!this.#m_lineheight_computed) {
            const row = document.createElement('v-list-row');
            row.innerHTML = 'test';
            this.#divContainer.append(row);
            const style = globalThis.getComputedStyle(row);
            const h = parseInt(style.height) + parseInt(style.paddingTop) + parseInt(style.paddingBottom);
            this.#line_height = h + rowMarginBottom;
            this.#m_lineheight_computed = true;
            row.remove();
        }
        this.#height = Math.max(0, (this.#data.length * (this.#line_height)) - rowMarginBottom);
    }
    updateHeight() {
        this.#computeHeight();
        this.#divContainer.style.height = this.#height.toString() + 'px';
    }
    setLineHeight(px, shouldAutoFix = true) {
        if (isNaN(px)) throw new TypeError('Cannot set line height to NaN');
        if (px <= 0) throw new TypeError('Cannot set line height smaller than 0');
        this.#m_lineheight_computed = true;
        this.#line_height = px + (shouldAutoFix ? 13 : 0);
    }

    #updating = false;
    async update() {
        if (this.#updating) return;

        this.#updating = true;
        this.#divContainer.innerHTML = '';
        this.#filter = null;

        this.#data = this.data();
        if (!(this.#data instanceof Array) && !(this.#data instanceof Promise)) {
            this.#updating = false;
            throw new TypeError(`data function returned an incorrect result`);
        }
        function f(data) {
            this.#updating = false;
            if (this.#data !== data) this.#data = data;
            if (!(this.#data instanceof Array)) {
                throw new TypeError(`data promise returned an incorrect result`);
            }
            if (this.#data.length > 200_001) {
                throw new Error(`Too more data`);
            }

            this.selection = null;
            this.updateHeight();
            this.updateOnScroll(true);
        };
        if (this.#data instanceof Promise) try {
            this.#data = await this.#data;
            f.call(this, this.#data);
        } catch (error) {}
        else f.call(this, this.#data);
    }

    //#updateOnScrollLock = false;
    updateOnScroll() {
        return this.#updateOnScroll.apply(this, arguments);
    }
    async #updateOnScroll(forceRedraw = false) {
        const rangeOverlay = 10; // 渲染可视范围内的 ± 10 条数据

        if (!this.#data) return;
        // console.debug(new Date().getTime(), 'scroll before');
        //if (this.#updateOnScrollLock) return;
        //this.#updateOnScrollLock = true;
        // console.debug(new Date().getTime(), 'scroll execute');
        // console.log('-- scroll executed; time:' + new Date().getTime());

        await Promise.resolve();

        const scrollPos = this.scrollTop;

        let begin = Math.max(0, Math.floor((scrollPos) / this.#line_height) - rangeOverlay);
        let end = Math.min(this.#data.length, Math.floor((scrollPos + this.clientHeight) / this.#line_height) + rangeOverlay);
        //let current = Math.floor(scrollPos / this.#line_height);
        const numInRange = function (num, min, max) {
            return num >= min && num <= max;
        };

        if (forceRedraw) {
            this.#el.clear();
            this.#divContainer.innerHTML = '';
        }

        let offset = (begin) * this.#line_height;
        offset < 0 ? offset = 0 : (
            offset > this.#divContainer.clientHeight ? offset = this.#divContainer.clientHeight : 0
        );
        this.#divContainer.style.setProperty('--offset', offset + 'px');

        let createdElementsIndex = [];
        for (let i of this.#el) {
            // 元素已存在
            if (!numInRange(i[0], begin, end)) {
                // 移除不需要的元素
                i[1].remove();
                this.#el.delete(i[0]);
            }
        }
        for (let i = begin; i < end; ++i) {
            const el = this.#el.get(i);
            if (!el) {
                // 创建新行
                const data = this.#data[i];
                const el = this.#createRow(data, i);
                // el.style.top = offset + 'px';
                this.#el.set(i, el);
                if (this.#selection.has(i)) el.classList.add('checked');
                createdElementsIndex.push(i);
            }
        }

        // 整体添加新创建的元素
        if (createdElementsIndex.length) {
            const _locator = document.createElement('div');
            let _row1n = parseInt(this.#divContainer.querySelector('v-list-row')?.dataset.n);
            if (!isNaN(_row1n) && createdElementsIndex[0] < _row1n)
                this.#divContainer.prepend(_locator);
            else
                this.#divContainer.append(_locator);
            for (let i of createdElementsIndex) {
                const el = this.#el.get(i);
                if (!el) continue;
                _locator.before(el);
            }
            _locator.remove();
        }

        // console.debug(new Date().getTime(), 'scroll finish');
        // console.log('-- scroll finished; time:' + new Date().getTime())
        //this.#updateOnScrollLock = false;
    }

    #createRow(data, n) {
        const el = document.createElement('v-list-row');
        el.dataset.n = n;

        for (const i of data) {
            const d = document.createElement('v-list-item');
            (i.html) ? (d.innerHTML = i.html) :
                (d.innerText = i.text || i);
            el.append(d);
        }

        return el;
    }
// painting end


}


class HTMLVirtualListRowElement extends HTMLElement {
    constructor() {
        super();

        // this.setAttribute('tabindex', '0');
    }

    connectedCallback() {
        this.draggable = true;

        this.role = 'treeitem';

    }

}



class HTMLVirtualListItemElement extends HTMLElement {
    constructor() {
        super();


    }

}




/*
滚动条功能也算肝了亿会，不忍心删掉，需要的可以直接使用
*/
const scrollbarSize = 6;
const vScrollStyle = document.createElement('style');
vScrollStyle.textContent = `
#container {
    display: block;
    width: var(--scrollbar-width);
    height: var(--scrollbar-height);
    overflow: hidden;
    position: relative;

    --scrollbar-size: ${scrollbarSize}px;
}
#container.is-horizontal {
    --scrollbar-width: 100%;
    --scrollbar-height: var(--scrollbar-size);
    cursor: w-resize;
}
#container.is-vertical {
    --scrollbar-width: var(--scrollbar-size);
    --scrollbar-height: 100%;
    cursor: n-resize;
}

#thumb {
    display: block;
    position: absolute;
    background: #cecfd1;
    border-radius: 3px;
    cursor: default;
    transition: background 0.1s;
    touch-action: none;

    visibility: hidden;
}
#thumb:hover {
    background: #c0c1c3;
}
#thumb:focus {
    outline: 1px solid #aaaaaa;
}
#thumb.visible {
    visibility: visible;
}
#thumb.moving {
    background: /*#c8c9cc*/#aeafb2;
    cursor: inherit;
}
`;
class HTMLVirtualListScrollbarElement extends HTMLElement {
    #shadowRoot = null;
    #container = null;
    #thumb = null;
    #resizeObserver = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: 'closed' });
        this.#container = document.createElement('div');
        this.#container.id = 'container';
        this.#thumb = document.createElement('v-list-scroll-thumb');
        this.#thumb.id = 'thumb';
        this.#container.append(this.#thumb);
        this.#shadowRoot.append(this.#container);
        this.#shadowRoot.append(vScrollStyle.cloneNode(true));
        this.#resizeObserver = new ResizeObserver(() => {
            globalThis.requestAnimationFrame(() => this.update());
        });

        this.#thumb.addEventListener('pointerdown', this.#thumb_pointerDown.bind(this));
        this.#thumb.addEventListener('pointermove', this.#thumb_pointerMove.bind(this));
        this.#thumb.addEventListener('pointerup', this.#thumb_pointerUpOrCancel.bind(this));
        this.#thumb.addEventListener('pointercancel', this.#thumb_pointerUpOrCancel.bind(this));
        this.#thumb.addEventListener('contextmenu', () => false);

        this.#thumb.addEventListener('poschange', this.#thumb_poschange.bind(this));

    }

    get type() { return this.getAttribute('type') }
    set type(value) { this.setAttribute('type', value); return true }

    #min = 0;
    get min() { return this.#min }
    set min(value) { this.#min = value; this.update(); return true }

    #max = 1;
    get max() { return this.#max }
    set max(value) { this.#max = value; this.update(); return true }

    #value = 0;
    get value() { return this.#value }
    set value(value) { this.#value = value; this.update(); return true }

    connectedCallback() {
        this.role = 'scrollbar';
        globalThis.requestAnimationFrame(() => this.update());
        this.#resizeObserver?.observe(this);
    }

    disconnectedCallback() {
        this.#resizeObserver?.unobserve(this);
    }

    static get observedAttributes() { return ['type'] }
    attributeChangedCallback(name, oldValue, newValue) {
        globalThis.requestAnimationFrame(() => this.update());
    }


    update() {
        {
            let a = 'remove', b = 'add';
            if (this.type === 'horizontal') [a, b] = [b, a];
            this.#container.classList[a]('is-horizontal');
            this.#container.classList[b]('is-vertical');
        }

        if (isNaN(this.min) || isNaN(this.max)) return;
        if (isNaN(this.#value) || this.#value < this.min) this.#value = this.min;
        if (this.#value > this.max) this.#value = this.max;

        let client_size = (this.type === 'horizontal') ? this.#container.clientWidth : this.#container.clientHeight;

        let sum = this.max - this.min;
        let current = this.#value - this.min;

        let thumbsize = Math.max(scrollbarSize, Math.floor((client_size ** 2) / sum));
        if (thumbsize > client_size) {
            this.#thumb.classList.remove('visible');
        } else {
            this.#thumb.classList.add('visible');
        }

        let pos = (this.#value * (client_size - thumbsize)) / sum;


        {
            let a = 'width', b = 'height';
            if (this.type === 'horizontal') [a, b] = [b, a];
            this.#thumb.style[a] = 'var(--scrollbar-size)';
            this.#thumb.style[b] = thumbsize + 'px';

            a = 'left', b = 'top';
            if (this.type === 'horizontal') [a, b] = [b, a];
            this.#thumb.style[a] = '';
            this.#thumb.style[b] = pos + 'px';
        }

        this.dispatchEvent(new CustomEvent('scroll'));
    }


    #thumbMoving = false;
    #thumbMoveOffset = 0;
    #thumb_pointerDown(ev) {
        this.#thumb.setPointerCapture(ev.pointerId);
        this.#thumbMoving = true;
        this.#thumb.classList.add('moving');
        this.#thumbMoveOffset = (this.type === 'horizontal') ? ev.offsetX : ev.offsetY;
    }
    #thumb_pointerMove(ev) {
        if (!this.#thumbMoving) return;
        let client_size = (this.type === 'horizontal') ? this.#container.clientWidth : this.#container.clientHeight;
        let offset = (this.type === 'horizontal') ? ev.offsetX : ev.offsetY;
        let sum = this.max - this.min;
        let thumbsize = Math.max(scrollbarSize, Math.floor((client_size ** 2) / sum));
        let pos = (this.#value * (client_size - thumbsize)) / sum;
        let currentTop = Math.min(client_size - thumbsize,
            Math.max(0, (pos + offset) - this.#thumbMoveOffset));

        let a, b;
        a = 'left', b = 'top';
        if (this.type === 'horizontal') [a, b] = [b, a];
        this.#thumb.style[a] = '';
        this.#thumb.style[b] = currentTop + 'px';

        this.dispatchEvent(new CustomEvent('scrolling'));
        this.#value = this.min + (currentTop * sum) / (client_size - thumbsize);
    }
    #thumb_pointerUpOrCancel(ev) {
        if (!this.#thumbMoving) return;
        this.#thumbMoving = false;
        this.#thumb.classList.remove('moving');
        this.update();
    }

    #thumb_poschange(ev) {
        let client_size = (this.type === 'horizontal') ? this.#container.clientWidth : this.#container.clientHeight;
        let sum = this.max - this.min;
        let thumbsize = Math.max(scrollbarSize, Math.floor((client_size ** 2) / sum));
        switch (ev.detail.type) {
            case 'update':
                this.value += ev.detail.data * (ev.detail.altKey ? 1 : 20);
                break;
            case 'updatepage':
                this.value += ev.detail.data * client_size;
                break;
            case 'go':
                if (ev.detail.data === 1) this.value = this.max;
                else if (ev.detail.data === 0) this.value = this.min;
                break;

            default:
                break;
        }
    }

}

class HTMLVirtualListScrollThumbElement extends HTMLElement {
    constructor() {
        super();

        this.addEventListener('keydown', this.#onkeydown.bind(this), { capture: true });
    }
    connectedCallback() {
        this.tabIndex = 0;
    }
    #onkeydown(ev) {
        switch (ev.key) {
            case 'ArrowDown':
            case 'ArrowUp':
            case 'ArrowLeft':
            case 'ArrowRight':
                this.dispatchEvent(new CustomEvent('poschange', {
                    detail: {
                        type: 'update',
                        data: ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 1,
                        altKey: ev.altKey,
                    }
                }));
                break;
            case 'PageDown':
            case 'PageUp':
                this.dispatchEvent(new CustomEvent('poschange', {
                    detail: {
                        type: 'updatepage',
                        data: ev.key === 'PageUp' ? -1 : 1,
                        altKey: ev.altKey,
                    }
                }));
                break;
            case 'Home':
            case 'End':
                this.dispatchEvent(new CustomEvent('poschange', {
                    detail: {
                        type: 'go',
                        data: ev.key === 'End' ? 1 : 0,
                        altKey: ev.altKey,
                    }
                }));
                break;

            default: return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        return false;
    }
}



customElements.define('v-list-scrollbar', HTMLVirtualListScrollbarElement);
customElements.define('v-list-scroll-thumb', HTMLVirtualListScrollThumbElement);
customElements.define('v-list-item', HTMLVirtualListItemElement);
customElements.define('v-list-row', HTMLVirtualListRowElement);
customElements.define('v-list-view', HTMLVirtualListElement);




export {
    HTMLVirtualListElement,
    HTMLVirtualListRowElement,
    HTMLVirtualListItemElement,
    HTMLVirtualListScrollbarElement,
    HTMLVirtualListScrollThumbElement,
};





function debounce(fn, delay, thisArg = globalThis) {
    let timeId = null;
    return function () {
        const outerThis = this;
        if (timeId) clearTimeout(timeId);
        timeId = setTimeout(function (args) {
            if (thisArg === globalThis && outerThis !== globalThis)
                return fn.apply(outerThis, args);
            return fn.apply(thisArg, args);
        }, delay, arguments);
        return timeId;
    };
}

