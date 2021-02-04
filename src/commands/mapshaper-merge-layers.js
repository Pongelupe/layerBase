import { getColumnType } from '../datatable/mapshaper-data-utils';
import { fixInconsistentFields } from '../datatable/mapshaper-data-utils';
import { getFeatureCount } from '../dataset/mapshaper-layer-utils';
import { message, stop, error } from '../utils/mapshaper-logging';
import { DataTable } from '../datatable/mapshaper-data-table';
import utils from '../utils/mapshaper-utils';
import cmd from '../mapshaper-cmd';

// Merge layers, checking for incompatible geometries and data fields.
// Assumes that input layers are members of the same dataset (and therefore
// share the same ArcCollection, if layers have paths).
cmd.mergeLayers = function (layersArg, opts) {
  var layers = layersArg.filter(getFeatureCount); // ignore empty layers
  var merged = {};
  opts = opts || {};
  if (!layers.length) return null;
  if (layers.length == 1) {
    message('Use the target= option to specify multiple layers for merging');
    return layers.concat();
  }
  merged.data = mergeDataFromLayers(layers, opts);
  merged.name = mergeLayerNames(layers);
  merged.geometry_type = getMergedLayersGeometryType(layers);
  if (merged.geometry_type) {
    merged.shapes = mergeShapesFromLayers(layers);
  }
  if (merged.shapes && merged.data && merged.shapes.length != merged.data.size()) {
    error("Mismatch between geometry and attribute data");
  }
  return [merged];
};

function getMergedLayersGeometryType(layers) {
  var geoTypes = utils.uniq(utils.pluck(layers, 'geometry_type'))
    .filter(function (type) { return !!type; }); // ignore null-type layers
  if (geoTypes.length > 1) {
    stop("Incompatible geometry types:", geoTypes.join(', '));
  }
  return geoTypes[0] || null;
}

function mergeShapesFromLayers(layers) {
  return layers.reduce(function (memo, lyr) {
    var shapes = lyr.shapes || [];
    var n = getFeatureCount(lyr);
    var i = -1;
    while (++i < n) memo.push(shapes[i] || null); // add null shapes if layer has no shapes
    return memo;
  }, []);
}

function mergeDataFromLayers(layers, opts) {
  var allFields = utils.uniq(layers.reduce(function (memo, lyr) {
    return memo.concat(lyr.data ? lyr.data.getFields() : []);
  }, []));
  if (allFields.length === 0) return null; // no data in any fields

  let mergedRecords = [];

  if (opts.join) {
    let targetLayer = layers.shift();

    let findRecord = (k, v) => targetLayer.data.getRecords().filter(r => r[k] == v)[0];
    mergedRecords = layers
      .map(lyr => lyr.data ? lyr.data.getRecords() : new DataTable(getFeatureCount(lyr)).getRecords())
      .reduce((acc, recs) => {
        return recs.reduce((el, r) => {
          let recordTarget = findRecord(opts.join, r[opts.join]);
          acc.push({...recordTarget, ...r});
          return acc;
        }, []);
      }, []).flat();

  } else {
    mergedRecords = layers.reduce(function (memo, lyr) {
      var records = lyr.data ? lyr.data.getRecords() : new DataTable(getFeatureCount(lyr)).getRecords();
      return memo.concat(records);
    }, []);
    var missingFields = findInconsistentFields(allFields, layers);
    handleMissingFields(missingFields, opts);
    checkInconsistentFieldTypes(allFields, layers);
    if (missingFields.length > 0) {
      fixInconsistentFields(mergedRecords);
    }
  }
  return new DataTable(mergedRecords);
}

// handle fields that are missing from one or more layers
// (warn if force-merging, else error)
function handleMissingFields(missingFields, opts) {
  var msg;
  if (missingFields.length > 0) {
    msg = '[' + missingFields.join(', ') + ']';
    msg = (missingFields.length == 1 ? 'Field ' + msg + ' is missing' : 'Fields ' + msg + ' are missing') + ' from one or more layers';
    if (!opts.force) {
      stop(msg);
    } else if (opts.verbose !== false) {
      message('Warning: ' + msg);
    }
  }
}

function findInconsistentFields(allFields, layers) {
  var missingFields = utils.uniq(layers.reduce(function (memo, lyr) {
    return memo.concat(utils.difference(allFields, lyr.data ? lyr.data.getFields() : []));
  }, []));
  return missingFields;
}

// check for fields with incompatible data types (e.g. number, string)
function checkInconsistentFieldTypes(fields, layers) {
  fields.forEach(function (key) {
    var types = findFieldTypes(key, layers);
    if (types.length > 1) {
      stop("Inconsistent data types in \"" + key + "\" field:", types.join(', '));
    }
  });
}

function findFieldTypes(key, layers) {
  // ignores empty-type fields
  return layers.reduce(function (memo, lyr) {
    var type = lyr.data ? getColumnType(key, lyr.data.getRecords()) : null;
    if (type && memo.indexOf(type) == -1) {
      memo.push(type);
    }
    return memo;
  }, []);
}

export function mergeLayerNames(layers) {
  return layers.reduce(function (memo, lyr) {
    if (memo === null) {
      memo = lyr.name || null;
    } else if (memo && lyr.name) {
      memo = utils.mergeNames(memo, lyr.name);
    }
    return memo;
  }, null) || '';
}
