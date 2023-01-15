(function (isProd) {
    // copy from maps (External import maps are not yet supported.)

    const devMap = {
        "imports": {
            "vue": "./modules/vue/vue.esm-browser.js",
            "idb": "./modules/idb/idb.esm.js",
            "element-plus": "./modules/element-plus/index.full.min.mjs.js",
            "element-plus/": "./modules/element-plus/"
        }
    };
    const prodMap = {
        "imports": {
            "vue": "./modules/vue/vue.esm-browser.prod.js",
            "idb": "./modules/idb/idb.esm.js",
            "element-plus": "./modules/element-plus/index.full.min.mjs.js",
            "element-plus/": "./modules/element-plus/"
        }
    };

    const el = document.createElement('script');
    el.type = 'importmap';
    el.textContent = JSON.stringify(isProd ? prodMap : devMap);
    (document.head || document.documentElement).append(el);
})(false);
