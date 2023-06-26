// preview
import 'flv.js';
const data = {};
assoc(data, 'txt,log,c,cpp,cxx,cc,h,hpp,asm,htm,html,js,css,py,pyw,java,go,sh,bat,cmd,vbs,ini,inf,ps1,xml,xaml,scss,reg,json,cs,md,php,yaml', PlainTextPreview, "Plain Text Viewer");
assoc(data, 'bmp,jpg,jpeg,png,tiff,webp', PicturePreview, "Picture Viewer");
assoc(data, 'mp3', AudioPreview, "Audio Player");
assoc(data, 'mp4,webm,ogg,mov', VideoPreviewNative, "Video Player (native)");
assoc(data, 'flv,mkv', VideoPreviewFlv, "Video Player (flv.js)");
assoc(data, 'pdf', PdfPreview, "PDF Viewer (native)");
export default data;



export function assoc(data, types, handler, d = handler.name) {
    types.split(',').forEach(el => ( handler.data_description = d, data[el] = handler ));
}


export const mimeTypes = {
    default: 'application/octet-stream',
    'mp4': 'video/mp4',
    'ogg': 'video/ogg',
    'webm': 'video/webm',
    'mov': 'video/mov',
    'flv': 'video/x-flv',
    'mp3': 'audio/mpeg',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'tiff': 'image/tiff',
    'pdf': 'application/pdf',
};

export async function PlainTextPreview(el, _opt_FileName = '', onended = null) {
    const area = document.createElement('textarea');
    area.setAttribute('style', 'width: 100%; height: 100%; box-sizing: border-box;');
    area.value = tr('Loading Preview');
    area.readOnly = true;
    el.append(area);

    const url = new URL('/file', this.server.addr);
    url.searchParams.set('name', this.path + _opt_FileName);
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

export function PicturePreview(el, _opt_FileName = '', onended = null) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path + _opt_FileName);
    const mime = mimeTypes[this.fileinfo.ext?.toLowerCase?.()];
    mime && url.searchParams.set('m', mime);
    const area = document.createElement('img');
    area.setAttribute('style', 'max-width: 100%; max-height: 100%; box-sizing: border-box;');
    area.src = url.href;
    el.append(area);
}


export let audio_or_video__Mutex = null;

function canplayHandler(el, area) {
    const canPlayPromise = new Promise((resolve, reject) => {
        area.addEventListener('error', reject, { once: true });
        area.addEventListener('canplay', resolve, { once: true });
        el.append(area);
    });

    canPlayPromise
    .then(() => globalThis.userdata.get('config', 'file.preview.media.autoplay'))
    .then(value => {
        if (value !== true && value !== false) return userdata.put('config', false, 'file.preview.media.autoplay');
        if (value) area.play();
    })
    .catch(() => { });
    // .catch(console.warn);
}
function rememberVolume(area) {
    let pendingDBrequest = null;
    area.addEventListener('volumechange', () => {
        const f = () => userdata.put('config', area.volume, 'file.preview.media.defaultVolume').finally(() => pendingDBrequest = null);
        if (pendingDBrequest) pendingDBrequest.then(f); else pendingDBrequest = f();
    });
    pendingDBrequest = userdata.get('config', 'file.preview.media.defaultVolume').then(value => {
        if (!isNaN(+value)) area.volume = +value;
    }).finally(() => pendingDBrequest = null);
}
function endedHandler(area, onended) {
    if (onended) area.addEventListener('ended', onended);
}
function checkVideoMutex(area) {
    if (audio_or_video__Mutex && (!audio_or_video__Mutex.paused)) {
        audio_or_video__Mutex.pause();
        audio_or_video__Mutex.innerHTML = '';
        audio_or_video__Mutex.src = '';
        audio_or_video__Mutex.load();
    }
    audio_or_video__Mutex = area;
}


export function AudioPreview(el, _opt_FileName = '', onended = null) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path + _opt_FileName);
    const mime = mimeTypes[this.fileinfo.ext?.toLowerCase?.()];
    mime && url.searchParams.set('m', mime);
    const area = document.createElement('audio');
    area.setAttribute('style', 'width: 100%; height: 100%;');
    area.src = url.href;
    area.controls = true;
    canplayHandler(el, area);
    rememberVolume(area);
    checkVideoMutex(area);
    endedHandler(area, onended);
}

export async function VideoPreviewFlv(el, _opt_FileName = '', onended = null) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path + _opt_FileName);
    const mime = mimeTypes[this.fileinfo.ext?.toLowerCase?.()];
    mime && url.searchParams.set('m', mime);
    const area = document.createElement('video');
    area.setAttribute('style', 'width: 100%; height: 100%;');
    area.controls = true;
    area.playsInline = true;
    area.crossOrigin = 'anonymous';
    el.append(area);

    const NOFLVJS = Symbol('NO Flv.JS');
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

    rememberVolume(area);
    globalThis.userdata.get('config', 'file.preview.media.autoplay').then(value => {
        if (value !== true && value !== false) return userdata.put('config', false, 'file.preview.media.autoplay');
        if (value) this.preview__data.play();
    }).catch(console.warn);

    checkVideoMutex(area);
    endedHandler(area, onended);
}
export function VideoPreviewNative(el, _opt_FileName = '', onended = null) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path + _opt_FileName);
    const mime = mimeTypes[this.fileinfo.ext?.toLowerCase?.()];
    mime && url.searchParams.set('m', mime);
    const area = document.createElement('video');
    area.setAttribute('style', 'width: 100%; height: 100%;');
    area.controls = true;
    area.playsInline = true;
    area.crossOrigin = 'anonymous';
    area.src = url.href;
    canplayHandler(el, area);
    rememberVolume(area);
    checkVideoMutex(area);
    endedHandler(area, onended);
}

export function PdfPreview(el, _opt_FileName = '', onended = null) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path + _opt_FileName);
    url.searchParams.set('m', mimeTypes.pdf);
    const area = document.createElement('iframe');
    area.setAttribute('style', 'width: 100%; height: 100%;');
    if (navigator.pdfViewerEnabled) {
        area.src = url.href;
    } else {
        area.srcdoc = `<h1>Not supported. Please download the PDF.</h1>`;
    }
    el.append(area);
}

