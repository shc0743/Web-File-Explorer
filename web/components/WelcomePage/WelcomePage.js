import { getHTML } from '../../assets/js/browser_side-compiler.js';


const componentId = '5e27aada552c4391ae259fff10206d35';

const data = {
    data() {
        return {

        }
    },

    methods: {
        openHelp() {

        },
    },

    mounted() {

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

