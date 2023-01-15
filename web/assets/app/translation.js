

export const default_lang = 'en';
let lang = navigator.languages;
let translation_table = null;

// Load translation file in order
for (let i of lang) {
    try {
        const resp = await fetch(`translation/${i}/app.json`, { method: 'HEAD' });
        if (!resp.ok) continue;
        const real_resp = await fetch(`translation/${i}/app.json`);
        translation_table = await real_resp.json();
    }
    catch { continue }

    document.documentElement.lang = i;
    break;
}

// Load the default language
if (!translation_table) do {
    try {
        const resp = await fetch(`translation/${default_lang}/app.json`);
        if (!resp.ok) continue;
        translation_table = await resp.json();
    }
    catch { continue }
} while (0);

if (!translation_table) {
    // Failed to load language file
    console.error('[translation]', 'Failed to load translation table!');
} else {
    // translation table loaded correctly

    const _proxy = new Proxy({}, {
        get(target, prop, receiver) {
            return translation_table[prop] || prop;
        },
        set(target, p, newValue, receiver) {
            return false;
        },
        has(target, prop) {
            return prop in translation_table;
        },
        ownKeys(target) {
            return Reflect.ownKeys(translation_table);
        },
    })
    globalThis.translation_table = _proxy;
    globalThis.tr = function translate(source, default_value) {
        return translation_table[source] || default_value || source;
    }



    document.title = tr('document.title', document.title);

}




export { translation_table };


