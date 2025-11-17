import $ from "jquery";

// Validate input data structure
export function _validate_data(json) {
  var self = this;

  if (!json || typeof json !== 'object') {
    throw new Error('InCHlib: Invalid data format - data must be an object');
  }

  if (!json.data || !json.data.nodes) {
    throw new Error('InCHlib: Invalid data format - missing data.nodes');
  }

  var node_count = Object.keys(json.data.nodes).length;
  if (node_count === 0) {
    throw new Error('InCHlib: Invalid data format - no nodes found');
  }

  // Check for at least one leaf node
  var has_leaf = false;
  for (var key in json.data.nodes) {
    if (json.data.nodes[key].count === 1) {
      has_leaf = true;
      break;
    }
  }

  if (!has_leaf) {
    throw new Error('InCHlib: Invalid data format - no leaf nodes found');
  }

  return true;
}

// Read data from JSON variable.
export function read_data(json2) {
  var self = this;

  // Validate input data
  self._validate_data(json2);

  var json = JSON.parse(JSON.stringify(json2));
  self.json = json;
  self.data = json.data;

  var settings = {};
  if (json["metadata"] !== undefined) {
    self.metadata = json.metadata;
    settings.metadata = true;
  } else {
    settings.metadata = false;
  }
  if (json["column_dendrogram"] !== undefined) {
    self.column_dendrogram = json.column_dendrogram;
    settings.column_dendrogram = true;
  } else {
    settings.column_dendrogram = false;
  }
  if (json["column_metadata"] !== undefined) {
    self.column_metadata = json.column_metadata;
    settings.column_metadata = true;
  } else {
    settings.column_metadata = false;
  }

  self._update_user_settings(settings);
  self._add_prefix();
}

// Read data from JSON file.
export function read_data_from_file(json) {
  var self = this;
  $.ajax({
    type: "GET",
    url: json,
    dataType: "json",
    success: function (json_file) {
      self.read_data(json_file);
    },
    async: false,
  });
}

// Async version using fetch (Next.js friendly)
export async function read_data_from_file_async(url) {
  var self = this;
  if (typeof fetch !== 'function') {
    throw new Error('InCHlib: fetch is not available in this environment');
  }
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    throw new Error('InCHlib: Failed to fetch data from ' + url + ' (' + res.status + ')');
  }
  const json = await res.json();
  self.read_data(json);
}

export function _add_prefix() {
  var self = this;
  var id = {};
  self.data.nodes = self._add_prefix_to_data(self.data.nodes);

  if (self.settings.metadata) {
    var metadata = {};
    for (
      var i = 0, keys = Object.keys(self.metadata.nodes), len = keys.length;
      i < len;
      i++
    ) {
      id = [self.settings.target, keys[i]].join("#");
      metadata[id] = self.metadata.nodes[keys[i]];
    }
    self.metadata.nodes = metadata;
  }

  if (self.column_dendrogram) {
    self.column_dendrogram.nodes = self._add_prefix_to_data(
      self.column_dendrogram.nodes
    );
  }
}

export function _add_prefix_to_data(data) {
  var self = this;
  var id,
    prefixed_data = {};

  for (var i = 0, keys = Object.keys(data), len = keys.length; i < len; i++) {
    id = [self.settings.target, keys[i]].join("#");
    prefixed_data[id] = data[keys[i]];

    if (prefixed_data[id]["parent"] !== undefined) {
      prefixed_data[id]["parent"] = [
        self.settings.target,
        prefixed_data[id].parent,
      ].join("#");
    }

    if (prefixed_data[id]["count"] !== 1) {
      prefixed_data[id].left_child = [
        self.settings.target,
        prefixed_data[id].left_child,
      ].join("#");
      prefixed_data[id].right_child = [
        self.settings.target,
        prefixed_data[id].right_child,
      ].join("#");
    }
  }
  return prefixed_data;
}

export function _get_root_id(nodes) {
  var self = this;
  var root_id;
  for (var i = 0, keys = Object.keys(nodes), len = keys.length; i < len; i++) {
    if (nodes[keys[i]]["parent"] === undefined) {
      root_id = keys[i];
      break;
    }
  }
  return root_id;
}

export function _get_dimensions() {
  var self = this;
  var dimensions = { data: 0, metadata: 0, overall: 0 },
    key,
    keys,
    i;
  var len = 0;

  for (
    i = 0, keys = Object.keys(self.data.nodes), len = keys.length;
    i < len;
    i++
  ) {
    key = keys[i];
    if (self.data.nodes[key].count === 1) {
      dimensions["data"] = self.data.nodes[key].features.length;
      break;
    }
  }

  if (self.settings.metadata) {
    key = Object.keys(self.metadata.nodes)[0];
    dimensions["metadata"] = self.metadata.nodes[key].length;
  }

  dimensions["overall"] = dimensions["data"] + dimensions["metadata"];
  return dimensions;
}
