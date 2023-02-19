

globalThis.sw_env = {
    cacheName: globalThis.location.pathname.replaceAll('/', '_'),
    cacheFiles: [
        'assets/app/index.esm.js',
        'assets/importmap/index.dev.importmap',
        'assets/importmap/index.prod.importmap',
    ],
};

globalThis.sw_replaces = {
    async 'assets/sw/sw_content.js'(req) {
        if (!navigator.onLine) {
            const cacheResult = await caches.match(e.request);
            return cacheResult || fetch(e.request).catch(nop);
        }
        let pn = globalThis.location.pathname;
        pn = pn.substring(0, pn.lastIndexOf('/'));
        const resp = await fetch(pn + '/assets/sw/sw_content-bridge.js');
        try { (await caches.open(sw_env.cacheName)).put(req, resp.clone()); } catch { }
        return resp;
    },
};


