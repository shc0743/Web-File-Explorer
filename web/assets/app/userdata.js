

// config
export const db_name = 'Web-File-Explorer_web-data_' + globalThis.location.pathname.replace(/(\/|\\|\:|\;|\"|\'|\+|\=|\[|\]|\(|\)|\,|\.)/g, '_');
export const version = 5;


import { openDB } from 'idb';


const el_dbExpired = document.createElement('dialog');
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




const dbUpgrade = {
    0: function (db, transaction) { },
    1: function (db, transaction) {
        db.createObjectStore('config', { autoIncrement: true });
    },
    2: function (db, transaction) {
        db.createObjectStore('servers', { keyPath: 'addr' });
    },
    3: function (db, transaction) {

    },
    4: function (db, transaction) {
        db.createObjectStore('remoteFileEditCache', { keyPath: 'id' });
    },
};


let db;
await new Promise(function (resolve, reject) {
    openDB(db_name, version, {
        upgrade(db, oldVersion, newVersion, transaction, event) {
            for (let version = oldVersion; version < newVersion; ++version) {
                if (dbUpgrade[version]) {
                    const _ = dbUpgrade[version].call(db, db, transaction);
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



