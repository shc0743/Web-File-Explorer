export async function uploadFile({ server, pswd, path, filename: name, override, blob, cb }) {
    if (!(path.endsWith('/') || path.endsWith('\\'))) path += '/';
    const composedPath = (path + name).replaceAll('\\', '/');
    const size = blob.size, chunkSize = 131072;
    let pos = 0;
    let lastStep = 0, step = 0;
    if (size === 0) {
        await send(server, pswd, composedPath, blob, 0, override);
    }
    while (pos < size) {
        const len = pos + Math.min(blob.size - pos, chunkSize);
        const newBlob = blob.slice(pos, len);
        // console.log('Uploading', pos, len, 'of', size, 'data', name, 'blob', newBlob);
        await send(server, pswd, composedPath, newBlob, pos, override);
        pos = len;
        step = pos / size;
        if (step - lastStep > 0.00005) {
            lastStep = step;
            cb && cb(pos / size);
        }
        await new Promise(resolve => queueMicrotask(resolve));
    }
}
export async function uploadFileHandle({ server, pswd, path, filename, override, handle, cb }) {
    const file = await handle.getFile();
    if (!file) throw 'Failed to getFile';
    return await uploadFile({ server, pswd, path, filename, override, blob: file, cb });
}

async function send(s, t, f, d, p, o) {
    const url = new URL('/file', s);
    url.searchParams.set('name', f);
    // console.debug('[Shared Worker]', 'Sending data: size=', d.size, 'data=', d);
    const resp = await fetch(url, {
        method: (o ? 'PATCH' : (p === 0 ? 'PUT' : 'PATCH')),
        headers: {
            'content-type': 'application/octet-stream',
            'x-auth-token': t,
            'x-patch-mode': (p === 0 ? (o ? 'override' : 'no-override') : 'append'),
        },
        body: d,
    });
    if (!resp.ok) {
        throw (`Failed to send data: HTTP code ${resp.status}, response text ${await resp.text()}`)
    }
}

function delay(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
