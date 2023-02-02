import { getHTML } from '@/assets/js/browser_side-compiler.js';
import TextEdit from '../TextEdit/TextEdit.js';


const componentId = 'fafc512fd1534de2bdca9f88b6d4f8ad';

const data = {
    data() {
        return {
            listarr: [],
            createValue: {},
            
        }
    },

    components: {
        TextEdit,
        
    },

    props: {
        modelValue: {
            type: Object,
            required: true,
        },
    },
    emits: ['update:modelValue', 'changed'],

    methods: {
        update_value() {
            const filter = (val) => {
                if (String(val).startsWith('String:')) return String(val).substring(7);
                if (val === 'true' || val === true) return true;
                if (val === 'false' || val === false) return false;
                if (val === '') return '';
                if (!isNaN(val)) return Number(val);
                return val;
            };
            this.listarr = this.listarr.filter(el => !!el[0]);
            const newModelValue = new Object;
            for (const i of this.listarr) try {
                newModelValue[i[0]] = filter(i[1]);
            } catch { }
            this.$emit('update:modelValue', newModelValue);
            this.$emit('changed', newModelValue);
        },

        new_value() {
            if (!this.createValue?.k) return this.createValue = {};

            this.listarr.push([this.createValue.k, this.createValue.v || '']);
            this.createValue = {};
            this.update_value();
        },

        delete_value(item) {
            this.listarr = this.listarr.filter(el => el[0] !== item[0]);
            this.update_value();
        },

        canBeTextEdit(text) {
            return (typeof text === 'string' || (!isNaN(text) && typeof text !== 'boolean'));
        }

    },

    watch: {
        modelValue: {
            handler() {
                const r = []; for (const i in this.modelValue) {
                    r.push([i, this.modelValue[i]]);
                }; this.listarr = r;
            },
            immediate: true,
        },
    },

    mounted() {
        
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

