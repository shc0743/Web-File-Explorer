/*
main JavaScript file for Web-File-Explorer

*/


import { reportFatalError } from './error-reporter.js';

const updateLoadStat = (globalThis.ShowLoadProgress) ? globalThis.ShowLoadProgress : function () {};

globalThis.appInstance_ = {};


export function delay(timeout = 0) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}


let pwa = new(URL)(globalThis.location.href).searchParams.get('pwa');
globalThis.w_open = window.open;
if (pwa === 'true' || pwa === '1' || pwa === 'yes') {
    globalThis.w_open = function (...args) {
        if (args.length > 0) {
            if (args.length < 2) args.push('_blank')
            if (args.length < 3) args.push(`width=${window.innerWidth},height=${window.innerHeight},left=${window.screenLeft},top=${window.screenTop}`)
        }
        return window.open.apply(window, args);
    };
    globalThis.addEventListener('pointerdown', function (ev) {
        if (ev.target?.tagName?.toUpperCase() !== 'A') return;
        if (ev.button !== 1) return;
        const href = ev.target.getAttribute('href');
        if (!href || href.startsWith('javascript:')) return;
        try {
            const hrefComputed = new URL(ev.target.href, location.href);
            ev.preventDefault();
            window.w_open(hrefComputed);
        } catch {}
    });
    pwa = true;
}
pwa = (pwa === true);
globalThis.appInstance_.pwa = pwa;
console.log('[main]', 'pwa=', pwa);

updateLoadStat('Waiting');
await new Promise(resolve => setTimeout(resolve));

import { registerResizableWidget } from '../js/BindMove.js';
registerResizableWidget();

updateLoadStat('Creating JSCon');
import { JsCon, register as registerJsCon } from '../js/jscon.js';
registerJsCon();
globalThis.appInstance_.con = new JsCon();
globalThis.appInstance_.con.registerConsoleAPI(globalThis.console);
globalThis.appInstance_.con.addErrorHandler();

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

// break long tasks
await delay();

updateLoadStat('Loading sw content');
import '@/assets/sw/sw_content.js';

updateLoadStat('Loading Vue.js');
import { createApp } from 'vue';
updateLoadStat('Loading Resource Loader');
import { LoadCSSAsLink } from '../js/ResourceLoader.js';

// break long tasks
await delay();

updateLoadStat('Loading element-plus.css');
LoadCSSAsLink('modules/element-plus/element-plus.css');


updateLoadStat('Loading servers');
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

updateLoadStat('Loading version');
try {
    globalThis.appInstance_.version = await (await fetch('assets/app/version')).text();
} catch (error) {
    globalThis.appInstance_.version = Symbol('N/A');
    globalThis.appInstance_.versionError = error;
}

// break long tasks
await delay();

updateLoadStat('Loading Vue Application');
// import Vue_App from '../../components/App/app.js'; // don't use this because some browser preload modules so that the progress cannot show correctly
const Vue_App = (await import('../../components/App/app.js')).default;

updateLoadStat('Creating Vue application');
const app = createApp(Vue_App);
// break long tasks
await delay(10);
updateLoadStat('Loading Element-Plus');
{
    const element = await import('element-plus');
    for (const i in element) {
        if (i.startsWith('El')) app.component(i, element[i]);
    }
}
// break long tasks
await delay();
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

// break long tasks
await delay(10);

updateLoadStat('Mounting application to document');
app.mount(myApp);

updateLoadStat('Waiting');
await delay();

updateLoadStat('Register shared worker');
// if (!globalThis.SharedWorker) {
//     throw reportFatalError("Your browser doesn't support SharedWorker");
// }
if (globalThis.SharedWorker) {
    let hasTask = false;
    const tasksInQueue = new Map();
    const worker = new SharedWorker(('assets/app/transfer_worker.js'), {
        type: 'module',
        name: 'Web-File-Explorer Transfer Background Worker Service',
    });
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
            
            case 'taskDone': {
                const k = JSON.stringify(ev.data.task);
                if (tasksInQueue.has(k)) {
                    tasksInQueue.get(k).resolve?.(ev.data);
                    tasksInQueue.delete(k);
                }
            }
                break;
            case 'taskFail': {
                const k = JSON.stringify(ev.data.task);
                if (tasksInQueue.has(k)) {
                    tasksInQueue.get(k).reject?.(ev.data);
                    tasksInQueue.delete(k);
                }
            }
                break;
        
            default:
                break;
        }
    });
    console.debug('[main] worker started:', worker);
    globalThis.appInstance_.addTask = function (data, arg = { wait: false }) {
        const { wait } = arg;
        if (wait) {
            return new Promise((resolve, reject) => {
                tasksInQueue.set(JSON.stringify(data), { resolve, reject });
                worker.port.postMessage({ type: 'addTask', task: data, notify: true });
            })
        }
        else worker.port.postMessage({ type: 'addTask', task: data });
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

// break long tasks
await delay();
updateLoadStat('Finishing');
globalThis.FinishLoad?.call(globalThis);




// break long tasks
await delay(100);


import('./hashchange.js').then(function (data) {
    function hashchange_handler(ev) {
        canGoDetector();
        
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
    const key = ev.key.toUpperCase();
    if (key === 'F5' && !(ev.ctrlKey || ev.shiftKey)) { // F5 only
        if (!globalThis.location.hash.startsWith('#/s/')) return;
        ev.preventDefault();
        return window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    if (key === 'P' && ev.ctrlKey && ev.shiftKey) { // Ctrl_Shift_P
        ev.preventDefault();
        return globalThis.commandPanel?.toggle();
    }
    if (key === 'K' && ev.ctrlKey && !ev.shiftKey) { // Ctrl_K
        ev.preventDefault();
        return globalThis.appInstance_.instance.transferPanel_isOpen =
            !globalThis.appInstance_.instance.transferPanel_isOpen;
    }
    if (key === 'N' && ev.ctrlKey) { // Ctrl_N | Ctrl_Shift_N
        ev.preventDefault();
        return globalThis.appInstance_.newFileOp(ev.shiftKey ? 'dir' : 'file');
    }
    if (key === 'ENTER' && ev.altKey) { // Alt_Enter
        ev.preventDefault();
        return globalThis.appInstance_.showPropertiesDialog?.();
    }
    if (key === 'F2' && !(ev.ctrlKey || ev.shiftKey)) { // F2 only
        ev.preventDefault();
        return globalThis.appInstance_.renameItem();
    }
    if (key === ',' && ev.ctrlKey) { // Ctrl+,
        return !(location.hash = '#/settings/');
    }
    if (key === 'I' && ev.ctrlKey && ev.shiftKey) { // Ctrl_Shift_P
        ev.preventDefault();
        return globalThis.appInstance_.con?.open();
    }

    if (ev.key === 'Alt') {
        ev.preventDefault();
        return globalThis.appInstance_.instance
            .$refs.headerBar
            .$refs.mainMenuBar
            .$refs.menubar
            .querySelector('button')?.focus();
    }
});



export function canGoDetector() {
    globalThis.appInstance_.instance.canGo = {
        back: globalThis.navigation?.canGoBack !== false,
        forward: globalThis.navigation?.canGoForward !== false,
    } // let old devices can use go and back
}
globalThis.setInterval(canGoDetector, 1000);















