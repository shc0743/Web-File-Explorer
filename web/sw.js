globalThis.importScripts('./assets/sw/env.js');
const { cacheName, cacheFiles } = globalThis.sw_env;

globalThis.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            return cache.addAll(cacheFiles);
        })
    );
});

globalThis.addEventListener('activate', function (e) {
    // e.waitUntil(
    //     caches.keys().then(function (keyList) {
    //         return Promise.all(keyList.map(function (key) {
    //             if (!cacheName.includes(key)) {
    //                 return caches.delete(key);
    //             }
    //         }));
    //     })
    // );
});

globalThis.addEventListener('fetch', function (e) {
    e.respondWith(async function () {
        if (!navigator.onLine) {
            const cacheResult = await caches.match(e.request);
            return cacheResult || fetch(e.request).catch(nop);
        }
        try {
            const resp = await fetch(e.request);
            if (/GET/i.test(e.request.method) && resp.status === 200 && (
                e.request.url.startsWith(globalThis.location.origin)
            )) try {
                const cache = await caches.open(cacheName);
                cache.put(e.request, resp.clone());
            } catch { };
            return resp;
        } catch {}
        const cacheResult = await caches.match(e.request);
        return cacheResult || fetch(e.request).catch(nop);
    }());
});



function nop() {}



