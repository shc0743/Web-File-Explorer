export default {
    // reactive state
    data() {
        return {
            
        }
    },

    // functions that mutate state and trigger updates
    methods: {
        f_onsubmit() {

        },
        tr(str) {
            if (!globalThis.tr) return setTimeout(() => { this.tr(str) });
            return globalThis.tr(str);
        }
    },

    // lifecycle hooks
    mounted() {
        
    },

    // HTML template
    template: `
    <form @submit="f_onsubmit()" style="padding: 10px; border-radius: 10px; border: 1px solid #ccc; background: #F0F0F0; position: fixed; inset: 20px; overflow: auto;">
        <h1 style="text-align:center">{{ tr("ui.login.title") }}</h1>

        <p>
            <fieldset>
                <legend>User</legend>

                <div>

                </div>
            </fieldset>
        </p>

        <p>
            <fieldset>
                <legend>Server</legend>

                <div>
                    <label style="display:flex">Server:<span>&nbsp;&nbsp;&nbsp;</span><input style="flex:1" type="text" v-model="server"></label>
                </div>
            </fieldset>
        </p>
    </form>
    `,
}





