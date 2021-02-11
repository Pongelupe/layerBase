import cmd from '../mapshaper-cmd';
import { ArcCollection } from '../paths/mapshaper-arcs';

cmd.duplicate = function (catalog, targets, opts, cb) {
    const clone = obj => {
        if (null == obj || "object" != typeof obj) return obj;
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
        }
        return copy;
    }
    
    const targetDataset = targets[0].dataset;
    const nextStackId = Math.max(catalog.getLayers().map(l => l.layer.stack_id)) + 1;

    const name = opts.name || `${targets[0].layers[0].name}_${nextStackId}`;
    const visibility = opts.visible ? 'visible' : 'hidden';

    const duplicatedDataset = clone(targetDataset);
    duplicatedDataset.arcs = targetDataset.arcs.getCopy();
    duplicatedDataset.displayArcs = targetDataset.displayArcs.getCopy();
    duplicatedDataset.layers = [clone(targetDataset.layers[0])];
    duplicatedDataset.layers[0].visibility = visibility;
    duplicatedDataset.layers[0].data = targetDataset.layers[0].data.clone();
    duplicatedDataset.layers[0].name = name;
    duplicatedDataset.layers[0].stack_id = nextStackId;

    catalog.addDataset(duplicatedDataset);

    if (opts.affine) {
        cmd.affine(duplicatedDataset.layers, duplicatedDataset, opts);
    }
}