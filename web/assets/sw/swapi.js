
import { BindMove } from "@/assets/js/BindMove.js";

export const OptPanelContent = `<form method="dialog">
<div class=title style="font-size:larger">Service Worker Options</div>

<fieldset>
    <legend>General</legend>
    <div></div>
</fieldset>

<div style="text-align:right">
    <button type="submit">Close</button>
</div>

</form>`;



export class SWAPI {
    constructor() {
        this.#optionsPanel = document.createElement('dialog');
        this.#optionsPanel.setAttribute('style', 'margin:0;left:50%;top:50%;transform:translate(-50%,-50%)');
        this.#optionsPanel.innerHTML = OptPanelContent;
        BindMove(this.#optionsPanel.querySelector('.title'), this.#optionsPanel, {
            isFixed: true, isTranslatedToCenter: true
        });
        (document.body || document.documentElement).append(this.#optionsPanel);

    }

    get sw() { return true }

    #optionsPanel = null;
    showOptions() {
        this.#optionsPanel.showModal();

    }

};


