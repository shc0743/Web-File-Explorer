

// config
export const db_name = 'Web-File-Explorer_web-data_' + globalThis.location.pathname.replace(/(\/|\\|\:|\;|\"|\'|\+|\=|\[|\]|\(|\)|\,|\.)/g, '_');
export const version = 10;


import { openDB } from '../../modules/idb/idb.esm.js';


const el_dbExpired = globalThis.document?.createElement('dialog');
if (globalThis.document) {
    el_dbExpired.innerHTML = `
<div style="font-weight: bold; font-size: large;">The database has expired.</div>
<div style="font-size: smaller; color: gray; font-family: monospace;" data-content></div>
<div>
    <span>Please</span>
    <a href="javascript:" onclick="globalThis.location.reload()">reload the page</a>
    <span>to continue.</span>
</div>
`;
    el_dbExpired.oncancel = () => false;
    (document.body || document.documentElement).append(el_dbExpired);
}




const dbUpgrade = {
    0(db, t, old) { },
    1(db, t, old) {
        db.createObjectStore('config', { autoIncrement: true });
    },
    2(db, t, old) {
        db.createObjectStore('servers', { keyPath: 'addr' });
    },
    5(db, t, old) { db.createObjectStore('uploadCache'); },
    6(db, t, old) {
        db.createObjectStore('transferCache');
        if (old >= 4) db.deleteObjectStore('remoteFileEditCache');
    },
    7(db, t, old) {
        db.createObjectStore('favlist', { keyPath: 'fullpathname' });
        db.createObjectStore('recents', { autoIncrement: true });
    },
    8(db, t, old) {
        db.createObjectStore('extdata');
    },
    9(db, t, old) {
        db.createObjectStore('config2', { autoIncrement: true });
        db.createObjectStore('config_internals', { autoIncrement: true });
    },
};


let db;
await new Promise(function (resolve, reject) {
    openDB(db_name, version, {
        upgrade(db, oldVersion, newVersion, transaction, event) {
            for (let version = oldVersion; version < newVersion; ++version) {
                if (dbUpgrade[version]) {
                    const _ = dbUpgrade[version].call(db, db, transaction, oldVersion);
                }
            }
        },
        blocked(currentVersion, blockedVersion, event) {
            reject(`Failed to open database ${db_name}: blocked: currentVersion = ${currentVersion}, blockedVersion = ${blockedVersion}`)
        },
        blocking(currentVersion, blockedVersion, event) {
            db.close();
            (el_dbExpired.querySelector('[data-content]') || {}).innerText = `currentVersion = ${currentVersion}, blockedVersion = ${blockedVersion}`;
            el_dbExpired.showModal();
        },
        terminated() {
            // …
        },
    })
    .then(function (result) {
        db = result;
        resolve();
    })
    .catch(reject);
    
    setTimeout(() => reject('Timeout while opening idb'), 10000);
});






export { db };
globalThis.userdata = db;





export function createServerData({
    addr = '',
    name = addr,
    pswd = '',
    remarks = '',
}) {
    if (!addr) return null;
    return { addr, name, pswd, remarks, };
}



