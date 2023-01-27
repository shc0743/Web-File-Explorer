import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage } from 'element-plus';


const componentId = '82f7f8bb83674c67adf19a5d14bf34f6';

const data = {
    data() {
        return {
            
        }
    },

    props: ['servers'],

    components: {
        
    },

    methods: {
        b2a(v) {
            try { return btoa(v) }
            catch { return null }
        },
        addServer() {
            location.hash = '#/login/'
        },
        choseSrv(ev) {
            const addr = ev.target.dataset.addr || ev.target.parentElement.dataset.addr;
            if (!addr) return ElMessage.error('Internal error');
            location.hash = '#/s/' + addr + '/sys/upload/';
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

