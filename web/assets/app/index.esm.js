/*
main JavaScript file for Web-File-Explorer

*/


import { reportFatalError } from './error-reporter.js';

const updateLoadStat = (globalThis.ShowLoadProgress) ? globalThis.ShowLoadProgress : function () {};


let db_name = null;
try {
    updateLoadStat('Loading userdata');
    db_name = (await import('./userdata.js')).db_name;

    updateLoadStat('Loading menu helper');
    await import('@/assets/js/winmenu-helper.js');
}
catch (error) {
    throw reportFatalError(error, 'main');
}
    
updateLoadStat('Loading Vue.js');
import { createApp } from 'vue';
updateLoadStat('Loading Resource Loader');
import { LoadCSSAsLink } from '../js/ResourceLoader.js';


updateLoadStat('Loading element-plus.css');
LoadCSSAsLink('modules/element-plus/element-plus.css');


globalThis.appInstance_ = {};

async function loadServers_() {
    // This is for initinaze only
    //console.trace();

    const arr = [];

    const keys = await userdata.getAllKeys('servers');
    for (const key of keys) {
        const data = await userdata.get('servers', key);
        arr.push(data);
    }

    globalThis.appInstance_.instance.$data.servers = arr;
    
    return arr;
};
globalThis.loadServers_ = loadServers_;
globalThis.loadServers = function () {
    if (globalThis.appInstance_.pendingServerLoadRequest) {
        return globalThis.appInstance_.pendingServerLoadRequest;
    }
    globalThis.appInstance_.pendingServerLoadRequest = loadServers_();
    globalThis.appInstance_.pendingServerLoadRequest.then(function () {
        delete globalThis.appInstance_.pendingServerLoadRequest;
    });
    return globalThis.appInstance_.pendingServerLoadRequest;
};
globalThis.notifyDataUpdate = function () {
    localStorage.setItem(db_name + '-update', (new Date).getTime());
};

updateLoadStat('Loading Vue Application');
// import Vue_App from '../../components/App/app.js'; // don't use this because some browser preload modules so that the progress cannot show correctly
const Vue_App = (await import('../../components/App/app.js')).default;

updateLoadStat('Creating Vue application');
const app = createApp(Vue_App);
updateLoadStat('Loading Element-Plus');
{
    const element = await import('element-plus');
    for (const i in element) {
        if (i.startsWith('El')) app.component(i, element[i]);
    }
}
updateLoadStat('Creating app instance');
globalThis.appInstance_.app = app;
app.config.unwrapInjectedRef = true;
app.config.compilerOptions.isCustomElement = (tag) => tag.includes('-');
app.config.compilerOptions.comments = true;

// app.mount('#app');

updateLoadStat('Finding #myApp');
const myApp = document.getElementById('myApp');
console.assert(myApp); if (!myApp) throw new Error('FATAL: #myApp not found');

updateLoadStat('Loading translation');
await import('./translation.js');
app.config.globalProperties.tr = globalThis.tr;

updateLoadStat('Mounting application to document');
app.mount(myApp);

updateLoadStat('Waiting');
await new Promise(resolve => setTimeout(resolve));

updateLoadStat('Register shared worker');
// if (!globalThis.SharedWorker) {
//     throw reportFatalError("Your browser doesn't support SharedWorker");
// }
if (globalThis.SharedWorker) {
    let hasTask = false;
    const worker = new SharedWorker(import.meta.resolve('./transfer_worker.js'), { type: 'module' });
    globalThis.appInstance_.worker = worker;
    worker.port.onmessage = (function (ev) {
        if (!ev.data) return;
        switch (ev.data.type) {
            case 'taskUpdated':
                globalThis.appInstance_.instance.transferList.length = 0;
                for (const i of ev.data.task) {
                    globalThis.appInstance_.instance.transferList.push(i);
                }
                break;
            
            case 'dataUpdated':
                if (globalThis.appInstance_.serverView.$data.viewType === 'explore')
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                break;
        
            default:
                break;
        }
    });
    console.debug('[main] worker started:', worker);
    globalThis.appInstance_.addTask = function (data) {
        worker.port.postMessage({ type: 'addTask', task: data });
    };
    globalThis.appInstance_.deleteTask = function (uid) {
        worker.port.postMessage({ type: 'deleteTask', uid: uid });
    };
    window.addEventListener('beforeunload', function () {
        if (hasTask) return false;
        worker.port.postMessage({ type: 'disconnect' });
        worker.port.close();
    });
}

updateLoadStat('Finishing');
globalThis.FinishLoad?.call(globalThis);





import('./hashchange.js').then(function (data) {
    function hashchange_handler(ev) {
        let hash = location.hash;

        for (const i in data.default) {
            if (hash.startsWith(i)) return data.default[i].apply(globalThis.appInstance_.instance, [hash, app, ev]);
        }

        // check if it's the default app
        if (hash === '#/') {
            globalThis.appInstance_.instance.$data.current_page = 'main';
            return
        }
        if (hash === '' || hash === '#') {
            globalThis.appInstance_.instance.$data.current_page = 'main';
            history.replaceState('', document.title, '#/');
            return;
        }
    
        // run the default handler
        globalThis.appInstance_.instance.$data.current_page = '404';
    
    }
    globalThis.addEventListener('hashchange', hashchange_handler);
    setTimeout(hashchange_handler);
}).catch(function (error) { console.error('[hashchange_handler]', error) });

import('./cp.js').then(function ({ CommandPanel }) {
    globalThis.commandPanel = new CommandPanel();
}).catch(function (error) { console.error('[CommandPanel]', error) });



globalThis.addEventListener('storage', function (ev) {
    if (ev.key === db_name + '-update') {
        globalThis.loadServers();
    }
});


globalThis.addEventListener('keydown', function (ev) {
    if (ev.key === 'F5' && !(ev.ctrlKey || ev.shiftKey)) {
        if (!globalThis.location.hash.startsWith('#/s/')) return;
        ev.preventDefault();
        return window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    if (ev.key.toUpperCase() === 'P' && ev.ctrlKey && ev.shiftKey) {
        ev.preventDefault();
        return globalThis.commandPanel?.open();
    }
    if (ev.key.toUpperCase() === 'K' && ev.ctrlKey && !ev.shiftKey) {
        ev.preventDefault();
        return globalThis.appInstance_.instance.transferPanel_isOpen =
            !globalThis.appInstance_.instance.transferPanel_isOpen;
    }
});













