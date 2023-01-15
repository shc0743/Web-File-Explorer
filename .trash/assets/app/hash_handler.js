import { switchRouter } from './router.js';
import { checkLogon } from "./LogonAPI.js";


const handler = {


    async $empty(hash, app) {
        if (await checkLogon()) {
            switchRouter(app, 'AppMain')
        } else {
            switchRouter(app, 'Login')
        }
    }
};


export {handler};

