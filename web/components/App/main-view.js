import { getHTML } from '@/assets/js/browser_side-compiler.js';

import FileExplorerComponent from '../FileExplorer/FileExplorer.js';
import WelcomePage from '../WelcomePage/WelcomePage.js';


const componentId = '248f7ae5d91f4a40a10ecd682046e1c4';

const data = {
    data() {
        return {
            currentPage: '',
        }
    },

    components: {
        FileExplorerComponent,
        WelcomePage,
    },

    methods: {

    },

    mounted() {

    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

