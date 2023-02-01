import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage, ElMessageBox } from 'element-plus';


const componentId = 'b83ecb0b1e574cfab7416dc1f2eeaeee';

const data = {
    data() {
        return {
            myform: {},
            isLoading: false,

        }
    },

    components: {

    },

    props: {
        servers: Object,
    },

    methods: {
        confirmCancel() {
            history.length > 1 ? history.back() : location.hash = '#/';
        },
        exec() {
            if (!(this.myform.remoteSrv &&
                this.myform.type && this.myform.src && this.myform.dest)) {
                return ElMessage.error('Some datas are blank')
            }

            this.isLoading = true;

            let server = null;
            for (const i of this.servers) {
                if (i.addr === this.myform.remoteSrv) {
                    server = i; break;
                }
            }
            if (!server) return ElMessage.error('Server not found');

            globalThis.appInstance_.addTask({
                type: this.myform.type,
                files: [{
                    server: server.addr, pswd: server.pswd,
                    src: this.myform.src, dest: this.myform.dest,
                }]
            });
            globalThis.appInstance_.instance.transferPanel_isOpen = true;

            location.hash = '#/';
        },

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

