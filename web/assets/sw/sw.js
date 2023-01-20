globalThis.importScripts('./env.js');
// const { cacheName, cacheFiles } = globalThis.sw_env;

globalThis.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    // e.waitUntil(
    //     caches.open(cacheName).then(function (cache) {
    //         return cache.addAll(cacheFiles);
    //     })
    // );
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
    // e.respondWith(
    //     caches.match(e.request).then(function (r) {
    //         console.log('[Service Worker] Fetching resource: ' + e.request.url);
    //         return r || fetch(e.request).then(function (response) {
    //             return caches.open(cacheName).then(function (cache) {
    //                 console.log('[Service Worker] Caching new resource: ' + e.request.url);
    //                 cache.put(e.request, response.clone());
    //                 return response;
    //             });
    //         });
    //     })
    // );
});



