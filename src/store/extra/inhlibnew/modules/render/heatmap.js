import Kinetic from "kinetic";
// Safe requestAnimationFrame for SSR/headless
const raf = (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function')
  ? window.requestAnimationFrame.bind(window)
  : (cb) => setTimeout(cb, 0);

export function _set_on_features(features) {
  var self = this;
  var key;
  if (features === undefined) {
    var features = [];
    for (
      var i = 0, keys = Object.keys(self.features), len = keys.length;
      i < len;
      i++
    ) {
      key = keys[i];
      if (self.features[key]) {
        features.push(self.settings.columns_order[i]);
      }
    }
  }

  self.on_features = { data: [], metadata: [], count_column: [] };

  for (var i = 0, len = features.length; i < len; i++) {
    key = features[i];
    if (key < self.dimensions["data"]) {
      self.on_features["data"].push(key);
    } else if (
      key <=
      self.dimensions["data"] + self.dimensions["metadata"] - 1
    ) {
      self.on_features["metadata"].push(key - self.dimensions["data"]);
    } else {
      self.on_features["count_column"].push(0);
    }
  }
}

export function _draw_heatmap() {
  var self = this;
  if (!self.settings.heatmap) {
    return;
  }

  // Initialize layers
  self.heatmap_layer = new Kinetic.Layer();
  self.cell_value_layer = new Kinetic.Layer();
  self.heatmap_overlay = new Kinetic.Layer();
  self.row_id_layer = new Kinetic.Layer();

  // Calculate font size once
  self.max_value_length = self._get_max_value_length();
  self.value_font_size = self._get_font_size(
    self.max_value_length,
    self.pixels_for_dimension,
    self.pixels_for_leaf,
    12
  );

  // Disable text drawing if font is too small
  if (self.value_font_size < 4 && self.settings.current_draw_values) {
    self.settings.current_draw_values = false;
  }

  // Batch process rows for better performance
  var rows_batch = [];
  var cell_values_batch = [];
  var events_to_bind = [];
  var x1 = self.heatmap_distance;
  var keys = Object.keys(self.leaves_y_coordinates);
  
  // Process rows in smaller batches to prevent UI blocking
  var batch_size = keys.length > 1000 ? 25 : 50; // Smaller batches for large datasets
  
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    var y = self.leaves_y_coordinates[key];
    var row_data = self._draw_heatmap_row(key, x1, y);
    
    rows_batch.push(row_data[0]);
    cell_values_batch.push(row_data[1]);
    events_to_bind.push(row_data[0]);
    
    // Add to layers in batches for better performance
    if (rows_batch.length >= batch_size || i === len - 1) {
      // Use requestAnimationFrame for large datasets to prevent blocking
      if (len > 500 && i < len - 1) {
        (function(current_batch_rows, current_batch_values, current_events) {
          raf(function() {
            current_batch_rows.forEach(function(row) {
              self.heatmap_layer.add(row);
            });
            current_batch_values.forEach(function(cell_values) {
              self.cell_value_layer.add(cell_values);
            });
            current_events.forEach(function(row) {
              self._bind_row_events(row);
            });
          });
        })(rows_batch.slice(), cell_values_batch.slice(), events_to_bind.slice());
      } else {
        rows_batch.forEach(function(row) {
          self.heatmap_layer.add(row);
        });
        cell_values_batch.forEach(function(cell_values) {
          self.cell_value_layer.add(cell_values);
        });
        events_to_bind.forEach(function(row) {
          self._bind_row_events(row);
        });
      }
      
      // Clear batches
      rows_batch = [];
      cell_values_batch = [];
      events_to_bind = [];
    }
  }

  if (self.settings.draw_row_ids) {
    self._draw_row_ids();
  }

  // Initialize remaining layers
  self.highlighted_rows_layer = new Kinetic.Layer();
  self.stage.add(
    self.cell_value_layer,
    self.heatmap_layer,
    self.heatmap_overlay,
    self.highlighted_rows_layer
  );

  // Optimize layer rendering order
  self.highlighted_rows_layer.moveToTop();
  self.cell_value_layer.moveToTop();
  
  // Initialize overlay objects
  self.row_overlay = self.objects_ref.heatmap_line.clone();
  self.column_overlay = self.objects_ref.heatmap_line.clone();

  // Bind heatmap layer events
  self.heatmap_layer.on("mouseleave", function (evt) {
    self.last_header = null;
    self.heatmap_overlay.destroyChildren();
    self.heatmap_overlay.draw();
    self.events.heatmap_onmouseout(evt);
  });
}

