import { createApp } from '../js/vue.esm-browser.js';
import LoadModule from '../js/module-loader.js';



export async function Initialize(appRoot, routerList) {
    let result = true;

    try {
        for (const i in routerList)
            if (!createAndAttachRouter(appRoot, i, routerList[i])) result = false;

        result ?
            console.debug('[Initialize]', 'Initialized successfully') :
            console.warn('[Initialize]', 'Failed to initialize');
    }
    catch (error) {
        console.error('[Initialize]', 'Failed to initialize:', error);
    }
    return result;
};



export async function createAndAttachRouter(appRoot, routerName, routerPath) {
    const router = document.createElement('my-router-item');
    router.setAttribute('name', routerName);
    appRoot.append(router);

    const Vue_App = await LoadModule(routerPath);
    const app = createApp(Vue_App.default);
    app.mount(router);

    return router;
}


export function switchRouter(appRoot, routerName) {
    for (const i of appRoot.childNodes) {
        if (i.getAttribute('name') === routerName) {
            i.setAttribute('is-current', '');
        }
        else i.removeAttribute('is-current');
    }
}




{
    let css = document.createElement('style');
    css.innerHTML = `
    my-router-item:not([is-current]),
    my-router-item:not([is-current]) * {
        display: none !important;
    }
    `;
    (document.head || document.documentElement).append(css);
}


