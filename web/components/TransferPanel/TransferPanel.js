import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { BindMove } from '@/assets/js/BindMove.js';
import { Delete } from 'icons-vue';


const componentId = 'bf93f0c125e24957b119d22efd666b5d';

const data = {
    data() {
        return {
            currentPage: 1,
            pageSize: 20,

        }
    },

    props: {
        isOpen: Boolean,
        transferList: Array,
    },

    emits: ['closePanel'],

    components: {
        Delete,

    },

    methods: {
        bm() {
            return BindMove.apply(this, arguments);
        },
        onCurrentChange() {
            
        },
        deleteTask(index) {
            const uid = this.transferList[index]?.unionId;
            if (!uid) return;
            globalThis.appInstance_.worker.port.postMessage({ type: 'deleteTask', uid });
        },
        clearFinished() {
            const uidsToDelete = new Set();
            for (const i of this.transferList) {
                if (i.isFinished) uidsToDelete.add(i.unionId);
            }
            globalThis.appInstance_.worker.port.postMessage({ type: 'deleteTasks', uids: uidsToDelete });
        },
        clearAll() {
            if (!confirm('Are you sure?')) return;
            const uidsToDelete = new Set();
            for (const i of this.transferList) {
                uidsToDelete.add(i.unionId);
            }
            globalThis.appInstance_.worker.port.postMessage({ type: 'deleteTasks', uids: uidsToDelete });
        }
    },

    watch: {
        isOpen() {
            this.isOpen ? this.$refs.dlg.showModal() : this.$refs.dlg.close();
        },
    },

    computed: {
        transferListWithPager() {
            return this.transferList.slice?.((this.currentPage - 1) * this.pageSize, (this.currentPage) * this.pageSize);
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