export function _draw_heatmap_row(node_id, x1, y1) {
  var self = this;
  var node = self.data.nodes[node_id];
  var row = new Kinetic.Group({ id: node_id });
  var cell_values = new Kinetic.Group({ id: node_id });

  var x2, y2, color, line, value, text, text_value, col_index;
  var row_colors = []; // Cache colors for the row
  var row_values = []; // Cache values for the row

  // Pre-calculate all colors and values for this row
  for (var i = 0, len = self.on_features["data"].length; i < len; i++) {
    col_index = self.on_features["data"][i];
    value = node.features[col_index];
    
    if (value !== null) {
      color = self._get_color_for_value(
        value,
        self.data_descs[col_index]["min"],
        self.data_descs[col_index]["max"],
        self.data_descs[col_index]["middle"],
        self.settings.heatmap_colors
      );
      row_colors[i] = color;
      row_values[i] = value;
    } else {
      row_colors[i] = null;
      row_values[i] = null;
    }
  }

  // Create visual elements with pre-calculated data
  var current_x = x1;
  for (var i = 0, len = self.on_features["data"].length; i < len; i++) {
    col_index = self.on_features["data"][i];
    x2 = current_x + self.pixels_for_dimension;
    
    if (row_colors[i] !== null) {
      var line = self.objects_ref.heatmap_line.clone({
        stroke: row_colors[i],
        points: [current_x, y1, x2 + 0.8, y1],
        value: row_values[i],
        column: ["d", col_index].join("_"),
        strokeWidth: self.pixels_for_leaf + 0.8,
      });
      row.add(line);

      // Add text if enabled
      if (self.settings.current_draw_values && self.value_font_size >= 4) {
        var text = self.objects_ref.heatmap_value.clone({
          x: self._hack_round(
            (current_x + x2) / 2 -
              ("" + row_values[i]).length * (self.value_font_size / 3)
          ),
          y: self._hack_round(y1 - self.value_font_size / 2),
          fontSize: self.value_font_size + 4,
          text: row_values[i],
          opacity: 1,
        });
        cell_values.add(text);
      }
    }
    
    current_x = x2;
  }
  
  return [row, cell_values];
}

export function _bind_row_events(row) {
  var self = this;
  row.on("mouseenter", function (evt) {
    self._row_mouseenter(evt);
  });

  row.on("mouseleave", function (evt) {
    self._row_mouseleave(evt);
  });

  row.on("mouseover", function (evt) {
    self._draw_col_label(evt);
  });

  row.on("mouseout", function () {
    var labels = self.heatmap_overlay.find("#col_label");
    if (labels && labels[0]) {
      labels[0].destroy();
    }
  });

  row.on("click", function (evt) {
    var row_id = evt.target.parent.attrs.id;
    if (evt.target.parent.attrs.class !== "column_metadata") {
      var items = self.data.nodes[row_id].objects;
      var item_ids = [];

      for (var i = 0; i < items.length; i++) {
        item_ids.push(items[i]);
      }

      self.events.row_onclick(item_ids, evt);
    }
  });
}

