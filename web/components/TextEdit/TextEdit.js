import { getHTML } from '@/assets/js/browser_side-compiler.js';
import { ElInput } from 'element-plus';


const componentId = '2d7f9e55aea44c07bf4aef1222bc55b1';

const data = {
    data() {
        return {
            text_: '',
            editMode: false,
            internal__opt_noSave: false,
            id: this.idInit,
        }
    },

    components: {
        ElInput,
    },

    props: {
        modelValue: String,
        disabled: Boolean,
        clearable: Boolean,
        showPassword: Boolean,
        autosize: Boolean,
        allowEmpty: Boolean,
        formatter: Function,
        parser: Function,
        inline: Boolean,
        type: { type: String, default: 'text' },
        placeholder: { type: String, default: '' },
        idInit: undefined,
        customData: undefined,

    },

    emits: [
        'update:modelValue',
        'changed',
    ],

    computed: {
        text: {
            get() { return this.modelValue },
            set(value) { this.$emit('update:modelValue', value, this.$refs.textbox) }
        },
        textComputed() {
            return this.showPassword ? '*'.repeat(this.text.length) : this.text;
        },
        styleInput() {
            return this.inline ? 'width: revert;' : '';
        },
        // styleSpan() {
        //     return this.block ? 'display: block; height: 1em;' : '';
        // },
    },

    methods: {
        doEdit() {
            this.internal__opt_noSave = false;
            this.text_ = this.text;
            this.editMode = true;
            this.$nextTick(() => this.$refs.inputbox.focus());
        },
        onEnter(ev) {
            if (this.type === 'textarea') return;
            ev.target.blur();
        },
        finishEdit() {
            this.editMode = false;
            if (!this.internal__opt_noSave) {
                const $1 = this.text, $2 = this.text_;
                const $3 = this.updateId.bind(this);
                this.$nextTick(() => this.$emit('changed', this.id, $2, $1, this.customData, $3));
                this.text = $2;
            }
        },
        finishEditWithoutSaving(ev) {
            this.internal__opt_noSave = true;
            ev.target.blur();
        },
        updateId() {
            this.id = this.idInit;
        },
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;



import { LoadCSS } from '@/assets/js/ResourceLoader.js';
import { getVdeep } from '@/assets/js/browser_side-compiler.js';
LoadCSS(`[${getVdeep(componentId)}]:empty::after{content:"(empty)";}`);

