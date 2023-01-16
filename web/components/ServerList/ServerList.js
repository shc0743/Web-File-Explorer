import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElCard, ElButton, ElDescriptions, ElDescriptionsItem } from 'element-plus';


const componentId = '1158e99bef9b48dea5973d438178b35d';

const data = {
    data() {
        return {

        }
    },

    components: {
        ElCard, ElButton, ElDescriptions, ElDescriptionsItem,
    },

    props: ['servers'],

    emits: [
        'toggleServer',
    ],

    methods: {
        btoa: globalThis.btoa.bind(globalThis),

        toggleServer(ev) {
            this.$emit('toggleServer', ev.target.dataset.addr || ev.target.parentElement.dataset.addr)
        },
        editServer(ev) {
            location.hash = '#/servers/manage'
        },
        addServer(ev) {
            location.hash = '#/login/'
        },
        
    },

    mounted() {

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

