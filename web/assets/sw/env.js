

globalThis.sw_env = {
    cacheName: globalThis.location.pathname.replaceAll('/', '_'),
    cacheFiles: [
        'assets/app/index.esm.js',
        'assets/importmap/index.dev.importmap',
        'assets/importmap/index.prod.importmap',
    ],
};


