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
    let el = gui.container.findChild(".temporal-choose-target-prop-layer-control").on('click', GUI.handleDirectEvent(gui.clearMode));
    let btn = gui.container.findChild('#data-layer-target-prop');
    let isChooseTargetPropOpen = false;

    dateInput.html(model.getTemporalSettings().date);

    gui.addMode('temporal_layer_menu', turnOn, turnOff, btn.findChild('span'));
    model.on('update', function (e) {
        updateMenuBtn();
        if (isChooseTargetPropOpen) renderChooseTargetProp();
    });

    function updateMenuBtn() {
        const dataLayer = model.getDataLayer();
        if (dataLayer) {
            let name = dataLayer.layer.name || "[unnamed layer]";
            dataLayerNameSpan.html(`Data Layer: ${name}`);
            btn.findChild('span').html(`Analysis property: ${model.getTemporalSettings().targetProperty || getRealFieldsNameFromDataLayer()[0] || "[unnamed data property]"} &nbsp;&#9650;`);
        }
    }

    function renderChooseTargetProp() {
        let list = el.findChild('.layer-list');
        list.empty();
        getRealFieldsNameFromDataLayer()
            .map(f =>`
                <div class='layer-item'>
                    <div class='row1'>
                        <div class='col1'>
                            ${f}
                        </div>
                    <div>
                </div>`
            )
            .forEach(html => {
                element = El('div').html(html).firstChild();
                GUI.onClick(element, e => {
                    gui.model.addTemporalSettings({'targetProperty': e.target.innerText.trim()})
                    turnOff();
                    updateMenuBtn();
                })
                list.appendChild(element);
            });
    }

    function turnOn() {
        isChooseTargetPropOpen = true;
        el.findChild('div.info-box-scrolled').css('max-height', El('body').height() - 80);
        renderChooseTargetProp();
        el.show();
      }
    
      function turnOff() {
        isChooseTargetPropOpen = false;
        el.hide();
      }

      function getRealFieldsNameFromDataLayer() {
        return model.getDataLayer()
            .layer
            .data
            .getFields()
            .filter(f => !['ID', 'date'].includes(f))
      }

}
