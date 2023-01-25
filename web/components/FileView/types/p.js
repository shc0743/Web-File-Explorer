// preview
const data = {};
assoc(data, 'txt,c,cpp,cxx,h,asm,html,js,css,py,pyw,java,go,sh,bat,cmd,vbs', PlainTextPreview);
assoc(data, 'bmp,jpg,jpeg,png,tiff,webp', PicturePreview);
assoc(data, 'mp4,flv', VideoPreview);
assoc(data, 'mp3,wmv', AudioPreview);
export default data;



export function assoc(data, types, handler) {
    types.split(',').forEach(el => data[el] = handler);
}


export async function PlainTextPreview(el) {
    const area = document.createElement('textarea');
    area.setAttribute('style', 'width: 100%; height: 100%; ');
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
    area.setAttribute('style', 'width: 100%; height: 100%;');
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

export function VideoPreview(el) {
    const url = new URL('/dl', this.server.addr);
    url.searchParams.set('t', this.server.pswd);
    url.searchParams.set('f', this.path);
    const area = document.createElement('video');
    area.setAttribute('style', 'width: 100%; height: 100%;');
    area.src = url.href;
    area.controls = true;
    el.append(area);
}

