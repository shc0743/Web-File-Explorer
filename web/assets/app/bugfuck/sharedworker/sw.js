globalThis.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    e.waitUntil(
        (async () => { })()
    );
});

globalThis.addEventListener('activate', function (e) {
    console.log('[Service Worker] activate');
    
});




function nop() { }



