


export async function getHTML(jspath, cid) {
    const url = new URL(jspath);
    const url2 = url.pathname.replace('.js', '.html');
    const resp = await fetch(url2);
    if (!resp.ok) return null;
    const text = await resp.text();
    return text
        .replaceAll('<style', `<component is="style"`)
        .replaceAll('</style>', `</component>`)
        .replaceAll('v-deep', `data-v-${cid}`)
        .replaceAll('>>>', `[data-v-${cid}]`)
        ;
}

export function getVdeep(cid) {
    return `data-v-${cid}`;
}



