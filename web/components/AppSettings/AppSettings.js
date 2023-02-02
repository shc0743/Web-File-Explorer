import { getHTML } from '@/assets/js/browser_side-compiler.js';
import SettingsList from './SettingsList.js';


const componentId = 'd4080c23793342e786f2698bf628bacd';

const data = {
    data() {
        return {
            settings_data: {
                all: {},
            },

        }
    },

    components: {
        SettingsList,
    },

    methods: {
        async updateSettings() {
            const keys = await userdata.getAllKeys('config');
            for (const key of keys) {
                if (!(key in this.settings_data.all)) await userdata.delete('config', key);
            }
            for (const i in this.settings_data.all) try {
                await userdata.put('config', this.settings_data.all[i], JSON.parse(JSON.stringify(i)));
            } catch (error) {
                console.warn('Failed to save settings:', error);
            }
        },

    },

    mounted() {
        this.$nextTick(async () => {
            const dd = {};
            const keys = await userdata.getAllKeys('config');
            for (const key of keys) {
                const data = await userdata.get('config', key);
                dd[key] = data;
            }
            this.settings_data.all = dd;
        });
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

