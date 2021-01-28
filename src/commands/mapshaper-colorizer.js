import cmd from '../mapshaper-cmd';
import { stop } from '../utils/mapshaper-logging';
import { getStateVar } from '../mapshaper-state';
import utils from '../utils/mapshaper-utils';
import { getRoundingFunction } from '../geom/mapshaper-rounding';

cmd.colorizer = function(opts) {
  if (!opts.name) {
    stop("Missing required name= parameter");
  }
  if (isReservedName(opts.name)) {
    stop('"' + opts.name + '" is a reserved name');
  }
  getStateVar('defs')[opts.name] = getColorizerFunction(opts);
};

function isReservedName(name) {
  return /^(stroke|stroke-width|stroke-dasharray|stroke-opacity|fill|fill-opacity|opacity|r|class)$/.test(name);
}

export function getColorizerFunction(opts) {
  var nodataColor = opts.nodata || 'white';
  var round = opts.precision ? getRoundingFunction(opts.precision) : null;
  var colorFunction;

  if (!opts.random && (!opts.colors || !opts.colors.length)) {
    stop("Missing colors= parameter");
  }

  if (opts.random) {
    colorFunction = getRandomColorFunction(opts.colors);
  } else if (opts.breaks) {
	if (opts.gradient) {
	    colorFunction = getGradientColorFunction(opts.colors, opts.breaks, round);
	} else {
		colorFunction = getSequentialColorFunction(opts.colors, opts.breaks, round);
	}
  } else if (opts.categories) {
    colorFunction = getCategoricalColorFunction(opts.colors, opts.other, opts.categories);
  } else {
    stop("Missing categories= or breaks= parameter");
  }

  return function(val) {
    var col = colorFunction(val);
    return col || nodataColor;
  };
}

function fastStringHash(val) {
  // based on https://github.com/darkskyapp/string-hash (public domain)
  var str = String(val),
      hash = 5381,
      i = str.length;
  while (i > 0) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }
  return Math.abs(hash);
}

function getRandomColorFunction(colors) {
  if (!colors || !colors.length) {
    colors = '#ccc,#888,#444'.split(',');
  }
  return function(val) {
    var n = colors.length;
    var i = val === undefined ?
        Math.floor(Math.random() * n) : fastStringHash(val) % n;
    return colors[i];
  };
}


function getCategoricalColorFunction(colors, otherColor, keys) {
  if (colors.length != keys.length) {
    stop("Number of colors should be equal to the number of categories");
  }

  return function(val) {
    var i = keys.indexOf(val);
    if (i >= 0) return colors[i];
    return val && otherColor ? otherColor : null;
  };
}

function validateSequentialBreaks(breaks) {
  // Accepts repeated values -- should this be allowed?
  var arr2 = breaks.map(parseFloat);
  utils.genericSort(arr2);
  for (var i=0; i<breaks.length; i++) {
    if (breaks[i] !== arr2[i]) stop('Invalid class breaks:', breaks.join(','));
  }
}


export function getSequentialColorFunction(colors, breaks, round) {
  if (colors.length != breaks.length + 1) {
    stop("Number of colors should be one more than number of class breaks");
  }
  // validate breaks
  // Accepts repeated values -- should this be allowed?
  if (testAscendingNumbers(breaks)) {
    // normal state
  } else if (testDescendingNumbers(breaks)) {
    breaks = breaks.concat().reverse();
    colors = colors.concat().reverse();
  } else {
    stop('Invalid class breaks:', breaks.join(','));
  }
  return function(val) {
    var i = -1;
    if (Number(val) === val) { // exclude null, NaN, strings, etc.
      if (round) val = val(round);
      i = getClassId(val, breaks);
    }
    return i > -1 && i < colors.length ? colors[i] : null;
  };
}


function arraysAreIdentical(a, b) {
  for (var i=0; i<a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return a.length == b.length;
}

function testAscendingNumbers(arr) {
  return arraysAreIdentical(arr, utils.genericSort(arr.map(parseFloat)));
}

function testDescendingNumbers(arr) {
  return arraysAreIdentical(arr, utils.genericSort(arr.map(parseFloat), false));
}

// breaks: threshold values between ranges (ascending order)
// Returns array index of a sequential range, or -1 if @val not numeric
function getClassId(val, breaks) {
  var minVal = -Infinity,
      maxVal = Infinity,
      i = 0;
  if (!(val >= minVal && val <= maxVal)) {
    return -1;
  }
  while (i < breaks.length && val >= breaks[i]) i++;
  return i;
}

//----------------------
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
      : null;
}

export function getGradientColorFunction(colors, breaks, round) {
  if (colors.length != breaks.length) {
    stop("Number of colors should be the same number of class breaks");
  }
  // validate breaks
  // Accepts repeated values -- should this be allowed?
  if (testAscendingNumbers(breaks)) {
    // normal state
  } else if (testDescendingNumbers(breaks)) {
    breaks = breaks.concat().reverse();
    colors = colors.concat().reverse();
  } else {
    stop('Invalid class breaks:', breaks.join(','));
  }

  return function(val) {
    var i = -1;
    if (Number(val) === val) { // exclude null, NaN, strings, etc.
      if (round) val = val(round);
      return getGradientColor(val, breaks, colors);
    }
    return null;
  };
}

// breaks: threshold values between ranges (ascending order)
// Returns rgb color between sequential range, or black if @val not numeric
function getGradientColor(val, breaks, colors) {
  var minVal = -Infinity,
      maxVal = Infinity,
      startColorRgb, endColorRgb,
      i = 0,
      perc = 0.0, color;

  if (!(val >= minVal && val <= maxVal)) {
    return '#000000';
  }

  while (i < breaks.length && val >= breaks[i]) i++;

  if (i == 0) return colors[0];
  if (i == breaks.length) return colors[i - 1];

  perc = (val - breaks[i - 1]) / (breaks[i] - breaks[i - 1]);

  startColorRgb = hexToRgb(colors[i - 1]);
  endColorRgb = hexToRgb(colors[i]);

  color = rgbToHex(
    Math.round((endColorRgb.r - startColorRgb.r) * perc) + startColorRgb.r,
    Math.round((endColorRgb.g - startColorRgb.g) * perc) + startColorRgb.g,
    Math.round((endColorRgb.b - startColorRgb.b) * perc) + startColorRgb.b);

  return color;
}

