import { getHTML } from '@/assets/js/browser_side-compiler.js';
import OptionList from '../OptionList/OptionList.js';
import { prettyPrintFileSize as ppfs } from '@/modules/util/fileinfo.js';


const componentId = 'd4080c23793342e786f2698bf628bacd';

const data = {
    data() {
        return {
            settings_data: {
                all: {},
            },
            estimate: null,

        }
    },

    components: {
        OptionList,
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
        prettyPrintFileSize() {
            return ppfs.apply(this, arguments);
        },
        openSWoption() {
            swapi.showOptions();
        },

    },

    computed: {
        appVersion() {
            return globalThis.appInstance_.version;
        },
        estimateUnavailable() {
            return typeof (globalThis.navigator?.storage?.estimate) !== 'function';
        },
        swUnavailable() {
            return globalThis.swapi == undefined;
        },
        
    },

    created() {
        (async () => {
            if (!this.estimateUnavailable) {
                this.estimate = await globalThis.navigator.storage.estimate();
            }
        })();
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

