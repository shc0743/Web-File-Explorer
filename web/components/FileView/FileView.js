import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElButton, ElIcon, ElLoading, ElMessage, ElMessageBox, ElDialog, ElInput, ElTooltip } from 'element-plus';
import { Download, Edit, MoreFilled } from 'icons-vue';
import TextEdit from '../TextEdit/TextEdit.js';

import { fileinfo } from '../../modules/util/fileinfo.js';
import { editable, previewable } from './types/f.js';
import previews from './types/p.js';


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

        }
    },

    components: {
        ElButton, ElIcon, ElDialog, ElInput, ElTooltip,
        Download, Edit, MoreFilled,
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

                const infourl = new URL('/fileinfo', this.server.addr);
                infourl.searchParams.set('name', this.path);
                
                const resp = await fetch(infourl, { headers: { 'x-auth-token': this.server.pswd } });
                if (!resp.ok) throw new Error(`HTTP Error: ${resp.status} (${resp.statusText})`);
                const r = await resp.json();
                if (!r.success) throw new Error(`Failed: ${r.errorText}`);
                this.serverSideFileInfo = r;

                this.fileinfo = fileinfo(this.path);
                this.filename = this.fileinfo.name;

                if (previewable.includes(this.fileinfo.ext)) {
                    this.type = 'preview';
                } else {
                    this.type = 'binary';
                }

                globalThis.appInstance_.instance.apptitle = this.path;
                if (this.loadingInstance) {
                    this.loadingInstance.close();
                    this.loadingInstance = null;
                }
                this.updateLock = false;
                
            }).call(this)
            .catch(error => {
                globalThis.appInstance_.instance.apptitle = '[Error]';
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
            window.open(url);
        },

        preview() {
            this.isPreview = true;
            previews[this.fileinfo.ext]?.call(this, this.$refs.previewArea);
        },
        
    },

    watch: {
        async filename() {
            // if (this.filename === this.fileinfo.name) return;

            // if (!this.loadingInstance) {
            //     this.loadingInstance = ElLoading.service({ lock: false, fullscreen: false, target: this.$refs.root });
            // }
            // this.loadingInstance.text = 'Performing file move';

            // await new Promise(r => setTimeout(r, 5000));

            // if (this.loadingInstance) {
            //     this.loadingInstance.close();
            //     this.loadingInstance = null;
            // }
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

