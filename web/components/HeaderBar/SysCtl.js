import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { Close } from 'icons-vue';


const componentId = '83a9370c1ac645308fd21abf57a4afd4';

const data = {
    data() {
        return {
            
        }
    },

    components: {
        Close,

    },

    emits: ['closeapp'],

    methods: {
        closeapp() {
            this.$emit('closeapp');
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