export function _draw_row_ids() {
  var self = this;
  self.row_id_layer.destroyChildren();
  if (self.pixels_for_leaf < 6 || self.row_id_size < 5) {
    return;
  }
  var i,
    objects,
    object_y = [],
    leaf,
    keys,
    len,
    values = [],
    text;

  for (
    i = 0, keys = Object.keys(self.leaves_y_coordinates), len = keys.length;
    i < len;
    i++
  ) {
    var leaf_id = keys[i];
    objects = self.data.nodes[leaf_id].objects;
    if (objects.length > 1) {
      return;
    }
    object_y.push([objects[0], self.leaves_y_coordinates[leaf_id]]);
  }

  var x = self.distance + self._get_visible_count() * self.pixels_for_dimension + 15;

  for (i = 0; i < object_y.length; i++) {
    var text = self.objects_ref.heatmap_value.clone({
      x: x,
      y: self._hack_round(object_y[i][1] - self.row_id_size / 2),
      fontSize: self.row_id_size+3,
      text: object_y[i][0],
      fill: "black",
    });
    text.visibility = true;
    self.row_id_layer.add(text);
  }
  self.stage.add(self.row_id_layer);
}

export function _get_row_id_size() {
  var self = this;
  var objects,
    object_y = [],
    leaf_id,
    values = [],
    text;

  for (var i = 0, len = self.heatmap_array.length; i < len; i++) {
    leaf_id = self.heatmap_array[i][0];
    objects = self.data.nodes[leaf_id].objects;
    if (objects.length > 1) {
      return;
    }
    values.push(objects[0]);
  }
  var max_length = self._get_max_length(values);
  var test_string = "";
  for (var i = 0; i < max_length; i++) {
    test_string += "E";
  }

  if (self.settings.fixed_row_id_size) {
    var test = new Kinetic.Text({
      fontFamily: self.settings.font,
      fontSize: self.settings.fixed_row_id_size,
      fontStyle: "italic",
      listening: false,
      text: test_string,
    });
    self.row_id_size = self.settings.fixed_row_id_size;
    self.right_margin = 20 + test.width();

    if (self.right_margin < 100) {
      self.right_margin = 100;
    }
  } else {
    self.row_id_size = self._get_font_size(
      max_length,
      85,
      self.pixels_for_leaf,
      10
    );

    self.right_margin = 100;
  }
}

export function _draw_heatmap_header() {
  var self = this;
  if (self.settings.heatmap_header && self.header.length > 0) {
    self.header_layer = new Kinetic.Layer();
    var count = self._hack_size(self.leaves_y_coordinates);
    var y = self.settings.column_dendrogram && self.heatmap_header
      ? self.header_height + self.pixels_for_leaf * count + 10 + self.column_metadata_height
      : self.header_height - 20;
    var rotation = self.settings.column_dendrogram && self.heatmap_header ? 45 : -45;
    var distance_step = 0;
    var x, i, column_header;
    var current_headers = [], len; 

    for (i = 0, len = self.on_features["data"].length; i < len; i++) {
      current_headers.push(self.header[self.on_features["data"][i]]);
    }

    for (i = 0, len = self.on_features["metadata"].length; i < len; i++) {
      current_headers.push(
        self.header[self.on_features["metadata"][i] + self.dimensions["data"]]
      );
    }
    if (self.settings.count_column && self.features[self.dimensions["overall"] - 1]) {
      current_headers.push(self.header[self.dimensions["overall"] - 1]);
    }
    var max_text_length = self._get_max_length(current_headers);
    var font_size = self._get_font_size(
      max_text_length,
      self.header_height,
      self.pixels_for_dimension,
      16
    );
    if (font_size < 8) {
      return;
    }

    for (i = 0, len = current_headers.length; i < len; i++) {
      x = self.heatmap_distance + distance_step * self.pixels_for_dimension + self.pixels_for_dimension / 2;
      column_header = self.objects_ref.column_header.clone({
        x: x,
        y: y,
        text: current_headers[i],
        position_index: i,
        fontSize: font_size,
        rotationDeg: rotation,
      });
      self.header_layer.add(column_header);
      distance_step++;
    }

    self.stage.add(self.header_layer);

    if (!self.settings.dendrogram) {
      self.header_layer.on("click", function (evt) {
        var column = evt.target;
        var position_index = column.attrs.position_index;
        for (i = 0; i < self.header_layer.getChildren().length; i++) {
          self.header_layer.getChildren()[i].setFill("black");
        }
        evt.target.setAttrs({ fill: "red" });
        self._delete_layers([
          self.heatmap_layer,
          self.heatmap_overlay,
          self.highlighted_rows_layer,
        ]);
        self._reorder_heatmap(
          self._translate_column_to_feature_index(position_index)
        );
        self._draw_heatmap();
        self.header_layer.draw();
      });

      self.header_layer.on("mouseover", function (evt) {
        var label = evt.target;
        label.setOpacity(0.7);
        this.draw();
      });

      self.header_layer.on("mouseout", function (evt) {
        var label = evt.target;
        label.setOpacity(1);
        this.draw();
      });
    }
  }
}

