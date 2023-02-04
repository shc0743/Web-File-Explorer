import { getHTML } from '@/assets/js/browser_side-compiler.js';
import menucontent from './menucontent.js';
import { ElMessageBox, ElMessage } from 'element-plus';
import { h } from 'vue';


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
                if (t === i.text) {
                    let cache = i.__cb_cache_value__;
                    if (!cache) {
                        cache = i.__cb_cache_value__ = i.cb.call(this, CreatePopupMenu());
                    }
                    return TrackPopupMenu(cache, ev.x, ev.y);
                }
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
            }, { wait: true })
            .then(() => {
                globalThis.appInstance_.explorer?.update();
            }).catch(error=>ElMessage.error(error));
        },
        newdir(srv, pw, path, name) {
            if (!path.endsWith('/')) path += '/';
            globalThis.appInstance_.addTask({
                type: 'newdir',
                server: srv,
                pswd: pw,
                pathname: path + name,
            }, { wait: true })
            .then(() => {
                globalThis.appInstance_.explorer?.update();
            }).catch(error=>ElMessage.error(error));
        },
        renameFile() {
            globalThis.appInstance_.explorer?.rename({key:'F2'});
        },
    },

    mounted() {
        globalThis.appInstance_.mainMenuBar = this;
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

