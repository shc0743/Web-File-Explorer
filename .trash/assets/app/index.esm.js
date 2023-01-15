
import { createApp } from '../js/vue.esm-browser.js';
import LoadModule from '../js/module-loader.js';


const Vue_App = await LoadModule('assets/app/App.vue');
const app = createApp(Vue_App.default);

app.mount('#app');

const myApp = document.getElementById('myApp');
console.assert(myApp); if (!myApp) throw new Error('FATAL: #myApp not found');


import { Initialize, switchRouter } from './router.js';
import routerList from './routerList.js';
await Initialize(myApp, routerList);


import('./translation.js');


import { handler as HashObjectHandler } from './hash_handler.js';
function hashchange_handler(ev) {
    let hash = location.hash;

    for (let i in HashObjectHandler) {
        if (hash.startsWith(i)) {
            return HashObjectHandler[i](hash, myApp, ev);
        }
    }

    // check if it's the default app
    if (hash === '' || hash === '#') {
        location.hash = '#/';
        return;
    }
    if (hash === '#/') {
        return HashObjectHandler['$empty'](hash, myApp, ev);
    }
    
    // run the default handler
    switchRouter(myApp, 'notFoundPage')
}
globalThis.addEventListener('hashchange', hashchange_handler);
setTimeout(hashchange_handler);






