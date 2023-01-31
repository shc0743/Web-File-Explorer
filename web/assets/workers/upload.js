export async function uploadFile(server, pw, path, name, override, blob, cb) {
    if (!(path.endsWith('/') || path.endsWith('\\'))) path += '/';
    const composedPath = (path + name).replaceAll('\\', '/');
    const size = blob.size, chunkSize = 131072;
    let pos = 0;
    let lastStep = 0, step = 0;
    if (size === 0) {
        await send(server, pw, composedPath, blob, 0, override);
    }
    while (pos < size) {
        const len = pos + Math.min(blob.size - pos, chunkSize);
        const newBlob = blob.slice(pos, len);
        // console.log('Uploading', pos, len, 'of', size, 'data', name, 'blob', newBlob);
        await send(server, pw, composedPath, newBlob, pos, override);
        pos = len;
        step = pos / size;
        (step - lastStep > 0.01) && cb && queueMicrotask(() => cb(pos / size));
        lastStep = step;
        await new Promise(resolve => queueMicrotask(resolve));
    }
}
export async function uploadFileHandle(server, pw, path, name, override, handle, cb) {
    const file = await handle.getFile();
    if (!file) throw 'Failed to getFile';
    return await uploadFile(server, pw, path, name, override, file, cb);
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
