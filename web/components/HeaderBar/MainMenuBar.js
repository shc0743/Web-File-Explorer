import { getHTML } from '@/assets/js/browser_side-compiler.js';
import menucontent from './menucontent.js';


const componentId = '8fff5eae4e084274bb00e129a2400994';

const data = {
    data() {
        return {
            items: menucontent,
        }
    },

    components: {

    },

    methods: {
        launchHandler(ev) {
            const t = ev.target.dataset.text || ev.target.parentElement.dataset.text;
            for (const i of this.items) {
                if (t === i.text) return TrackPopupMenu(i.cb.call(this, CreatePopupMenu()), ev.x, ev.y);
            }
        },
        newfile(srv, pw, path, name) {
            globalThis.appInstance_.addTask({
                type: 'upload',
                files: [{
                    server: srv,
                    pswd: pw,
                    path: path,
                    filename: name,
                    blob: new Blob(['']),
                }],
            });
            globalThis.appInstance_.instance.transferPanel_isOpen = true;
        },
        newdir(srv, pw, path, name) {
            if (!path.endsWith('/')) path += '/';
            globalThis.appInstance_.addTask({
                type: 'newdir',
                server: srv,
                pswd: pw,
                pathname: path + name,
            });
            globalThis.appInstance_.instance.transferPanel_isOpen = true;
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

