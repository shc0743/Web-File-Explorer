import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage } from 'element-plus';
import { Delete } from 'icons-vue';


const componentId = '6c75cc8201454386be32e7a3c32970f6';

const data = {
    data() {
        return {
            uploadForm: {},
            isLoading: false,
            selectedFiles: new Map(),
            selectedHandles: new Map(),
            isDragging: false,
            useNewUploader: false,
            isDropping: false,

        }
    },

    props: {
        server: Object,
        path: { type: String, default: '' },
    },

    components: {
        Delete,
    },

    methods: {
        update() {
            globalThis.appInstance_.instance.apptitle = tr('doctitle$=upload') + tr('document.title');

            this.selectedFiles.clear();
            this.uploadForm.remoteSrv = this.server?.addr;

            if (this.path.startsWith('k=')) {
                let path = this.path.substring(2);
                let k = path.substring(0, path.indexOf('/'));
                path = path.substring(path.indexOf('/') + 1);
                this.uploadForm.remotePath = path;
                this.$nextTick(async() => {
                    const fileList = await userdata.get('uploadCache', k);
                    if (!fileList) {
                        return ElMessage.error('Not found: ' + k);
                    }
                    for (const i of fileList) {
                        this.selectedFiles.set(i.name, i);
                    }
                })
            } else {
                this.uploadForm.remotePath = this.path;
            }

            try { this.uploadForm.remotePath = decodeURIComponent(this.uploadForm.remotePath) } catch { }
        },

        updateFileList() {
            for (const i of this.$refs.localFile.files) {
                this.selectedFiles.set(i.name, i);
            }
            this.$refs.localFile.value = null;
        },

        removeItem(opt) {
            if (opt === true) {
                return this.selectedFiles.clear();
            }
            this.selectedFiles.delete(opt);
        },

        removeHandle(opt) {
            if (opt === true) {
                return this.selectedHandles.clear();
            }
            this.selectedHandles.delete(opt);
        },

        confirmCancel() {
            confirm('Cancel?') && history.back();
        },

        async doUpload() {
            this.isLoading = true;
            const files = [];
            const override = this.uploadForm.override;

            for (let i of this.selectedFiles.values()) {
                files.push({
                    server: this.server.addr,
                    pswd: this.server.pswd,
                    path: this.uploadForm.remotePath,
                    filename: i.name,
                    override: override,
                    blob: new Blob([i]),
                });
            }
            globalThis.appInstance_.addTask({
                type: 'upload',
                files: files,
            });

            globalThis.appInstance_.instance.transferPanel_isOpen = true;
            (history.length) ? (history.back()) : (location.hash = '#/');
        },

        nu_click() {
            window.showOpenFilePicker({
                multiple: true,
            }).then(arr => {
                for (const i of arr) {
                    this.selectedHandles.set(i.name, i);
                }
            }).catch(() => { });
        },
        async nu_drop(ev) {
            this.isDropping = false;
            const dt = ev.dataTransfer;
            const proms = [];
            
            for (const item of dt.items) {
                if (item.kind !== 'file') continue;
                proms.push(item.getAsFileSystemHandle());
            }
            await Promise.all(proms);

            for (const i of proms) {
                const handle = await i;
                if (handle.kind === 'directory') {
                    ElMessage.error(tr('ui.file.upload.err.updir'));
                    continue;
                }
                this.selectedHandles.set(handle.name, handle);
            }

            // console.log(this.selectedHandles);
        },

        async doNewUpload() {
            this.isLoading = true;
            
            const files = [];
            const override = this.uploadForm.override;

            for (let i of this.selectedHandles.values()) {
                files.push({
                    server: this.server.addr,
                    pswd: this.server.pswd,
                    path: this.uploadForm.remotePath,
                    filename: i.name,
                    override: override,
                    handle: i,
                });
            }
            globalThis.appInstance_.addTask({
                type: 'upload',
                files: files,
            });

            globalThis.appInstance_.instance.transferPanel_isOpen = true;
            (history.length) ? (history.back()) : (location.hash = '#/');

        },

        async dirUpload() {
            this.isLoading = true;

            try {
                const dir = await window.showDirectoryPicker();

                // [TODO] some code using dir...
                ElMessage.error('Not Supported yet')

            }
            catch { this.isLoading = false; };
        },
    },

    computed: {
        selected() {
            return this.useNewUploader ? this.selectedHandles : this.selectedFiles;
        },
        selectedFilesInfo() {
            const r = [];
            for (const i of this.selectedFiles.values()) {
                r.push(i.name);
            }
            return r;
        },
        selectedHandlesInfo() {
            const r = [];
            for (const i of this.selectedHandles.values()) {
                r.push(i.name);
            }
            return r;
        },
        fsapiNotSupported() {
            return !(window.showOpenFilePicker && window.showDirectoryPicker)
        },
    },

    mounted() {
        userdata.get('config', 'upload.useNewUploader').then(r => {
            if (r) this.useNewUploader = true;
        })
    },

    watch: {
        useNewUploader() {
            userdata.put('config', this.useNewUploader, 'upload.useNewUploader');
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

