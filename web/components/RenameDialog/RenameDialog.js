import { getHTML } from '@/assets/js/browser_side-compiler.js';


const componentId = '5730b5871a8549089679ea7a0a94c1b8';

const data = {
    data() {
        return {
            count: 0,
            replacer: '',
            errorText: '',
            files: [], path: '',
            server: null, pswd: null,
        }
    },

    components: {

    },

    methods: {
        rename(file, str, path, server, pswd) {
            this.count = file.size;
            this.files.length = 0;
            for (const i of file) {
                this.files.push(str[i].substring(2));
            }
            this.server = server, this.pswd = pswd, this.path = path;

            this.$refs.form.reset();
            this.$refs.dlg.showModal();

        },
        pasteWarn(ev) {
            if (!confirm(tr('ui.rename.warning.paste'))) ev.preventDefault();
        },
        async perform() {
            this.errorText = '';
            try {
                const replacer = new Function('replacer', 'return (n,$)=>' + this.replacer + '')(this.replacer);
                if (typeof replacer(1, 'test') !== 'string') throw "replacer doesn't return a string"; // test the replacer
                
                const task = {
                    type: 'move',
                    files: []
                };
                const path = this.path;
                for (let i = 0, l = this.files.length; i < l; ++i) try {
                    const a = this.files[i];
                    const r = replacer(i + 1, a);
                    if (typeof r !== 'string') throw "replacer doesn't return a string";
                    const b = path + r;
                    task.files.push({ server: this.server, pswd: this.pswd, src: path + a, dest: b });
                } catch (error) {
                    throw 'Error replacing ' + this.files[i] + ': ' + error;
                }
                
                // console.log(task);
                globalThis.appInstance_.addTask(task);
                
                this.$refs.dlg.close();
                globalThis.appInstance_.instance.transferPanel_isOpen = true;
            }
            catch (error) {
                this.errorText = 'Error in replacer: ' + String(error);
            }
        },

    },

    mounted() {
        globalThis.appInstance_.renameDialog = this;
    },

    template: await getHTML(import.meta.url, componentId),

};


export default data;

