import { getHTML } from '@/assets/js/browser_side-compiler.js';
import OptionList from '../OptionList/OptionList.js';
import { ElMessage } from 'element-plus';
import { Warning } from 'icons-vue';
import { prettyPrintFileSize as ppfs } from '@/modules/util/fileinfo.js';


const componentId = 'd4080c23793342e786f2698bf628bacd';

const data = {
    data() {
        return {
            settings_data: {
                all: {},
                all2: {},
            },
            estimate: null,
            showChangesTip: false,
            hasAdvancedChanges: false,
            // susposeSettingsUpdateRequest_: false,
            commonChangesCount: -1,

        }
    },

    components: {
        OptionList,
        Warning,
    },

    methods: {
        async updateSettings(from2 = false) {
            // if (this.susposeSettingsUpdateRequest_) return;
            if (from2 && this.hasAdvancedChanges) return ElMessage.error('hasAdvancedChanges的情况下无法进行all2数据操作');
            // console.warn('from2=', from2);
            const sdkey = from2 ? 'all2' : 'all';
            const keys = await userdata.getAllKeys('config');
            for (const key of keys) {
                if (!(key in this.settings_data[sdkey])) await userdata.delete('config', key);
            }
            for (const i in this.settings_data[sdkey]) try {
                await userdata.put('config', this.settings_data[sdkey][i], JSON.parse(JSON.stringify(i)));
            } catch (error) {
                console.warn('Failed to save settings:', error);
            }
            if (from2) {
                // this.$nextTick(() => {
                //     this.susposeSettingsUpdateRequest_ = true;
                //     // this.settings_data.all = this.settings_data.all2;
                //     for (const i of Reflect.ownKeys(this.settings_data.all))
                //         Reflect.deleteProperty(this.settings_data.all, i);
                //     for (const key of Reflect.ownKeys(this.settings_data.all2)) {
                //         Reflect.set(this.settings_data.all, key, Reflect.get(this.settings_data.all2, key));
                //     }
                //     this.$nextTick(() => this.$nextTick(() => {
                //         this.susposeSettingsUpdateRequest_ = false;
                //     }));
                // });
                ++this.commonChangesCount;
            }
            else {
                this.showChangesTip = true;
                this.hasAdvancedChanges = true;
                this.$nextTick(() => this.$nextTick(() => this.$refs.allSettingsSummary?.focus()));
            }
        },
        prettyPrintFileSize() {
            return ppfs.apply(this, arguments);
        },
        openSWoption() {
            swapi.showOptions();
        },
        reloadPage() {
            location.reload();  
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

    watch: {
        'settings_data.all2': {
            handler(val, old) {
                this.$nextTick(() => this.updateSettings(true));
            },
            deep: true,
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
            this.settings_data.all2 = dd;

            // this.$nextTick(() => this.$nextTick(() => this.$nextTick(() => this.$nextTick(() => console.log(this.commonChangesCount = false)))));
        });
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

