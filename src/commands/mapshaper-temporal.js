import { stop } from '../utils/mapshaper-logging';
import cmd from '../mapshaper-cmd';

cmd.temporal = async function (targets, catalog, opts, cb) {
    if (targets[0].layers.length < 2) {
        stop("At least two layers are required")
    }

    const id = opts.id || 'id';
    const date = opts.date || 'date';

    const targetLayer = targets[0].layers[0];
    const dataLayer = targets[0].layers[1];

    const dataGroupedByDate = dataLayer.data.getRecords()
        .reduce((acc, el) => {
            (acc[el[date]] = acc[el[date]] || []).push(el);
            return acc;
        });

    delete dataGroupedByDate.id;
    delete dataGroupedByDate.date;
    delete dataGroupedByDate.value;

    const fillLayer = e => new Promise(resolve => {
        console.log(`showing values for date ${e[0]}`);
        const ids = `[${e[1].map(v => v[id]).toString()}]`;
        cmd.svgStyle(targetLayer, targets[0].dataset, { 'fill': 'green', 'where': `${ids}.includes(ID)` });
        cb(null);
    });

    const delay = (e, timeoutValue) => new Promise(resolve => {
        setTimeout(async () => resolve(await fillLayer(e)), timeoutValue)
    });

    let i = 0;
    Object.entries(dataGroupedByDate).map(e => {
        promises.push(delay(e, i * 3000));
        i++;
    });
}