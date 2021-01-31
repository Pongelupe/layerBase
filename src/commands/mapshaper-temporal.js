import { stop } from '../utils/mapshaper-logging';
import cmd from '../mapshaper-cmd';

cmd.temporal = async function (targets, catalog, opts, cb) {
    if (targets[0].layers.length < 2) {
        stop("At least two layers are required")
        cb(null);
    }

    const id = opts.id || 'id';
    const date = opts.date || 'date';
    const timeout = opts.timeout || 3000;

    const targetLayer = targets[0].layers[0];
    const dataLayer = targets[0].layers[1];

    const records = dataLayer.data.getRecords();

    const groupBy = (xs, key) => {
        return xs.reduce((rv, x) => {
          (rv[x[key]] = rv[x[key]] || []).push(x);
          return rv;
        }, {});
      };
      
    const dataGroupedByDate = groupBy(records, date);

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
       delay(e, i * timeout);
        i++;
    });
}