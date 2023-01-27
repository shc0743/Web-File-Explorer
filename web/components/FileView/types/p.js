// preview
import 'flv.js';
const data = {};
assoc(data, 'txt,log,c,cpp,cxx,cc,h,hpp,asm,htm,html,js,css,py,pyw,java,go,sh,bat,cmd,vbs,ini,inf,ps1,xml,xaml,scss', PlainTextPreview, "Plain Text Viewer");
assoc(data, 'bmp,jpg,jpeg,png,tiff,webp', PicturePreview, "Picture Viewer");
assoc(data, 'mp4,webm', VideoPreviewNative, "Video Player (native)");
assoc(data, 'flv,mkv', VideoPreviewFlv, "Video Player (flv.js)");
assoc(data, 'mp3,wmv', AudioPreview, "Audio Player");
export default data;



export function assoc(data, types, handler, d = handler.name) {
    types.split(',').forEach(el => ( handler.data_description = d, data[el] = handler ));
}


export async function PlainTextPreview(el) {
    const area = document.createElement('textarea');
    area.setAttribute('style', 'width: 100%; height: 100%; box-sizing: border-box;');
    area.value = tr('Loading Preview');
    area.readOnly = true;
    el.append(area);

    const url = new URL('/file', this.server.addr);
    url.searchParams.set('name', this.path);
    try {
        if (this.serverSideFileInfo.size > 1048576) {
            return area.value = tr('ui.file.preview.fail.toolarge');
        }
        const text = (await (await fetch(url, { headers: { 'x-auth-token': this.server.pswd } })).text());
        area.value = text;
    }
    catch (error) {
        area.value = 'Failed to load preview: ' + error;
    }
}

export function PicturePreview(el) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path);
    const area = document.createElement('img');
    area.setAttribute('style', 'width: 100%; height: 100%; box-sizing: border-box;');
    area.src = url.href;
    el.append(area);
}

export function AudioPreview(el) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path);
    const area = document.createElement('audio');
    area.setAttribute('style', 'width: 100%; height: 100%;');
    area.src = url.href;
    area.controls = true;
    el.append(area);
}

export async function VideoPreviewFlv(el) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path);
    const area = document.createElement('video');
    area.setAttribute('style', 'width: 100%; height: 100%;');
    area.controls = true;
    el.append(area);

    const NOFLVJS = new Object();
    if (NOFLVJS === await (async function () {
        try {
            const resp = await fetch(url, { headers: { range: 'bytes=0-8' } });
            if (!resp.ok) throw resp;
            const data = new Uint8Array(await resp.arrayBuffer());
            if (data[0] !== 0x46 || data[1] !== 0x4C || data[2] !== 0x56 || data[3] !== 0x01) {
                // flv.js doesn't support,  try native
                area.src = url.href;
                return NOFLVJS;
            }
        } catch { return }
    })()) return;

    if (!globalThis.flvjs || !flvjs.isSupported()) {
        return area.outerHTML = `<b>Sorry but your browser doesn't support FLV video playing.</b>`;
    }
    this.preview__data = flvjs.createPlayer({
        type: 'flv',
        url: url
    });
    this.preview__data.attachMediaElement(area);
    this.preview__data.load();
    // this.preview__data.play();
}
export function VideoPreviewNative(el) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path);
    const area = document.createElement('video');
    area.setAttribute('style', 'width: 100%; height: 100%;');
    area.controls = true;
    area.src = url.href;
    el.append(area);
}

