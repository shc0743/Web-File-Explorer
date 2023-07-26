globalThis.importScripts('./assets/sw/env.js');
const { cacheName, cacheFiles } = globalThis.sw_env;

globalThis.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil((async function () {
        globalThis.skipWaiting();
        const cache = await caches.open(cacheName);
        return cache.addAll(cacheFiles);
    })());
});

globalThis.addEventListener('activate', function (e) {
    e.waitUntil((async function () {
        await clients.claim();
    })());
});

globalThis.addEventListener('fetch', function (e) {
    e.respondWith(async function () {
        const url = String(e.request.url);
        for (const i in globalThis.sw_replaces.end) {
            if (url.endsWith(i)) return await globalThis.sw_replaces.end[i](e.request);
        }
        for (const i in globalThis.sw_replaces.start) {
            if (url.startsWith(globalThis.location.origin + i)) return await globalThis.sw_replaces.start[i](e.request);
        }
        for (const i in globalThis.sw_replaces.regexp) try {
            if (new (RegExp)(i).test(url.replace(globalThis.location.origin, ''))) return await globalThis.sw_replaces.regexp[i](e.request);
        } catch (error) { console.warn('[sw]', 'Failed to parse sw_replaces RegExp item:', error); }
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



