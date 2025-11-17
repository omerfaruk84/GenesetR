// Color-related helpers

export function _precompute_color_palette(color_scale, steps) {
  var self = this;
  steps = steps || 256;

  if (!self._color_palettes) {
    self._color_palettes = {};
  }

  var palette_key = color_scale + '_' + steps;
  if (self._color_palettes[palette_key]) {
    return self._color_palettes[palette_key];
  }

  var palette = [];
  for (var i = 0; i < steps; i++) {
    var position = i / (steps - 1);
    var color = self._calculate_color_at_position(position, color_scale);
    palette.push(color);
  }

  self._color_palettes[palette_key] = palette;
  return palette;
}

export function _calculate_color_at_position(position, color_scale) {
  var self = this;
  var color = self.colors[color_scale];
  var c1 = color["start"];
  var c2 = color["end"];

  if (color["middle"] !== undefined) {
    if (position >= 0.5) {
      c1 = color["middle"];
      c2 = color["end"];
      position = (position - 0.5) * 2;
    } else {
      c1 = color["start"];
      c2 = color["middle"];
      position = position * 2;
    }
  }

  var r = self._hack_round(c1.r + position * (c2.r - c1.r));
  var g = self._hack_round(c1.g + position * (c2.g - c1.g));
  var b = self._hack_round(c1.b + position * (c2.b - c1.b));
  return "rgb(" + r + "," + g + "," + b + ")";
}

export function _get_color_for_value(
  value,
  min,
  max,
  middle,
  color_scale
) {
  var self = this;

  // Use cache for frequently calculated colors
  if (!self._color_cache) {
    self._color_cache = new Map();
  }

  var cache_key = value + "_" + min + "_" + max + "_" + middle + "_" + color_scale;
  if (self._color_cache.has(cache_key)) {
    return self._color_cache.get(cache_key);
  }

  var result;
  var color = self.colors[color_scale];
  var c1 = color["start"];
  var c2 = color["end"];

  if (value > max) {
    result = "rgb(" + c2.r + "," + c2.g + "," + c2.b + ")";
  } else if (min === max || value < min) {
    result = "rgb(" + c1.r + "," + c1.g + "," + c1.b + ")";
  } else {
    // Try to use pre-computed palette for faster lookup
    var use_palette = (max - min) > 0.001; // Only use palette for reasonable ranges
    if (use_palette) {
      var palette = self._precompute_color_palette(color_scale, 256);
      var position = (value - min) / (max - min);

      // Handle middle color scaling
      if (color["middle"] !== undefined) {
        var middle_position = (middle - min) / (max - min);
        if (position >= middle_position) {
          position = 0.5 + (position - middle_position) / (1 - middle_position) * 0.5;
        } else {
          position = position / middle_position * 0.5;
        }
      }

      var palette_index = Math.round(position * (palette.length - 1));
      palette_index = Math.max(0, Math.min(palette.length - 1, palette_index));
      result = palette[palette_index];
    } else {
      // Fallback to original calculation for edge cases
      if (color["middle"] !== undefined) {
        if (value >= middle) {
          min = middle;
          c1 = color["middle"];
          c2 = color["end"];
        } else {
          max = middle;
          c1 = color["start"];
          c2 = color["middle"];
        }
      }

      var position = (value - min) / (max - min);
      var r = self._hack_round(c1.r + position * (c2.r - c1.r));
      var g = self._hack_round(c1.g + position * (c2.g - c1.g));
      var b = self._hack_round(c1.b + position * (c2.b - c1.b));
      result = "rgb(" + r + "," + g + "," + b + ")";
    }
  }

  // Cache the result (limit cache size to prevent memory issues)
  if (self._color_cache.size < 10000) {
    self._color_cache.set(cache_key, result);
  } else if (self._color_cache.size >= 15000) {
    // Clear half the cache when it gets too large
    var keys_to_delete = Array.from(self._color_cache.keys()).slice(0, 7500);
    keys_to_delete.forEach(function(key) {
      self._color_cache.delete(key);
    });
    self._color_cache.set(cache_key, result);
  }

  return result;
}

