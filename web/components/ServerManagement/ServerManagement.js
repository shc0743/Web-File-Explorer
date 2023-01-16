import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElDialog, ElButton } from 'element-plus';


const componentId = '52c3b2bec9b7416e993b80066df6c6fd';

const data = {
    data() {
        return {
            servers: this.serversProp,
            confirmDeleteUiOpen: false,
            addrToDelete_: -1,
            nameToDelete_: '',
        }
    },

    props: {
        serversProp: Array,
        // servers: Array,
    },

    emits: [
        'updatedata',
    ],

    components: {
        ElDialog,
        ElButton,
    },

    methods: {
        async updateServer() {
            // await globalThis.loadServers();
            // this.$data.servers = this.serversProp;
            // this.$emit('serverDataUpdated');
            this.$nextTick(() => this.$forceUpdate());
        },

        confirmDeleteServer(ev, yes = false) {
            if (yes) {
                const srv = getServerIndexByAddr(this, this.$data.addrToDelete_);
                if (!srv) return console.warn('<ServerManagement>', 'Server not found:', this.$data.addrToDelete_);
                this.$data.servers[srv].name = '[Deleted Server]';
                this.$nextTick(() => {
                    // await globalThis.userdata.delete('servers', this.$data.addrToDelete_);                    
                    this.$emit('updatedata', 'delete', this.$data.addrToDelete_);
                    
                    this.$nextTick(() => { delete this.$data.servers[srv]; this.updateServer() })
                });
                return;
            }
            const addr = ev.target.dataset.addr;
            const srv = getServerIndexByAddr(this, addr);
            if (!srv) return console.warn('<ServerManagement>', 'Server not found:', addr);
            this.$data.addrToDelete_ = addr;
            this.$data.nameToDelete_ = this.$data.servers[srv].name;
            this.$data.confirmDeleteUiOpen = true;
        },
        enterNameEditMode(ev) {
            const addr = ev.target.dataset.addr;
            const srv = getServerIndexByAddr(this, addr);
            if (!srv) return console.warn('<ServerManagement>', 'Server not found:', addr);
            this.$data.servers[srv]._name = this.$data.servers[srv].name;
            this.$data.servers[srv].nameEditMode = true;
        },
        exitNameEditMode(ev, save) {
            const addr = ev.target.dataset.addr;
            const srv = getServerIndexByAddr(this, addr);
            if (!srv) return console.warn('<ServerManagement>', 'Server not found:', addr);
            delete this.$data.servers[srv].nameEditMode;
            if (save) this.$nextTick(async () => {
                //console.log(globalThis.temp2 = this.$data.servers[srv])
                delete this.$data.servers[srv]._name;
                // await globalThis.userdata.delete('servers', addr);
                // await globalThis.userdata.put('servers', JSON.parse(JSON.stringify(this.$data.servers[srv])));
                this.$emit('updatedata', 'modify', addr, JSON.parse(JSON.stringify(this.$data.servers[srv])));
                this.updateServer();
            });
            else {
                this.$data.servers[srv].name = this.$data.servers[srv]._name;
                delete this.$data.servers[srv]._name;
            }
        },

        doModify(ev) {
            let k = (ev.target.dataset.key) || (ev.target.parentElement.dataset.key);
            const addr = (ev.target.dataset.addr) || (ev.target.parentElement.dataset.addr);
            const srv = getServerIndexByAddr(this, addr);
            if (!srv) return console.warn('<ServerManagement>', 'Server not found:', addr);
            if (!this.$data.servers[srv].editMode) this.$data.servers[srv].editMode = {};
            if (this.$data.servers[srv].editMode[k]) return;
            this.$data.servers[srv].editMode[k] = { data: this.$data.servers[srv][k] };
            this.$nextTick(() => document.querySelectorAll(`[data-v-${componentId}] td[data-addr][data-key]`).forEach(el => {
                if (el.dataset.key !== k || el.dataset.addr !== addr) return;
                el.querySelector('input')?.focus();
            }));
        },

        finishModify(ev) {
            ev.target.blur?.call(ev.target);
            let k = ev.target.parentElement.dataset.key;
            const addr = ev.target.parentElement.dataset.addr;
            const srv = getServerIndexByAddr(this, addr);
            if (!srv) return console.warn('<ServerManagement>', 'Server not found:', addr);
            
            if (!this.$data.servers[srv]?.editMode) return;
            const data = this.$data.servers[srv]?.editMode[k]?.data;
            if (undefined === data) return console.warn('<ServerManagement>', 'Data not found:', addr);

            const noSave = this.$data.servers[srv]?.editMode[k]?.noSave;
            delete this.$data.servers[srv].editMode[k];
            if (noSave || !data) return;

            this.$nextTick(async () => {
                this.$data.servers[srv][k] = data;
                const dataNew = JSON.parse(JSON.stringify(this.$data.servers[srv]));
                delete dataNew.editMode;
                    
                // await globalThis.userdata.delete('servers', addr);
                // await globalThis.userdata.put('servers', dataNew);
                this.$emit('updatedata', 'modify', addr, dataNew);
                this.updateServer();
            });
        },

    },

    mounted() {
        
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;


export function getServerIndexByAddr(thisArg, addr) {
    for (let i in thisArg.servers) {
        if (thisArg.servers[i].addr === addr) {
            return i;
        }
    }
    return null;
}