export function _translate_column_to_feature_index(column_index) {
  var self = this;
  var key;
  var index = -1;
  for (
    var i = 0, keys = Object.keys(self.features), len = keys.length;
    i < len;
    i++
  ) {
    key = keys[i];
    if (self.features[key]) {
      index++;
      if (column_index === index) {
        return key;
      }
    }
  }
}

export function redraw_heatmap() {
  var self = this;
  [self.heatmap_layer, self.heatmap_overlay, self.highlighted_rows_layer, self.header_layer].forEach(layer => {
    if (layer) layer.destroy();
  });
  self._delete_layers([
    self.heatmap_layer,
    self.heatmap_overlay,
    self.highlighted_rows_layer,
    self.header_layer,
  ]);
  self._set_color_settings();
  self._draw_heatmap();
  self._draw_heatmap_header();
  self.heatmap_layer.moveToBottom();
  self.heatmap_layer.moveUp();
}

export function setRowIdsVisibility(visibility) {
  if (typeof visibility !== "boolean") {
     console.error("Visibility must be a boolean value.");
      return;
    }
    const self = this;
    self.settings.draw_row_ids = visibility;
    if(visibility){
       self.row_id_layer.show()
    } else{
        self.row_id_layer.hide()
    }
    self.row_id_layer.draw();
}

export function setColumnIdsVisibility(visibility) {
  if (typeof visibility !== "boolean") {
    console.error("Visibility must be a boolean value.");
    return;
  }
  if (!this.header_layer) {
    return;
  }
  if (visibility){
    this.header_layer.show()
  } else{
    this.header_layer.hide()
  }
  this.header_layer.draw();
}

export function updateCellColors(colorScale) {
  const self = this;
  // Update the heatmap color scale in settings
  self.settings.heatmap_colors = colorScale;
  
  // Clear existing color cache since scale changed
  if (self._color_cache) {
    self._color_cache.clear();
  }

  if(!self.settings.independent_columns){
    // Initialize a cache for color calculations
    const colorCache = new Map();
    const getColor = (value) => {        
      if (colorCache.has(value)) {
        return colorCache.get(value);
      }
      const color = self._get_color_for_value(
        value,
        self.data_descs[0].min,
        self.data_descs[0].max,
        self.data_descs[0].middle,
        colorScale
      );
      colorCache.set(value, color);
      return color;
    };
    // Iterate over rows and update their colors
    const rows = self.heatmap_layer.getChildren();
    rows.forEach((row) => {
      const rowChildren = row.getChildren();
      rowChildren.forEach((line) => {
        if (line.attrs.column !== undefined && line.attrs.value !== undefined) {
          const value = line.attrs.value;
          const color = getColor(value);
          line.setAttr("stroke", color);
        }
      });
    });
  }  else{
    const rows = self.heatmap_layer.getChildren();
    rows.forEach((row) => {
      const rowChildren = row.getChildren();
      rowChildren.forEach((line) => {
        if (line.attrs.column !== undefined && line.attrs.value !== undefined) {
          const value = line.attrs.value;
          const colIndex = parseInt(line.attrs.column.split("_")[1], 10);
          const color = self._get_color_for_value(
            value,
            self.data_descs[colIndex].min,
            self.data_descs[colIndex].max,
            self.data_descs[colIndex].middle,
            colorScale
          );
          line.setAttr("stroke", color);
        }
      });
    });
  }
  self.heatmap_layer.draw();
}

