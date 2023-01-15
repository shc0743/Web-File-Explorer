export default {
    // reactive state
    data() {
        return {
            
        }
    },

    // functions that mutate state and trigger updates
    methods: {
        
    },

    // lifecycle hooks
    mounted() {
        
    },

    // HTML template
    template: `
        <div style="
        position: fixed;
        left: 0; right: 0; top: 0; bottom: 0;
        z-index: 103;
        background: inherit;
        display: grid;
        place-items: center;
        ">
            <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            ">
                <picture>
                    <img src="assets/img/not-found-1.png" alt="404" />
                </picture>

                <div style="margin-top: 10px"></div>

                <div>
                    <h1 style="font-family: Consolas, 'Courier New', Courier, monospace;">Not Found</h1>
                </div>
            </div>
        </div>
    `,
}





