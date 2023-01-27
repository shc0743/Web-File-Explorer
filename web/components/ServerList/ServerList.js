import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { db_name } from '@/assets/app/userdata.js';
import { ElMessage } from 'element-plus';
import TextEdit from '../TextEdit/TextEdit.js';


const componentId = '1158e99bef9b48dea5973d438178b35d';

const data = {
    data() {
        return {
            srvBuffer: [],
            showDeleteConfirm: false,
            pendingDeleteInfo: { addr: '' },
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


