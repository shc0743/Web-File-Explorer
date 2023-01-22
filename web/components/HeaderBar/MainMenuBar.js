import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElButton } from 'element-plus';


const componentId = '8fff5eae4e084274bb00e129a2400994';

const data = {
    data() {
        return {
            items: [
                { text: "File" },
                { text: "Edit" },
                { text: "View" },
                { text: "Window" },
                { text: "Help" },
            ],
        }
    },

    components: {
        ElButton,
    },

    methods: {
        
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

