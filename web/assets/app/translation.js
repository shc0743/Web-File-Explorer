

export const default_lang = 'en';
let lang = navigator.languages;
let translation_table = null;

// Load translation file in order
for (let i of lang) {
    try {
        const resp = await fetch(`translation/${i}/app.json`);
        if (!resp.ok) continue;
        translation_table = await resp.json();
    }
    catch { continue }

    lang = document.documentElement.lang = i;
    break;
}

// Load the default language
if (!translation_table) do {
    try {
        const resp = await fetch(`translation/${default_lang}/app.json`);
        if (!resp.ok) continue;
        translation_table = await resp.json();
        lang = default_lang;
    }
    catch { continue }
} while (0);

if (!translation_table) {
    // Failed to load language file
    console.error('[translation]', 'Failed to load translation table!');
    throw new Error('translation: Failed to load translation table');
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




export { lang, translation_table };


