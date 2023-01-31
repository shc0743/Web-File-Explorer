import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElMessage } from 'element-plus';
import { Star, StarFilled } from 'icons-vue';
import TextEdit from '../TextEdit/TextEdit.js';


const componentId = '3dbc0e36f7aa43b5b029899bc31f3159';

const data = {
    data() {
        return {
            items: [],

        }
    },

    components: {
        Star, StarFilled,
        TextEdit,

    },

    methods: {
        openItem(item, inBlank = false) {
            try {
                const hash = '#/s/' + btoa(item.srv) + '/' + item.pathname;
                if (inBlank) window.open(hash);
                else location.hash = hash;
            } catch (error) {
                console.error('Failed to open favlist item: ', error);
            }
        },
        async toggleItem(item) {
            try {
                if ((item.cancelled = !item.cancelled) == true) {
                    await userdata.delete('favlist', item.fullpathname);
                    ElMessage.success(tr('ui.favlist.delete.success'));
                } else {
                    delete item.cancelled;
                    await userdata.put('favlist', JSON.parse(JSON.stringify(item)));
                    ElMessage.success(tr('ui.favlist.readd.success'));
                }
            } catch (error) { ElMessage.error(error) };
        },
        async updateItemName(item) {
            try {
                if (item.cancelled) throw 'deleted';
                await userdata.put('favlist', JSON.parse(JSON.stringify(item)));
            } catch (error) { ElMessage.error(error) };
        },

        setItemDragData(item, ev) {
            const hash = '#/s/' + btoa(item.srv) + '/' + item.pathname;
            const url = new URL(hash, location);
            ev.dataTransfer.setData('text/uri-list', url.href);
        }
        
    },

    mounted() {
        this.$nextTick(async() => {
            const keys = await userdata.getAllKeys('favlist');
            for (const key of keys) {
                const data = await userdata.get('favlist', key);
                this.items.push(Object.assign({ id: key }, data));
            }
        });
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

