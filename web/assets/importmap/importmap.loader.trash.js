/*(async function (isProd) {
    // const isProd = ((import.meta.url).endsWith('?prod')); // Cannot use module: "An import map is added after module script load was triggered."

    const resp = await fetch(`assets/importmap/index.${isProd ? 'prod' : 'dev'}.importmap`);
    const text = await resp.text();

    const el = document.createElement('script');
    el.type = 'importmap';
    el.textContent = text;
    (document.head || document.documentElement).append(el);
})(false);*/
