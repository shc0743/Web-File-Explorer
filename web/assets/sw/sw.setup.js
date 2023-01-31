if ('serviceWorker' in globalThis.navigator) {
    navigator.serviceWorker.register('./sw.js');
};
