import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElButton, ElTree, ElTreeV2 } from 'element-plus';


const componentId = '6cf07045496c46aa8725ea7975635f84';

const data = {
    data() {
        return {
            props: {
                label: 'name',
                children: 'zones',
            },
            s_tree: true,
        }
    },

    props: {
        servers: Array,
    },

    emits: [
        'toggleServer',
    ],

    components: {
        ElButton, ElTree, ElTreeV2,

    },

    methods: {
        toggleServer(ev) {
            this.$emit('toggleServer', ev.target.dataset.addr)
        },

        goServerList() {
            location.hash = '#/servers/';
        },

        /*onNodeClick() {
            // console.log(arguments)
        },*/

        /*async loadNode(node, resolve) {
            if (node.level === 0) {
                await globalThis.appInstance_.serversLoadRequest;
                this.$nextTick(async () => {
                    // await loadServers();
                    // console.log(globalThis.temp1 = this.servers[0]);
                    resolve(this.servers);
                }); return;
            }
            setTimeout(resolve, 200, ([{ name: '1' }, { name: '2' }]));
        },*/

    },

    mounted() {
        globalThis.appInstance_.sideFileTree = this;
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

