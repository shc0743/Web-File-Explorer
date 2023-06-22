import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { LoadCSS } from '../../assets/js/ResourceLoader.js';
import { ElMessage } from 'element-plus';

import ExplorerNavBar from '../FileExplorer/ExplorerNavBar.js';

import { fileinfo, prettyPrintFileSize } from '../../modules/util/fileinfo.js';
import previews from '../FileView/types/p.js';
import { mimeTypes } from '../FileView/types/p.js';

const componentId = 'b65776a7-67d3-43c2-936b-991298b7f948';

const testMedia = document.createElement('video');

const data = {
    data() {
        return {
            isLoading: true,
            loadError: null,
            asideStyle: { width: '200px' },
            asideResizing: false,
            asideResizingYes: false,
            weNeedToSetADepSoThatWeCanUpdateComponentContent: 0,
            dep__cf: 0,
            m__updateLock: false,
            listdata: [],
            playPolicy: 1,
            isPreview: false,
            fileinfo: {},
            autoPreview: false,
            playSpeed: 1,

        }
    },

    props: {
        servers: Object,
    },

    components: {
        ExplorerNavBar,
        
    },

    methods: {
        reloadPage() {
            location.reload();
        },

        aside_onPointerMove(ev) {
            if (this.$data.asideResizingYes) {
                const style = getComputedStyle(ev.target);
                this.$data.asideStyle.width = ev.x - parseInt(style.paddingLeft) - parseInt(style.paddingRight) - ev.target.offsetLeft + 'px';
                return;
            }
            let width = ev.target.getBoundingClientRect().right;
            this.$data.asideResizing = ((width - ev.x) >= 0 && (width - ev.x) < 10);
        },
        aside_onPointerDown(ev) {
            if (!this.$data.asideResizing) {
                let width = ev.target.getBoundingClientRect().right;
                this.$data.asideResizing = ((width - ev.x) >= 0 && (width - ev.x) < 10);
            }
            if (!ev.isPrimary || !this.$data.asideResizing) return;
            ev.target.setPointerCapture(ev.pointerId);
            this.$data.asideResizingYes = true;
        },
        aside_onPointerUp(ev) {
            if (!ev.isPrimary || !this.$data.asideResizingYes) return;
            this.$data.asideResizingYes = false;
        },

        onBeforeSelChange(ev) {
            if (this.isLoading) return;
            // ev.preventDefault();
        },
        onSelChange(ev) {
            if (this.isLoading) return;
            
            this.invoke_open();
        },

        navbar_open(path) {
            const url = new URL((location.hash || '').substring(1), location.href);
            url.searchParams.set('path', path);
            history.replaceState({}, '', '#' + url.pathname + url.search);
            this.dep__cf = (new Date()).getTime()
            queueMicrotask(() => this.update());

        },


        getVlistData() {
            if (this.isLoading) return ('\u2060,'.repeat(5) + "// Please wait a bit.,// We're trying our,// best to load data!,\u2060,Current Progress:," + this.isLoading).split(',');
            const r = [];
            // 缓存循环中用到的数据（性能分析器显示调用了很多很多！次 get）
            const addr = this.server.addr, pswd = this.server.pswd, path = this.path;
            if (!this.listdata || !Array.isArray(this.listdata)) return [];
            for (let i of this.listdata) {
                if (Array.isArray(i)) { r.push(i); continue }
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
                b[0] && (b[0]._srv = addr, b[0]._pswd = pswd, b[0]._path = path);
                r.push(b);
            }
            return r;
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
                return (await resp.text())
                    .split('\n')
                    .filter(el => el.length > 2 && (!forbiddenKeywords.includes(el)))
            }
            catch (error) { return error };
        },
        async update() {
            if (this.m__updateLock) return;
            this.m__updateLock = true;
            this.loadError = null;
            this.weNeedToSetADepSoThatWeCanUpdateComponentContent = (new Date()).getTime();

            this.isLoading = 'Preparing for request';
            queueMicrotask(async () => {
                this.isLoading = 'Sending Request to Remote Server';
                this.listdata = await this.loadList();
                this.isLoading = 'Parsing Response';
                if (('ok' in this.listdata && (!this.listdata.ok)) || this.listdata instanceof Error) {
                    if (this.listdata instanceof Error)
                        this.loadError = (`Failed to load data: ${this.listdata}`);
                    else
                        this.loadError = (`Failed to load data: HTTP error ${this.listdata.status}, error text:\n`
                            + await this.listdata.text());
                    this.m__updateLock = this.isLoading = false;
                    return;
                }
                this.listdata.splice(0, 0, [{ html: '<span hidden>/</span>Reload List', action: 'reload' }]);

                this.isLoading = 'Processing';

                let apptitle = this.path.replaceAll('\\', '/');
                const noFullpath = await userdata.get('config', 'explorer.noFullpath');
                if (noFullpath === true) {
                    if (apptitle.endsWith('/')) apptitle = apptitle.substring(0, apptitle.length - 1);
                    apptitle = apptitle.substring(apptitle.lastIndexOf('/') + 1);
                }
                globalThis.appInstance_.instance.apptitle = apptitle;
                this.$nextTick(() => {
                    this.m__updateLock = false;
                    this.isLoading = false;

                    const url = new URL((location.hash || '').substring(1), location.href);
                    const newHash = decodeURIComponent(url.hash || '').substring(1);
                    if (newHash) this.$nextTick(() => this.$nextTick(() => {
                        for (let I = 0, L = this.listdata.length; I < L; ++I) {
                            const i = this.listdata[I];
                            if (i?.substring?.(2) === newHash) this.$refs.lst.selection = I;
                        }
                    }));
                });
            });
        },

        async invoke_open(isHard = false) {
            const selection = this.$refs.lst.selection;
            if (selection.size < 1) {
                const url = new URL((location.hash || '').substring(1), location.href);
                history.replaceState({}, '', '#' + url.pathname + url.search);
                this.dep__cf = (new Date()).getTime();
                return;
            }

            let item_ = selection.keys(), item, val;
            let currentPath = String(this.path);
            if (!(currentPath.endsWith("/") || currentPath.endsWith("\\"))) currentPath += "/";
            let __result = null, needUpdate = false;
            let el_data = this.listdata;
            if (!el_data) { return }
            if (this.$refs.lst.getFilter()) el_data = this.listdata.filter(this.$refs.lst.getFilter());


            const url = new URL((location.hash || '').substring(1), location.href);
            function computeHash(item, currentPath, isFolder = false) {
                try {
                    let u = new URL(url);
                    isFolder ? (u.searchParams.set('path', currentPath + item + '/'), (u.hash = '')) : (u.hash = '#' + item);
                    return '#' + u.pathname + u.search + u.hash
                }
                catch { return null }
            };
            while ((item = item_.next()) && !item.done) {
                val = el_data?.[item.value];
                if (!val) continue;
                if (Array.isArray(val)) {
                    if (val[0]?.action === 'reload') queueMicrotask(() => this.update());
                    continue;
                }
                if (!(val.startsWith('f|') || val.startsWith('d|'))) {
                    continue; // 未知项目
                }
                const isDir = val.startsWith('d|');
                val = val.substring(2);
                const hash = computeHash.call(this, val, currentPath, isDir);
                if (!hash) continue;

                __result = hash; if (!needUpdate) needUpdate = isDir;
            }

            if (__result && !(isHard === false && needUpdate)) {
                (history.replaceState({}, '', __result));
                this.dep__cf = (new Date()).getTime();
                if (needUpdate) queueMicrotask(() => this.update());
            }
        },

        do_preview() {
            this.isPreview = true;
            this.$nextTick(() => {
                queueMicrotask(() => {
                    if (!this.$refs.previewArea) return console.warn('Preview Area not found');
                    for (const el of this.$refs.previewArea.children)
                        el.remove();
                    this.fileinfo = fileinfo(this.current_file);
                    previews[String(this.fileinfo.ext).toLowerCase()]?.call(this, this.$refs.previewArea, this.current_file);
                    (this.$refs.previewArea?.querySelector('video,audio') || {}).playbackRate = this.playSpeed;
                })
            })
        },
        checkAutoPrev() {
            this.$nextTick(() => this.$nextTick(() => queueMicrotask(() => this.$nextTick(async () => {
                if (this.$refs.previewArea)
                    for (const el of this.$refs.previewArea.children) el.remove();
                if (((await userdata.get('config', 'file.preview.auto') == true)) && this.current_file && !this.isLoading) this.$nextTick(() => (this.isPreview = true, setTimeout(() => this.$nextTick(() => {
                    this.do_preview();
                }))));
            }))));

        },

        processPlayPolicyOptChanged(ev) {
            const el = ev.target;
            el.disabled = true;
            el.checked = false;
            setTimeout(() => {
                el.disabled = el.checked = false;
            }, 500);
        },

    },

    computed: {
        server() {
            try {
                void (this.weNeedToSetADepSoThatWeCanUpdateComponentContent);
                const url = new URL((location.hash || '').substring(1), location.href);
                const srv = atob(url.searchParams.get('srv'));
                for (const i of this.servers) {
                    if (i.addr === srv) return i;
                }
                return null
            }
            catch { return null };
        },
        path() {
            try {
                void (this.weNeedToSetADepSoThatWeCanUpdateComponentContent);
                this.dep__cf = (new Date()).getTime();
                const url = new URL((location.hash || '').substring(1), location.href);
                return url.searchParams.get('path') || '/';
            }
            catch { return '/dev/null' };
        },
        current_file() {
            try {
                void (this.dep__cf);
                const url = new URL((location.hash || '').substring(1), location.href);
                const cf = decodeURIComponent(url.hash.substring?.(1));
                return cf || null;
            }
            catch { return null };
        },
    },

    watch: {
        isLoading(val) {
            this.$refs?.lst?.update();
            if (!val) {
                this.$nextTick(() => this.checkAutoPrev());
            }
        },
        path() {
            this.dep__cf = (new Date()).getTime()
        },
        weNeedToSetADepSoThatWeCanUpdateComponentContent() {
            this.isPreview = false;
        },
        dep__cf: {
            handler() {
                this.isPreview = false;
                this.$nextTick(() => this.checkAutoPrev());
            },
            immediate: true
        },
        playSpeed(newValue, oldValue) {
            try {
                testMedia.playbackRate = newValue;
                userdata.put('config', newValue, 'file.preview.media.playbackRate');

                (this.$refs.previewArea?.querySelector('video,audio') || {}).playbackRate = newValue;
            } catch {
                this.playSpeed = oldValue;
                userdata.put('config', 1, 'file.preview.media.playbackRate');
            }
        },
    },

    async mounted() {
        queueMicrotask(() => this.update());
        globalThis.appInstance_.mp0 = this;

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

        if (await userdata.get('config', 'file.preview.auto') == true) this.autoPreview = true;
        const pbs = await userdata.get('config', 'file.preview.media.playbackRate') || 1;
        if (pbs < 0) pbs = 1;
        this.playSpeed = pbs;
    },

    beforeUnmount() {
        delete globalThis.appInstance_.mp0;
    },
    

    template: await getHTML(import.meta.url, componentId),

};


export default data;

