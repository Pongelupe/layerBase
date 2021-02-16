import { internal } from './gui-core';
import { El } from './gui-el';
import { GUI } from './gui-lib';

export function TemporalControl(gui) {
    let dateInput = gui.container.findChild('#date-input-id');
    let dataLayerNameSpan = gui.container.findChild('#data-layer-name');
    let model = gui.model;
    let el = gui.container.findChild(".temporal-choose-target-prop-layer-control").on('click', GUI.handleDirectEvent(gui.clearMode));
    let btnTargetProp = gui.container.findChild('#data-layer-target-prop');
    let isChooseTargetPropOpen = false;

    dateInput.html(model.getTemporalSettings().date);

    let btnPlayTemporal = gui.container.findChild('#play-control-btn');
    btnPlayTemporal.hide();
    btnPlayTemporal.on('click', () => runTemporal());

    gui.addMode('temporal_layer_menu', turnOn, turnOff, btnTargetProp.findChild('span'));
    model.on('update', function (e) {
        updateMenuBtn();
        if (isChooseTargetPropOpen) renderChooseTargetProp();
        if (hasToRenderPlayTemporal()) btnPlayTemporal.show();
    });

    function updateMenuBtn() {
        const dataLayer = model.getDataLayer();
        if (dataLayer) {
            let name = dataLayer.layer.name || "[unnamed layer]";
            dataLayerNameSpan.html(`Data Layer: ${name}`);
            let propName = model.getTemporalSettings().targetProperty;
            if (!propName) {
                propName = getRealFieldsNameFromDataLayer()[0];
                gui.model.addTemporalSettings({ 'targetProperty': propName })
            }

            btnTargetProp.findChild('span').html(`${propName || "[unnamed data property]"} &nbsp;&#9650;`);
        }
    }

    function renderChooseTargetProp() {
        let list = el.findChild('.layer-list');
        list.empty();
        getRealFieldsNameFromDataLayer()
            .map(f => `
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
                    gui.model.addTemporalSettings({ 'targetProperty': e.target.innerText.trim() })
                    turnOff();
                    model.updated({});
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

    function hasToRenderPlayTemporal() {
        let render = false;
        const dataLayer = model.getDataLayer();
        if (dataLayer) {
            const temporalSettings = model.getTemporalSettings();
            const dataLayerData = model.getDataLayer()
                .layer
                .data;
            render = dataLayerData
                .getFields()
                .filter(f => ['ID', 'date'].includes(f)).length === 2 && temporalSettings.targetProperty;
            if (render) {
                gui.model.addTemporalSettings({ 'ID': 'ID', 'date': 'date' });
            }
        }

        return render;
    }

    function runTemporal() {
        const temporalSettings = model.getTemporalSettings();
        const temporalCommandTarget = `target='${model.getActiveLayer().layer.name},${model.getDataLayer().layer.name}'`;

        const maxValue = Math.max.apply(Math, model.getDataLayer().layer.data.getRecords().map(e => e[temporalSettings.targetProperty])) || 100;
        const temporalCommandExp = `exp="fill = getColor((${temporalSettings.targetProperty} || 0) / ${maxValue}), stroke = 'black'"`;
        const temporalCommand = `mapshaper temporal ${temporalCommandTarget} timeout=100 ${temporalCommandExp}`;

        let commands = internal.parseConsoleCommands(temporalCommand);
        internal.runParsedCommands(commands, gui.model, err => {
            err && console.log(`Error running the temporal function: ${err}`);
            model.updated({});
        });

    }

    function getRealFieldsNameFromDataLayer() {
        return model.getDataLayer()
            .layer
            .data
            .getFields()
            .filter(f => !['ID', 'date'].includes(f))
    }

}
