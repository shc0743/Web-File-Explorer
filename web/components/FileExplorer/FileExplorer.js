import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElButton, ElSelect, ElOption, ElLoading, ElMessage, ElMessageBox, ElInput } from 'element-plus';
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
            
        }
    },

    components: {
        ElButton, ElSelect, ElOption, ElInput,
    },

    props: {
        server: Object,
        path: String,
    },

    methods: {
        update() {
            this.loadingInstance = ElLoading.service({ lock: false, fullscreen: false, target: '#myApp main my-container' });
            this.$nextTick(async () => {
                this.listdata = await this.loadList();
                if (('ok' in this.listdata && (!this.listdata.ok)) || this.listdata instanceof Error) {
                    this.loadingInstance.close();
                    if (this.listdata instanceof Error)
                        ElMessage.error(`Failed to load data: ${this.listdata}`);
                    else
                        ElMessage.error(`Failed to load data: HTTP error ${this.listdata.status}`);
                    return history.back();
                }
                
                this.objectCount = this.listdata.length;
                this.$refs.lst.data = this.renderList.bind(this);
                document.title = this.path;
                this.loadingInstance.close();

            });
        },

        async loadList() {
            const forbiddenKeywords = ['d|.', 'd|..'];
            const url = new URL('/fileList', this.server.addr);
            url.searchParams.append('path', this.path);
            try{
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
            for (let i of this.listdata) {
                if (i.length < 3) continue;
                const a = i.split('|');
                const b = [{}, a[1]];
                if (a[0] === 'd') {
                    b[0].html = `<span class="icon is-folder"></span>`; // TODO: 添加文件夹图标
                }
                else if (a[0] === 'f') {
                    b[0].html = `<span class="icon is-file"></span>`;
                }
                else {
                    b[0] = a[0];
                }
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
                if (!el || !el[1]) return false;
                return el[1].includes(text);
            });
        }, 200),

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
            if (!currentPath.endsWith("/")) currentPath += "/";
            let computeHash = item => {
                try { return '#/s/' + btoa(this.server.addr) + '/' + currentPath + encodeURIComponent(item) + '/'; }
                catch { return null }
            };
            let __result = null;

            while ((item = item_.next()) && !item.done) {
                val = this.listdata[item.value];
                if (!val) continue;
                if (val.startsWith('f|')) {
                    // TODO: 打开文件
                    continue;
                }
                if (!val.startsWith('d|')) {
                    continue; // 未知项目
                }
                val = val.split('|')[1];
                const hash = computeHash(val);
                if (!hash) continue;
                // console.log(hash);

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




