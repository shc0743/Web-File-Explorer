import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { db_name } from '@/assets/app/userdata.js';
import { ElMessage, ElMessageBox } from 'element-plus';
import TextEdit from '../TextEdit/TextEdit.js';


const componentId = '1158e99bef9b48dea5973d438178b35d';

const data = {
    data() {
        return {
            srvBuffer: [],
            showDeleteConfirm: false,
            pendingDeleteInfo: { addr: '' },
            backupui: false,
            backupfiledownloadurl: '',
            backupfiledownloadname: '',
            backuprunning: false,
        }
    },

    components: {
        TextEdit,
    },

    props: ['servers'],

    emits: [
        'toggleServer',
    ],

    methods: {
        btoa(arg1) {
            try { return globalThis.btoa(arg1) }
            catch { return `[Failed to encode data]` }
        },
        UriEncode(data) {
            try {
                return new URL(data).href;
            }
            catch { return `Cannot resolve URL` }
        },

        toggleServer(ev) {
            this.$emit('toggleServer', ev.target.dataset.addr || ev.target.parentElement.dataset.addr)
        },
        editServer() {
            ElMessage(tr("ui.string:clickTextToEdit"));
        },
        addServer() {
            location.hash = '#/login/'
        },

        deleteServer(ev) {
            this.showDeleteConfirm = true;
            this.pendingDeleteInfo.addr = ev.target.dataset.addr || ev.target.parentElement.dataset.addr;
        },
        async confirmDelete() {
            if (null == getServerIndexByAddr(this, this.pendingDeleteInfo.addr)) return;
            await globalThis.userdata.delete('servers', this.pendingDeleteInfo.addr);
            this.showDeleteConfirm = false;
            globalThis.notifyDataUpdate();
            globalThis.loadServers();
        },

        async updateData(id, currentValue, prevValue, customData, updateId) {
            const i = getServerIndexByAddr(this, id);
            if (i == null) return;
            const data = JSON.parse(JSON.stringify(this.servers[i]));
            if (!data) return;
            data[customData] = currentValue;
            await globalThis.userdata.delete('servers', id);
            await globalThis.userdata.put('servers', data);
            updateId();
            globalThis.notifyDataUpdate();
            globalThis.loadServers();
        },

        async bsapi(cmd) {
            if (cmd === 0) {
                this.backuprunning = true;

                try {
                    const json = Object.create(null);

                    const keys = await userdata.getAllKeys('servers');
                    for (const key of keys) {
                        const data = await userdata.get('servers', key);
                        Reflect.set(json, key, data);
                    }

                    const blob = new Blob([JSON.stringify(json)]);
                    this.backupfiledownloadurl = URL.createObjectURL(blob);
                    this.backupfiledownloadname = 'backup-' + ((new Date).toLocaleString()) + '.json';

                }
                catch (error) {
                    ElMessage.error(error);
                }
                finally {
                    this.backuprunning = false;
                }
            }
            else if (cmd === 1) {
                try {
                    if (!await ElMessageBox.confirm(tr('ui.server.backupandrestore.restoreconfirm')
                        , tr('ui.server.backupandrestore.restore'), {
                        confirmButtonText: tr('dialog.ok'),
                        cancelButtonText: tr('dialog.cancel'),
                        type: 'warn'
                    })) return;
                } catch { return; }
                
                try {
                    const file = this.$refs.rstrfile?.files?.[0];
                    if (!file) throw '未选择文件';
                    const text = await file.text()
                    const json = JSON.parse(text);

                    const keys = Reflect.ownKeys(json);
                    for (const key of keys) {
                        await userdata.put('servers', Reflect.get(json, key));
                    }

                    this.backupui = false;
                    ElMessageBox.alert(tr('ui.server.backupandrestore.restored')
                        , tr('ui.server.backupandrestore.restore'), {
                        type: 'success'
                    }).finally(() => location.reload());
                }
                catch (error) {
                    ElMessage.error(error);
                    console.error(error);
                }
            }
            else if (cmd === 2) {
                URL.revokeObjectURL(this.backupfiledownloadurl);
                this.backupfiledownloadurl = '';
            }
            else throw cmd
        },
    },

    mounted() {

    },

    watch: {
        servers: {
            handler() {
                this.srvBuffer.length = 0;
                this.$nextTick(() => this.srvBuffer = JSON.parse(JSON.stringify(this.servers)) );
            },
            immediate: true
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


export function getServerIndexByAddr(thisArg, addr) {
    for (let i = 0; i < thisArg.servers.length; ++i) {
        if (thisArg.servers[i].addr === addr) {
            return i;
        }
    }
    return null;
}


