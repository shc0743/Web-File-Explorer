

globalThis.sw_env = {
    cacheName: globalThis.location.pathname.replaceAll('/', '_'),
    cacheFiles: [
        'assets/app/index.esm.js',
        'assets/importmap/index.dev.importmap',
        'assets/importmap/index.prod.importmap',
    ],
};

globalThis.sw_replaces = {
    end: {
        async 'assets/sw/sw_content.js'(req) {
            if (!navigator.onLine) {
                const cacheResult = await caches.match(req);
                return cacheResult || fetch(req).catch(nop);
            }
            let pn = globalThis.location.pathname;
            pn = pn.substring(0, pn.lastIndexOf('/'));
            const resp = await fetch(pn + '/assets/sw/sw_content-bridge.js');
            try { (await caches.open(sw_env.cacheName)).put(req, resp.clone()); } catch { }
            return resp;
        },
    },
    start: {
        '/file/new/': nativeFileApiFilter,
    },
    regexp: {
        '^\/(dl|file|files|isFileOrDirectory|fileinfo)\?([\s\S]*)=([\s\S]*)$': nativeFileApiFilter,
        '^\/(auth|volumes)$': nativeFileApiFilter,
        '^\/file\/(copy|move|link)?([\s\S]*)=([\s\S]*)$': nativeFileApiFilter,
        '^\/sys\/([A-z0-9]*)$': nativeFileApiFilter,
    }
};


function nativeFileApiFilter(req) {
    return fetch(req);
}


