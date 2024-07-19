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
        const href = ev.target.getAttribute('href') || ev.target.dataset.hrefD7b2e4d9;
        if (!href || href.startsWith('javascript:')) return;
        try {
            const hrefComputed = new URL(href, location.href);
            ev.target.removeAttribute('href');
            ev.target.dataset.hrefD7b2e4d9 = href;
            ev.preventDefault();
            window.w_open(hrefComputed);
        } catch {}
    });
    globalThis.addEventListener('pointerover', function (ev) {
        if (ev.target?.tagName !== 'A' && ev.target?.tagName !== 'a') return;
        const href = ev.target.getAttribute('href') || ev.target.dataset.hrefD7b2e4d9;
        if (!href) return;
        ev.target.setAttribute('href', href);
        delete ev.target.dataset.hrefD7b2e4d9;
    });
    pwa = true;
}
pwa = (pwa === true);
globalThis.appInstance_.pwa = pwa;
console.log('[main]', 'pwa=', pwa);

updateLoadStat('Waiting');
await new Promise(resolve => setTimeout(resolve));

import { addCSS, registerResizableWidget } from '../js/BindMove.js';
registerResizableWidget();

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

try {
    updateLoadStat('Checking whether default settings should be loaded or not')
    const settings_set = await userdata.get('config', 'settings_set');
    if (!settings_set) {
        updateLoadStat('Loading default settings')
        const def = (await import('../static/default_settings.js')).default;
        for (const i of Reflect.ownKeys(def)) {
            await userdata.put('config', def[i], i);
        }
    }
    updateLoadStat('Loading additional settings')
    const def = (await import('../static/default_settings.js')).additional_settings;
    for (const i of Reflect.ownKeys(def)) {
        if (undefined == await userdata.get('config', i))
            await userdata.put('config', def[i], i);
    }
}
catch (error) {
    throw reportFatalError(error, 'main');
}

// break long tasks
await delay();

{
    updateLoadStat('Loading custom themes')
    const font = await userdata.get('config', 'ui.fontfamily');
    if (font) {
        addCSS(`#myApp, #myApp * { font-family: ${font}; }`)
    }
    const css = await userdata.get('config', 'ui.custom_css');
    if (css) {
        let verified = await userdata.get('config_internals', 'allow_custom_css');
        if (undefined == verified) await userdata.put('config_internals', verified = await new Promise((resolve, reject) => {
            const dialog = document.createElement('dialog');
            dialog.innerHTML = `
            <h1>You're trying to use the custom css.</h1>
            <h1>Although you might have enough reasons to do it, we must tell you:</h1>
            <ol>
                <li><b>Custom CSS is risky.</li>
                <li>Malformed-CSS can destroy the website and might cause data leak!!!</li>
                <li>Uncareful changes to custom CSS may break the web frontend!</li>
            </ol>
            <div style="color:red"><b>Are you sure you want to enable Custom CSS?</div>
            <a href="javascript:" data-value="true">Yes, continue</a><br>
            <a href="javascript:" data-value="false">No, I don't know what this is</a><br>
            <a href="javascript:" data-value="false">No, disable the feature</a><br>
            <a href="javascript:" data-value="undefined">Not now, please ask me later</a><br>
            `;
            document.body.appendChild(dialog);
            dialog.addEventListener('click', ev => {
                let val = ev.target?.dataset?.value;
                switch (val) {
                    case 'true': resolve(true); break;
                    case 'false': resolve(false); break;
                    case 'undefined': resolve(undefined); break;
                    default: return;
                }
                dialog.close();
            });
            dialog.onclose = () => (resolve(undefined), dialog.remove());
            dialog.showModal();
        }), 'allow_custom_css');
        if (verified) addCSS(css);
    }
}

// break long tasks
await delay();

updateLoadStat('Creating JSCon');
import { JsCon, register as registerJsCon } from '../js/jscon.js';
registerJsCon();
globalThis.appInstance_.con = new JsCon();
do {
    const disableJsCon = await userdata.get('config', 'dev.disableJsCon');
    if (disableJsCon) {
        globalThis.appInstance_.con.error('Console is disabled!');
        // globalThis.appInstance_.con.error('Type "location.reload()" to reload the page');

        globalThis.appInstance_.con.disableObject();
        break;
    }
    if(typeof disableJsCon !== 'boolean') await userdata.put('config', false, 'dev.disableJsCon')
    globalThis.appInstance_.con.registerConsoleAPI(globalThis.console);
    globalThis.appInstance_.con.addErrorHandler();
} while (0);

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
            
            // case 'hasTask':
            //     hasTask = ev.data.value;
            //     break;
        
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

        if (hash.startsWith('#'))
        for (const i in data.default) {
            if (i.endsWith('/') ? hash.startsWith(i) : (function () {
                if (!i.startsWith('#')) return false;
                const url = new URL(i.substring(1), location),
                    hurl = new URL(hash.substring(1), location);
                return url.pathname === hurl.pathname;
            }())) return data.default[i].apply(globalThis.appInstance_.instance, [hash, app, ev]);
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


import('./keyboard_shortcuts.js').then((moduleHandle) => {
    const { default: ks, NoPrevent } = moduleHandle;
    globalThis.addEventListener('keydown', function (ev) {
        const keys = [];
        if (ev.ctrlKey && ev.key !== 'Control') keys.push('Ctrl');
        if (ev.altKey && ev.key !== 'Alt') keys.push('Alt');
        if (ev.shiftKey && ev.key !== 'Shift') keys.push('Shift');
        keys.push(ev.key.length === 1 ? ev.key.toUpperCase() : ev.key);
        const key = keys.join('+');

        const fn = ks[key];
        if (fn) {
            const ret = fn.call(globalThis, ev, key);
            if (ret !== NoPrevent) ev.preventDefault();
        }
        return;
    });
});



export function canGoDetector() {
    globalThis.appInstance_.instance.canGo = {
        back: globalThis.navigation?.canGoBack !== false,
        forward: globalThis.navigation?.canGoForward !== false,
    } // let old devices can use go and back
}
globalThis.setInterval(canGoDetector, 5000);















