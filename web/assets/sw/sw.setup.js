if ('serviceWorker' in globalThis.navigator) {
    navigator.serviceWorker.register(import.meta.resolve`./sw.js`);
};
