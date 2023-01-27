import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { BindMove } from '@/assets/js/BindMove.js';


const componentId = 'bf93f0c125e24957b119d22efd666b5d';

const data = {
    data() {
        return {

        }
    },

    props: {
        isOpen: Boolean,
        transferList: Array,
    },

    emits: ['closePanel'],

    components: {

    },

    methods: {
        bm() {
            return BindMove.apply(this, arguments);
        },
    },

    watch: {
        isOpen() {
            this.isOpen ? this.$refs.dlg.showModal() : this.$refs.dlg.close();
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

