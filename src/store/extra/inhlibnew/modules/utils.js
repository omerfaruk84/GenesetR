// General utility helpers

export function _monitor_performance(operation_name, fn) {
  var self = this;
  var start_time = performance.now();
  var result = fn();
  var end_time = performance.now();

  if (self.settings && self.settings.debug_performance) {
    console.log(operation_name + ' took ' + (end_time - start_time) + ' milliseconds.');
  }

  return result;
}

export function _get_font_size(text_length, width, height, max_font_size) {
  var self = this;
  var max_possible_size = height - 2;
  var font_size = max_possible_size;

  if ((font_size / 2) * text_length > width - 10) {
    font_size = font_size / (((font_size / 2) * text_length) / (width - 10));
  }
  font_size = font_size > max_possible_size ? max_possible_size : font_size;
  font_size = font_size > max_font_size ? max_font_size : font_size;
  return font_size;
}

export function _hack_size(obj) {
  return Object.keys(obj).length;
}

export function _hack_round(value) {
  return Math.round(value);
}

export function _is_number(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

export function _get_hash_object(array) { 
  var i,
    count = 0,
    hash_object = {};

  for (i = 0; i < array.length; i++) {
    if (hash_object[array[i]] === undefined) {
      hash_object[array[i]] = count;
      count++;
    }
  }
  return hash_object;
}

export function _get_max_length(items) {
  var self = this;
  var lengths = items.map(function (x) {
    return ("" + x).length;
  });
  var max = Math.max.apply(Math, lengths);
  return max;
}

export function _get_max_value_length() {
  var self = this;
  var nodes = self.data.nodes;
  var max_length = 0;
  var node_data, key;

  for (
    var i = 0, keys = Object.keys(nodes), len = keys.length;
    i < len;
    i++
  ) {
    key = keys[i];
    if (nodes[key].count === 1) {
      node_data = nodes[key].features;
      for (var j = 0, len_2 = node_data.length; j < len_2; j++) {
        if (("" + node_data[j]).length > max_length) {
          max_length = ("" + node_data[j]).length;
        }
      }
    }
  }

  if (self.settings.metadata) {
    nodes = self.metadata.nodes;
    for (
      var i = 0, keys = Object.keys(nodes), len = keys.length;
      i < len;
      i++
    ) {
      key = keys[i];
      node_data = nodes[key];
      for (var j = 0, len_2 = node_data.length; j < len_2; j++) {
        if (("" + node_data[j]).length > max_length) {
          max_length = ("" + node_data[j]).length;
        }
      }
    }
  }
  return max_length;
}

