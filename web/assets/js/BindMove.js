
const ProductId = 'fdf3404207ac433293f97c1dd3ca103a';
export { ProductId };


    

function nop(ev) { ev.preventDefault(); return false };

    
    
let wDocWidth = 0, wDocHeight = 0;
function noOverBorder(el, target, x, y, opt, containerOffset) {
    const { container, isTranslatedToCenter } = opt;
    x -= containerOffset.left;
    y -= containerOffset.top;
    if (x < 0) x = 0; if (y < 0) y = 0;
    if (x + el.$__BM_width > wDocWidth) x = wDocWidth - el.$__BM_width;
    if (y + el.$__BM_height > wDocHeight) y = wDocHeight - el.$__BM_height;
    if (isTranslatedToCenter) {
        x += el.$__BM_width / 2;
        y += el.$__BM_height / 2;
    }
    target.style.left = x + 'px';
    target.style.top = y + 'px';

    // document only
    if (container === document.documentElement) {
        const rc = target.getBoundingClientRect();

        const sx/*scrollX*/ = (rc.right > container.clientWidth ? 10 : (rc.left < 0 ? -10 : 0));
        const sy/*scrollY*/ = (rc.bottom > container.clientHeight ? 10 : (rc.top < 0 ? -10 : 0));
        if (sx || sy) window.scrollBy(sx, sy);
    }
}
function getOffsetToDoc(el, prop) {
    // example : getOffsetToBody(<HTMLElement>, 'offsetTop')
    let val = 0, op = el;
    do {
        val += op[prop];
        op = op.offsetParent;
    }
    while (op && op !== document.body && op !== document.documentElement);
    return val;
}
    

function BindMove(el, target = el, options = {
    container: null,
    isTranslatedToCenter: false,
    isFixed: false,
}) {
    if (!el) throw new TypeError('Invalid paramters', arguments);

    if (!options.container) options.container = document.documentElement;

    const containerOffset = { left: 0, top: 0 };

    el.classList.add(ProductId + '-el');
    target.classList.add(ProductId + '-target');
    el.$__BM_target = target;
    function DragStartHandler() {
        return false;
    }
    function PointerMoveHandler(ev) {
        noOverBorder(el, target,
            (options.isFixed ? ev.x : ev.pageX) - el.$__BM_targetX,
            (options.isFixed ? ev.y : ev.pageY) - el.$__BM_targetY,
            options, containerOffset
        );
    }
    function PointerUpOrCancelHandler() {
        el.classList.remove('moving');
        target.classList.remove('moving');

        delete el.$__BM_offsetX;
        delete el.$__BM_offsetY;
        
        el.removeEventListener('dragstart', DragStartHandler);
        el.removeEventListener('pointermove', PointerMoveHandler);
        el.removeEventListener('pointerup', PointerUpOrCancelHandler);
        el.removeEventListener('pointercancel', PointerUpOrCancelHandler);
    }
    el.$__PointerDownHandler = function (ev) {
        if (!ev.isPrimary) return;

        el.$__BM_offsetX = ev.x;
        el.$__BM_offsetY = ev.y;
        {
            const rect = target.getBoundingClientRect();
            el.$__BM_targetX = el.$__BM_offsetX - rect.x;
            el.$__BM_targetY = el.$__BM_offsetY - rect.y;
            el.$__BM_width = Math.ceil(rect.width);
            el.$__BM_height = Math.ceil(rect.height);
        }
        containerOffset.left = getOffsetToDoc(options.container, 'offsetLeft');
        containerOffset.top = getOffsetToDoc(options.container, 'offsetTop');
        wDocWidth = options.isFixed ? options.container.clientWidth : options.container.scrollWidth;
        wDocHeight = options.isFixed ? options.container.clientHeight : options.container.scrollHeight;

        el.classList.add('moving');
        target.classList.add('moving');

        el.setPointerCapture(ev.pointerId);

        el.addEventListener('pointermove', PointerMoveHandler);
        el.addEventListener('pointerup', PointerUpOrCancelHandler);
        el.addEventListener('pointercancel', PointerUpOrCancelHandler);
    }

    el.addEventListener('pointerdown', el.$__PointerDownHandler);
    el.addEventListener('dragstart', nop);
    el.addEventListener('contextmenu', nop);



    
}


function UnBindMove(el) {
    el.classList.remove(ProductId + '-el');
    el.$__BM_target.classList.remove(ProductId + '-target');


    el.removeEventListener('pointerdown', el.$__PointerDownHandler);
    el.removeEventListener('dragstart', nop);
    el.removeEventListener('contextmenu', nop);

    delete el.$__PointerDownHandler;
    delete el.$__ContextMenuHandler;
    delete el.$__BM_target;
}




addCSS(`
.${ProductId}-el {
    user-select: none;
    touch-action: none;
}
.${ProductId}-el.moving {
    cursor: move;
}
.${ProductId}-target.moving {
    /* position: absolute; */
    transition: none;
}
`);


function addCSS(css) {
    let el = document.createElement('style');
    el.innerHTML = css;
    (document.head || document.documentElement).append(el);
    return el;
}



export { addCSS as addCSS };
    
export {
    BindMove as BindMove,
    UnBindMove as UnBindMove,
};


