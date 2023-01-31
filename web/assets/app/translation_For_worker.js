
export const default_lang = 'en';
let lang = navigator.languages;
let translation_table = null;
for (let i of lang) {
    try {
        const real_resp = await fetch(`../../translation/${i}/transfer.json`);
        if (!real_resp.ok) continue;
        translation_table = await real_resp.json();
    }
    catch { continue }

    break;
}

// Load the default language
if (!translation_table) do {
    try {
        const resp = await fetch(`../../translation/${default_lang}/transfer.json`);
        if (!resp.ok) continue;
        translation_table = await resp.json();
    }
    catch { continue }
} while (0);

if (!translation_table) {
    // Failed to load language file
    console.error('[translation]', 'Failed to load translation table!');
}

globalThis.tr = function translate(source, default_value) {
    return translation_table[source] || default_value || source;
}


export { translation_table };


