import { getHTML } from '@/assets/js/browser_side-compiler.js';
import Favlist from '../Favlist/Favlist.js'


const componentId = '5e27aada552c4391ae259fff10206d35';

const data = {
    data() {
        return {

        }
    },

    components: {
        Favlist,
    },

    methods: {
        openHelp() {

        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

