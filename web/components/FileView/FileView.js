import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import { Download, Edit, MoreFilled, Star, StarFilled } from 'icons-vue';
import TextEdit from '../TextEdit/TextEdit.js';

import { fileinfo, prettyPrintFileSize } from '../../modules/util/fileinfo.js';
import { editable } from './types/f.js';
import previews from './types/p.js';
import { mimeTypes } from './types/p.js';


const componentId = 'e189a9d5f3384a2cb35f248a04a693ab';

const data = {
    data() {
        return {
            type: 'unset',
            errorText: '',
            loadingInstance: null,
            updateLock: false,
            fileIcon: `assets/img/shell/file.png`,
            fileinfo: {},
            filename: '',
            serverSideFileInfo: {},
            isPreview: false,
            preview__data: null,
            moreOptionValue: null,
            moreOptionList: [],
            openWithDialog: false,
            isFav: false,

        }
    },

    components: {
        Download, Edit, MoreFilled, Star, StarFilled,
        TextEdit,
    },

    props: {
        server: Object,
        path: String,
    },

    methods: {
        reset() {
            this.type = 'unset';
            this.errorText = '';
            // this.loadingInstance = null;
            this.updateLock = false;
            this.fileIcon = `assets/img/shell/file.png`;
            this.fileinfo = {};
            this.filename = '';
            this.serverSideFileInfo = {};
            this.isPreview = false;
            this.moreOptionValue = null;
            this.openWithDialog = false;
        },

        update() {
            if (this.updateLock) return;
            if (!this.path) return;
            this.updateLock = true;
            this.reset();
            if (!this.loadingInstance) {
                this.loadingInstance = ElLoading.service({ lock: false, fullscreen: false, target: this.$refs.root });
            }

            globalThis.appInstance_.instance.apptitle = '⏳ Loading…';

            (async function () {
                // if (this.preview__data && globalThis.flvjs) {
                //     if (this.preview__data.TAG === "FlvPlayer") {
                //         this.preview__data.destroy();
                //     }
                // }

                const infourl = new URL('/fileinfo', this.server.addr);
                infourl.searchParams.set('name', this.path);
                
                const resp = await fetch(infourl, { headers: { 'x-auth-token': this.server.pswd } });
                if (!resp.ok) throw new Error(`HTTP Error: ${resp.status} (${resp.statusText})`);
                const r = await resp.json();
                if (!r.success) throw new Error(`Failed: ${r.errorText}`);
                this.serverSideFileInfo = r;

                this.fileinfo = fileinfo(this.path);
                this.filename = this.fileinfo.name;

                if (previews[String(this.fileinfo.ext).toLowerCase()]) {
                    this.type = 'preview';
                } else {
                    this.type = 'binary';
                }

                this.isFav = false;
                let srv_and_path = this.server.addr + '|' + this.path;
                srv_and_path = srv_and_path.replaceAll('\\', '/');
                const favindex = await userdata.get('favlist', srv_and_path);
                if (favindex != null) {
                    this.isFav = true;
                }

                let apptitle = this.path.replaceAll('\\', '/');
                const noFullpath = await userdata.get('config', 'explorer.noFullpath');
                if (noFullpath === true) {
                    apptitle = apptitle.substring(apptitle.lastIndexOf('/') + 1);
                }
                globalThis.appInstance_.instance.apptitle = apptitle;
                if (this.loadingInstance) {
                    this.loadingInstance.close();
                    this.loadingInstance = null;
                }
                this.updateLock = false;

                if (await userdata.get('config', 'file.preview.auto') === true)
                this.$nextTick(() => {
                    this.preview();
                })
                
            }).call(this)
            .catch(error => {
                console.error(error);
                globalThis.appInstance_.instance.apptitle = '[Error] ' + error;
                this.errorText = String(error);
                if (this.loadingInstance) {
                    this.loadingInstance.close();
                    this.loadingInstance = null;
                }
                this.updateLock = false;
            });
        },

        downloadFile() {
            const url = new URL('/dl', this.server.addr);
            url.searchParams.set('t', this.server.pswd);
            url.searchParams.set('f', this.path);
            url.searchParams.set('a', this.fileinfo.name);
            window.open(url, '_self');
        },

        preview() {
            if (this.type !== 'preview') return;
            this.isPreview = true;
            this.$nextTick(() => {
                queueMicrotask(() => {
                    if (!this.$refs.previewArea) return;
                    for (const el of this.$refs.previewArea.children)
                        el.remove();
                    previews[String(this.fileinfo.ext).toLowerCase()]?.call(this, this.$refs.previewArea);
                })
            })
        },

        async openWithData() {
            const result = [];
            const el = document.createElement('div');
            el.setAttribute('style', 'display: flex; flex-direction: column;');
            let lineHeight = 0;
            for (const i in previews) {
                el.innerHTML = `
                <div></div>
                <div style="font-size: smaller; color: gray;"></div>
                `;
                el.children[0].innerText = previews[i].data_description;
                el.children[1].innerText = `*.${i}`;
                if (!lineHeight) {
                    (document.body || document.documentElement).append(el);
                    lineHeight = el.clientHeight;
                    el.remove();
                }
                result.push([
                    { 'html': el.outerHTML }
                ]);
            }
            this.$refs.openWithList.setLineHeight(lineHeight);
            return result;
        },

        doOpenWith() {
            const selection = this.$refs.openWithList.selection;
            if (!selection.size) return;
            const p = previews[Reflect.ownKeys(previews)[selection.toArray()[0]]];
            if (!p) return;
            this.openWithDialog = false;
            this.type = 'preview';
            this.isPreview = true;
            this.$nextTick(() => {
                for (const el of this.$refs.previewArea.children)
                    el.remove();
                p.call(this, this.$refs.previewArea);
            });
        },

        openDirectly() {
            const mime = mimeTypes[this.fileinfo.ext] || mimeTypes.default;
            const url = new URL('/dl', this.server.addr);
            url.searchParams.set('t', this.server.pswd);
            url.searchParams.set('f', this.path);
            url.searchParams.set('m', mime);
            window.open(url);
        },

        async modifyFav() {
            try {
                let srv_and_path = this.server.addr + '|' + this.path;
                srv_and_path = srv_and_path.replaceAll('\\', '/');
                if (this.isFav) {
                    await userdata.delete('favlist', srv_and_path);
                    ElMessage.success(tr('ui.favlist.delete.success'));
                } else {
                    let name = srv_and_path.substring(srv_and_path.lastIndexOf('/') + 1);
                    const obj = {
                        fullpathname: srv_and_path,
                        srv: this.server.addr,
                        pathname: this.path,
                        name: name,
                        type: 'file',
                    };
                    await userdata.put('favlist', obj);
                    ElMessage.success(tr('ui.favlist.add.success'));
                }
                this.isFav = !this.isFav;
            }
            catch (error) { ElMessage.error(error) };
        },

        async rename() {
            const dest = this.fileinfo.path + '/' + this.filename;
            if (this.path === dest) return;
            const loading = ElLoading.service({ lock: false, fullscreen: false, target: this.$refs.root });
            try {
                const task = {
                    type: 'move',
                    files: [{
                        server: this.server.addr, pswd: this.server.pswd,
                        src: this.path, dest: dest,
                    }]
                };
                await globalThis.appInstance_.addTask(task, { wait: true });

                let newLoc = '#/s/' + btoa(this.server.addr) + '/' + dest;
                history.replaceState({}, '', newLoc);
                queueMicrotask(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
            }
            catch (error) {
                ElMessage.error(String(error));
                this.filename = this.fileinfo.name;
            }
            finally {
                loading.close();
            }
        },

        deleteSelf() {
            // globalThis.appInstance_.instance.transferPanel_isOpen = true;
            globalThis.appInstance_.addTask({
                type: 'delete',
                files: [{
                    server: this.server.addr,
                    pswd: this.server.pswd,
                    path: this.path,
                }],
            }, { wait: true })
            .then(function () {
                let hash = location.hash.replaceAll('\\', '/').split('/');
                hash.pop();
                hash = hash.join('/') + '/';
                history.replaceState({}, '', hash);
                queueMicrotask(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
            }).catch(error => ElMessage.error(String(error)));
        },

        async remoteExecute() {
            try {
                const url = new URL('/sys/ShellExecute', this.server.addr);
                const fd = new URLSearchParams();
                fd.append('appName', this.path);
                fd.append('verb', 'open');
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-auth-token': this.server.pswd },
                    body: fd.toString()
                });
                if (!resp.ok) throw 'HTTP ERROR ' + resp.status + " : " + await resp.text();
                ElMessage.success('');
            } catch (error) {
                ElMessage.error(String(error));
            }
        },

        toHumanReadableSize(size) {
            return prettyPrintFileSize(size);
        },

        getFileNameEditor() {
            return this.$refs.fileNameEditor1 || this.$refs.fileNameEditor2;
        },
        
    },

    watch: {
        async moreOptionValue() {
            if (null == this.moreOptionValue) return;
            const op = this.moreOptionValue;
            this.$nextTick(() => { this.moreOptionValue = null });

            this.opts[op]?.cb?.call?.(this);
        },
    },

    async mounted() {
        const { opts } = await import('./opts.js');
        this.opts = opts;
        for (const i in opts) this.moreOptionList[i] = opts[i];
        globalThis.appInstance_.fileView = this;
        globalThis.appInstance_.showPropertiesDialog = () =>
            (!this.$refs.fileprop?.open) && this.$refs.fileprop?.showModal();
    },
    beforeUnmount() {
        delete globalThis.appInstance_.showPropertiesDialog;
        delete globalThis.appInstance_.fileView;
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