export function updateCellColorsPercentile(colorPercentile) {
  const self = this;
  if (self._color_cache) {
    self._color_cache.clear();
  }
  const colorCache = new Map();
  const getColor = (value) => {        
    if (colorCache.has(value)) {
      return colorCache.get(value);
    }
    const color = self._get_color_for_value(
      value,
      colorPercentile.minValue,
      colorPercentile.maxValue,
      (colorPercentile.maxValue + colorPercentile.minValue)/2,
      self.settings.heatmap_colors
    );
    colorCache.set(value, color);
    return color;
  };
  const rows = self.heatmap_layer.getChildren();
  rows.forEach((row) => {
    const rowChildren = row.getChildren();
    rowChildren.forEach((line) => {
      if (line.attrs.column !== undefined && line.attrs.value !== undefined) {
        const value = line.attrs.value; 
        const color = getColor(value);
        line.setAttr("stroke", color);
      }
    });
  });
  self.heatmap_layer.draw();
}

export function setCellValueVisibility(visibility) {
  if (typeof visibility !== "boolean") {
    console.error("Visibility must be a boolean value.");
    return;
  }
  const self = this;
  self.settings.current_draw_values = visibility;
  if(visibility){
    self.cell_value_layer.show()
  } else{
    self.cell_value_layer.hide()
  }
  self.cell_value_layer.draw();
}

export function _row_mouseenter(evt) {
  var self = this;
  var row_id = evt.target.parent.getAttr("id");
  var visible = self._get_visible_count();
  if (evt.target.parent.attrs.class !== "column_metadata") {
    self.highlighted_row = row_id;
    var y = self.leaves_y_coordinates[row_id];
    var x = self.heatmap_distance;
    self.row_overlay = self.objects_ref.heatmap_line.clone({
      points: [x, y, x + self.heatmap_width, y],
      strokeWidth: self.pixels_for_leaf,
      stroke: "#FFFFFF",
      opacity: 0.3,
      listening: false,
    });
    self.heatmap_overlay.add(self.row_overlay);
    self.heatmap_overlay.draw();
    self.events.row_onmouseover(self.data.nodes[row_id].objects, evt);
  }
}

export function _row_mouseleave(evt) {
  var self = this;
  self.row_overlay.destroy();
  self.events.row_onmouseout(evt);
}

export function _draw_col_label(evt) {
  var self = this;
  var attrs = evt.target.attrs;
  var points = attrs.points;
  var x = self._hack_round((points[0] + points[2]) / 2);
  var y = points[1] - 0.5 * self.pixels_for_leaf;
  var column = attrs.column.split("_");
  var header_type2value = {
    d: self.heatmap_header[column[1]],
    m: self.metadata_header[column[1]],
    Count: "Count",
  };

  if (self.column_metadata_header !== undefined) {
    header_type2value["cm"] = self.column_metadata_header[column[1]];
  }

  var value = attrs.value;
  var header = header_type2value[column[0]];

  if (header !== self.last_column) {
    self.column_overlay.destroy();
    self.last_column = attrs.column;
    self.column_overlay = self.objects_ref.heatmap_line.clone({
      points: [
        x,
        self.header_height,
        x,
        self.header_height + self.column_metadata_height + (self.heatmap_array.length + 0.5) * self.pixels_for_leaf,
      ],
      strokeWidth: self.pixels_for_dimension,
      stroke: "#FFFFFF",
      opacity: 0.3,
      listening: false,
    });
    self.heatmap_overlay.add(self.column_overlay);
  }

  var row_id = evt.target.parent.getAttr("id");
  if (header !== undefined) {
    value = [header, value].join("\n");
  }
  if (
    row_id !== undefined &&
    self.data.nodes[row_id].objects !== undefined &&
    self.data.nodes[row_id].objects[0] !== undefined
  ) {
    value = [self.data.nodes[row_id].objects[0], value].join("\n");
  }

  var tooltip = self.objects_ref.tooltip_label.clone({
    x: x,
    y: y,
    id: "col_label",
  });
  tooltip.add(
    self.objects_ref.tooltip_tag.clone({ pointerDirection: "down" }),
    self.objects_ref.tooltip_text.clone({ text: value })
  );
  self.heatmap_overlay.add(tooltip);
  self.heatmap_overlay.moveToTop();
  self.heatmap_overlay.draw();
}
