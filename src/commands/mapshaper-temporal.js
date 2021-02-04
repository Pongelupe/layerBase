import { stop } from '../utils/mapshaper-logging';
import cmd from '../mapshaper-cmd';

cmd.temporal = async function (targets, catalog, opts, cb) {
    if (targets[0].layers.length < 2) {
        stop("At least two layers are required")
        cb(null);
    }

    const id = opts.id || 'ID';
    const date = opts.date || 'date';
    const timeout = opts.timeout || 3000;
    const exp = opts.exp || `fill = 'green' `;

    let targetLayer = targets[0].layers[0];
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
        document.getElementById('date-input-id').value = e[0];

        const defaultTemporal = Object.keys(e[1][0]).filter(k => ![id, date].includes(k)).reduce((acc, el) => {
            acc[el] = null;
            return acc;
        }, { date: e[0] });
        const findTemporal = i => e[1].filter(r => r[id] == i)[0] || { defaultTemporal };

        targetLayer.data.getRecords()
            .forEach(r => {
                let temporal = findTemporal(r[id]);
                Object.entries(temporal)
                    .forEach(en => {
                        r[en[0]] = en[1];
                    })
            });


        cmd.evaluateEachFeature(targetLayer, targets[0].dataset.arcs, exp, {});
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

    cb(null);
}