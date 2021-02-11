import { DomCache } from './gui-dom-cache';
import { sortLayersForMenuDisplay } from './gui-layer-sorting';
import { utils, internal } from './gui-core';
import { El } from './gui-el';
import { ClickText2 } from './gui-elements';
import { GUI } from './gui-lib';

export function TemporalControl(gui) {
    let dateInput = gui.container.findChild('#date-input-id');
    let dataLayerNameSpan = gui.container.findChild('#data-layer-name');
    let model = gui.model;


    dateInput.html(new Date());
    // document.getElementById('date-input-id').value = new Date();

    model.on('update', function (e) {
        updateMenuBtn();
        // if (isOpen) render();
    });

    function updateMenuBtn() {
        const dataLayer = model.getDataLayer();
        if (dataLayer) {
            let name = dataLayer.layer.name || "[unnamed layer]";
            dataLayerNameSpan.html(`Data Layer: ${name}`);
        }
    }
}
