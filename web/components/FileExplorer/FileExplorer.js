import { h } from 'vue';
import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElButton, ElSelect, ElOption, ElLoading, ElMessage, ElMessageBox, ElDialog, ElInput } from 'element-plus';
import { LoadCSS } from '../../assets/js/ResourceLoader.js';


const componentId = '71fe886e983243d6b23a880127be76f1';

const data = {
    data() {
        return {
            loadingInstance: null,
            listdata: [],
            viewType: 'list',
            objectCount: 0,
            filterText: '',
            selectedColumns: [
                tr('ui.string:filename'),
            ],
            
        }
    },

    components: {
        ElButton, ElSelect, ElOption, ElDialog, ElInput,
    },

    props: {
        server: Object,
        path: String,
    },

    methods: {
        update() {
            if (!this.loadingInstance)
                this.loadingInstance = ElLoading.service({ lock: true, fullscreen: false, target: this.$refs.app });
            // console.log('created loading service in FileExplorer:', this.loadingInstance);
            this.$nextTick(async () => {
                this.listdata = await this.loadList();
                if (('ok' in this.listdata && (!this.listdata.ok)) || this.listdata instanceof Error) {
                    if (this.loadingInstance) this.loadingInstance.close();
                    // console.log('closed loading service in FileExplorer');
                    if (this.listdata instanceof Error)
                        ElMessage.error(`Failed to load data: ${this.listdata}`);
                    else
                        ElMessage.error(`Failed to load data: HTTP error ${this.listdata.status}, error text:\n`
                            + await this.listdata.text());
                    return history.back();
                }
                
                this.objectCount = this.listdata.length;
                this.$nextTick(() => this.$refs.lst.update());
                document.title = this.path;
                if (this.loadingInstance) this.loadingInstance.close();
                // console.log('closed loading service in FileExplorer');

            });
        },

        async loadList() {
            const forbiddenKeywords = ['d|.', 'd|..'];
            const url = new URL('/files', this.server.addr);
            url.searchParams.append('path', this.path);
            try {
                const resp = await fetch(url, {
                    method: 'post',
                    headers: { 'x-auth-token': this.server.pswd },
                });
                if (!resp.ok) return resp;
                return (await resp.text()).split('\n').filter(el => el.length > 2 && (!forbiddenKeywords.includes(el)));
            }
            catch (error) { return error };
        },

        renderList() {
            const r = [];
            if (!this.listdata || !Array.isArray(this.listdata)) return [];
            for (let i of this.listdata) {
                if (i.length < 3) continue;
                const a = i.split('|');
                const b = [{}, a[1]];
                if (a[0] === 'd') {
                    b[0].html = `<span class="icon is-folder"></span>`;
                    b[0].type = 'd';
                }
                else if (a[0] === 'f') {
                    b[0].html = `<span class="icon is-file"></span>`;
                    b[0].type = 'f';
                }
                else {
                    b[0] = a[0];
                }
                b[0] && (b[0]._srv = this.server.addr, b[0]._pswd = this.server.pswd, b[0]._path = this.path);
                r.push(b);
            }
            return r;
        },

        doFilter: debounce(async function () {
            const text = this.filterText;
            if (!text) {
                this.objectCount = this.listdata.length;
                return this.$refs.lst.update();
            }
            this.objectCount = await this.$refs.lst.filter(el => {
                if (!el) return false;
                if (Array.isArray(el)) return el[1]?.includes?.(text);
                if (el.includes) return el.includes(text);
                return false;
            });
        }, 500),

        async openFile() {
            const selection = this.$refs.lst.selection;
            if (selection.size < 1) {
                ElMessage.error(tr("ui.string:objectNotSelected"));
            }
            if (selection.size > 5) try {
                await ElMessageBox.confirm(tr('ui.string:confirmMultipleFileOpen')
                    .replace('$1', selection.size), 'Open Files', {
                    confirmButtonText: tr('dialog.ok'),
                    cancelButtonText: tr('dialog.cancel'),
                    type: 'info'
                });
            } catch { return; }

            let item_ = selection.keys(), item, isFirst = true, val;
            let currentPath = String(this.path);
            if (!(currentPath.endsWith("/") || currentPath.endsWith("\\"))) currentPath += "/";
            let __result = null;
            let el_data = this.listdata;
            if (!el_data) {
                return;
            }
            if (this.$refs.lst.getFilter())
                el_data = this.listdata.filter(this.$refs.lst.getFilter());

            while ((item = item_.next()) && !item.done) {
                val = el_data?.[item.value];
                if (!val) continue;
                if (!(val.startsWith('f|') || val.startsWith('d|'))) {
                    continue; // 未知项目
                }
                const isDir = val.startsWith('d|');
                val = val.split('|')[1];
                const hash = computeHash.call(this, val, currentPath, isDir);
                if (!hash) continue;

                if (isFirst) {
                    isFirst = false;
                    __result = hash;
                } else {
                    window.open(hash, '_blank');
                }
            }

            if (__result) {
                location.hash = __result;
            }
        },

        customDragData(i) {
            return ['application/x-web-file-explorer-item', JSON.stringify(this.$refs.lst.$data[i])];
        },
        customCheckDrag(types) {
            for (let i of types) {
                if (i === 'application/x-web-file-explorer-item') return true;
                if (i === 'Files') return { dropEffect: 'copy' };
            }
            return false;
        },

        async handleObjectDropping(ev) {
            const dataTransfer = ev.dataTransfer;
            let targetElem;
            for (let i of ev.composedPath()) {
                if (i?.tagName?.toLowerCase() === 'v-list-row' || i?.tagName?.toLowerCase() === 'v-list-view') {
                    targetElem = i;
                    break;
                }
            }
            if (!targetElem) return;
            let targetdir;
            let target = this.$refs.lst.$data?.[targetElem.dataset.n];
            if (targetElem === this.$refs.lst) {
                targetdir = this.path;
            }
            else if (!target) {
                console.warn('[FileExplorer][Warn] handleObjectDropping:', 'targetElem found but target not found');
                return;
            }
            else {
                targetdir = target[0]._path;
                if (!(targetdir?.endsWith?.('/') || targetdir?.endsWith?.('\\'))) targetdir += '/';
                targetdir += target[1];
            }
            console.log(target, dataTransfer);
            if (dataTransfer.files?.length) {
                const files = dataTransfer.files;
                // 文件上传
                if (!targetdir) return;
                ElMessageBox({
                    title: 'File Operation',
                    message: h('div', null, [
                        h('span', null, tr('ui.fo.confirm/upload').replaceAll('$1', dataTransfer.files.length)),
                        h('textarea', { rows: 3, readonly: true, style: 'width:100%;box-sizing:border-box;' }, targetdir),
                    ]),
                    showCancelButton: true,
                    confirmButtonText: tr('dialog.ok'),
                    cancelButtonText: tr('dialog.cancel'),

                }).then(() => {
                    for (let i of files)
                    console.log(i)

                }).catch(() => { });
                return;
            }

            // 处理内部文件操作
            let lastDropEffect = this.$refs.lst.lastDropEffect;
            let data = dataTransfer.getData('application/x-web-file-explorer-item');
            try { data = JSON.parse(data) } catch { return console.warn('Failed to parse application data') };
            console.log(lastDropEffect, data);
            let src, dist = targetdir;
            try { src = data[0]._path + data[1]; }
            catch { return console.warn('Failed to resolve application data') };
            
            const get = async (file, srv, pswd) => {
                const url = new URL('/isFileOrDirectory', srv);
                url.searchParams.set('name', file);
                const result = await fetch(url, { headers: { 'x-auth-token': pswd } });
                if (!result.ok) throw null;
                const text = await result.text();
                return text;
            }
            try {
                const r1 = await get(dist, this.server.addr, this.server.pswd);
                if (r1 !== '-1') {
                    return ElMessage.error(tr((r1 === '0') ? 'ui.fo.error/folderNotFound' : 'ui.fo.error/cantPutFileInFile'));
                }
                const r2 = await get(src, data[0]._srv, data[0]._pswd);
                if (r2 === '0') {
                    return ElMessage.error(tr('ui.fo.error/fileNotFound'));
                }
            }
            catch {
                return ElMessage.error(tr('ui.fo.error/cantLoadDataFromRemote'));
            }

            if (data[0]._srv !== this.server.addr) try {
                // 确认跨域文件传输
                await ElMessageBox({
                    title: tr("ui.fo.confirm/crossOriginFileTransfer"),
                    message: h('div', null, [
                        h('span', { style: 'word-break:break-word' }, tr("ui.fo.confirm/crossOriginFileTransferText")
                            .replaceAll('$1', data[0]._srv).replaceAll('$2', this.server.addr)),
                    ]),
                    showCancelButton: true,
                    confirmButtonText: tr('dialog.ok'),
                    cancelButtonText: tr('dialog.cancel'),

                });
            } catch { return; }

            ElMessageBox({
                title: 'File Operation',
                message: h('div', null, [
                    h('span', { style: 'word-break:break-word' }, tr('ui.fo.confirm/' + lastDropEffect)
                        .replaceAll('$1', src).replaceAll('$2', dist)),
                ]),
                showCancelButton: true,
                confirmButtonText: tr('dialog.ok'),
                cancelButtonText: tr('dialog.cancel'),

            }).then(() => {
                for (let i of files)
                    console.log(i)

            }).catch(() => { });
        }


    },

    computed: {
        objectCountStr() {
            return splitNumber(this.objectCount) + ` object${this.objectCount > 1 ? 's' : ''}`;
        },
    },

    mounted() {
        this.update();

        this.$nextTick(() => {
            LoadCSS(`
            .icon {
                display: inline-block;
                width: 1em;
                height: 1em;
                background-position: center;
                background-repeat: no-repeat;
                background-size: 1em;
                margin-right: 5px;
            }
            .icon.is-file {
                background-image: url(assets/img/shell/file.png);
            }
            .icon.is-folder {
                background-image: url(assets/img/shell/folder.png);
            }
            `, this.$refs.lst.shadowRoot);
        });
    },
    
    watch: {
        path() {
            this.$nextTick(() => this.update());
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


function splitNumber(num) {
    if (isNaN(num) || Math.abs(num) < 1000) return num;
    return num.toString().replace(/\d+/, function (n) {
        return n.replace(/(\d)(?=(\d{3})+$)/g, a => a + ',');
    });
}


function debounce(fn, delay, thisArg = globalThis) {
    let timeId = null;
    return function () {
        const outerThis = this;
        if (timeId) clearTimeout(timeId);
        timeId = setTimeout(function (args) {
            if (thisArg === globalThis && outerThis !== globalThis)
                return fn.apply(outerThis, args);
            return fn.apply(thisArg, args);
        }, delay, arguments);
        return timeId;
    };
}

function computeHash(item, currentPath, isFolder = false) {
    try { return '#/s/' + btoa(this.server.addr) + '/' + currentPath + encodeURIComponent(item) + (isFolder ? '/' : ''); }
    catch { return null }
};




