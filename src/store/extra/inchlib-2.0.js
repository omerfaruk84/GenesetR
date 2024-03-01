/**
* InCHlib2 is an interactive JavaScript library which facilitates data
* visualization and exploration by means of a cluster heatmap. InCHlib2
* is a versatile tool, and its use is not limited only to chemical or
* biological data. Source code, tutorial, documentation, and example
* data are freely available from InCHlib2 website <a
* href="http://openscreen.cz/software/inchlib"
* target=blank>http://openscreen.cz/software/inchlib</a>. At the
* website, you can also find a Python script <a
* href="http://openscreen.cz/software/inchlib/inchlib_clust"
* target=blank>inchlib_clust</a> which performs data clustering and
* prepares <a href="http://openscreen.cz/software/inchlib/input_format"
* target=blank>input data for InCHlib2</a>.
* 
* @author <a href="mailto:ctibor.skuta@img.cas.cz">Ctibor Škuta</a>
* @author <a href="mailto:petr.bartunek@img.cas.cz">Petr Bartůněk</a>
* @author <a href="mailto:svozild@vscht.cz">Daniel Svozil</a>
* @version 2.0
* @category 1
* @license InCHlib2 - Interactive Cluster Heatmap Library http://openscreen.cz/software/inchlib Copyright 2014, Ctibor Škuta, Petr Bartůněk, Daniel Svozil Licensed under the MIT license.
* 
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use,
* copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following
* conditions:
* 
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
* 
* @requires <a href='http://code.jquery.com/jquery-2.0.3.min.js'>jQuery Core 2.0.3</a>
* @dependency <script language="JavaScript" type="text/javascript" src="http://code.jquery.com/jquery-2.0.3.min.js"></script>
* 
* @requires <a href='http://kineticjs.com/'>KineticJS 5.1.0</a>
* @dependency <script language="JavaScript" type="text/javascript" src="http://openscreen.cz/software/inchlib/static/js/kinetic-v5.1.0.min.js"></script>
*
* @param {Object} options An object with the options for the InCHlib2 component.
*
* @option {string} target
*   identifier of the DIV tag where the component should be displayed

* @option {PIXI.Application} app
*   PIXI Application

* @option {boolean} [column_dendrogram=false]
*   turn on/off the column dendrogram

* @option {boolean} [count_column=false]
*   turn on/off the count column

* @option {boolean} [dendrogram=true]
*   turn on/off the row dendrogram

* @option {string} [font="Trebuchet&nbsp;MS"]
*   font family

* @option {string} [heatmap_colors="Greens"]
*   the heatmap color scale

* @option {number} [heatmap_part_width=0.7]
*   define the heatmap part width from the width of the whole graph

* @option {string} [highlight_colors="Reds"]
*   color scale for highlighted rows

* @option {obejct} [highlighted_rows=[]]
*   array of row IDs to highlight

* @option {boolean} [independent_columns=true]
*   determines whether the color scale is based on the values from all columns together or for each column separately

* @option {string} [label_color=grey]
*   color of column label

* @option {number} [max_column_width=100]
*   maximum column width in pixels

* @option {number} [max_height=800]
*   maximum graph height in pixels

* @option {number} [max_row_height=25]
*   maximum row height in pixels

* @option {boolean} [metadata=false]
*   turn on/off the metadata

* @option {string} [metadata_colors="Oranges"]
*   the metadata color scale

* @option {number} [min_row_height=false]
*   minimum row height in pixels

* @option {number} [width="the width of target DIV"]
*   width of the graph in pixels

* @option {boolean} [heatmap=true]
*   turn on/off the heatmap

* @option {string} [heatmap_font_color="black"]
*   the color of the text values in the heatmap

* @option {string} [count_column_colors="Reds"]
*   the color scale of count column

* @option {boolean} [draw_row_ids=false]
*   draws the row IDs next to the heatmap when there is enough space to visualize them

* @option {boolean} [fixed_row_id_size=false]
*   fixes the row id size on given number and extends the right margin of the visualization accordingly

* @option {number} [max_percentile=100]
*   the value percentile above which the color will be equal to the terminal color of the color scale

* @option {number} [min_percentile=0]
*   the value percentile below which the color will be equal to the beginning color of the color scale

* @option {number} [middle_percentile=50]
*   the value percentile which defines where the middle color of the color scale will be used

* @option {array} [columns_order=[]]
*   the order of columns defined by their indexes startin from 0, when not provided the columns are sorted in common order 0, 1, 2... etc.

* @option {boolean} [alternative_data=false]
*   use original data to compute heatmap but show the alternative values (alternative_data section must be present in input data)

* @option {boolean} [images_as_alternative_data=false]
*   alternative data values can be used to identify image files (.png, .jpg) and draw them insted of the heatmap values

* @option {object} [images_path=false]
*   when using images_as_alternative_data option - set dir path of the image files and the image files extension to generate the whole file path ({"dir": "", "ext": ""})

* @option {object} [navigation_toggle={"distance_scale": false, "filter_button": false, "export_button": false, "color_scale": false, "hint_button": false}]
*   toggle "navigation" features - true/false

* 
* @example
*       window.instance = new InCHlib2({
*                target : "YourOwnDivId",
*                metadata: true, 
*                max_height: 800,
*                width: 700,
*                metadata_colors: "RdLrBu"
*            });
*       instance.read_data_from_file("../biojs/data/chembl_gr.json");
*       instance.draw();
*/
//import Kinetic from "kinetic";
import $ from "jquery";
import Backbone from "backbone";
import * as PIXI from "pixi.js";
import sprites from "./sprites.png";

const _date = new Date();

// Create the SpriteSheet from data and image

function InCHlib2(settings) {
  var self = this;
  self.app = settings.app;
  self.user_settings = settings;
  self.target_element = $("#" + settings.target);
  var target_width = self.target_element.width();
  self.target_element.css({ position: "relative" });
  self.dendrogram_map = {};
  const iconsData = {
    frames: {
      download: {
        frame: { x: 192, y: 0, w: 96, h: 96 },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: 96, h: 96 },
        sourceSize: { w: 96, h: 96 },
      },
      filter: {
        frame: { x: 0, y: 0, w: 64, h: 64 },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
        sourceSize: { w: 64, h: 64 },
      },
      help: {
        frame: { x: 288, y: 0, w: 96, h: 96 },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: 96, h: 96 },
        sourceSize: { w: 96, h: 96 },
      },
      refresh: {
        frame: { x: 0, y: 96, w: 160, h: 160 },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: 160, h: 160 },
        sourceSize: { w: 160, h: 160 },
      },
      search: {
        frame: { x: 160, y: 96, w: 256, h: 256 },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: 256, h: 256 },
        sourceSize: { w: 256, h: 256 },
      },
      zoomin: {
        frame: { x: 64, y: 0, w: 64, h: 64 },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
        sourceSize: { w: 64, h: 64 },
      },
      zoomout: {
        frame: { x: 128, y: 0, w: 64, h: 64 },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: 64, h: 64 },
        sourceSize: { w: 64, h: 64 },
      },
    },
    meta: {
      image: "sprites.png",
      format: "RGBA8888",
      size: { w: 416, h: 352 },
      scale: "1",
    },
  };
  self.spritesheet = new PIXI.Spritesheet(
    PIXI.BaseTexture.from(sprites),
    iconsData
  );
  console.log(self.spritesheet);
  /**
   * Default values for the settings
   * @name InCHlib2#settings
   */
  self.spritesheet.parse();

  self.settings = {
    /* app: new PIXI.Application({
      width: 800,
      height: 600,
      autoResize: true,
      resolution: devicePixelRatio * 1,
      antialias: true,
      transparent: true,
      background: 0xffffff,
    }),*/
    target: "YourOwnDivId",
    heatmap: true,
    heatmap_header: true,
    dendrogram: true,
    metadata: false,
    column_metadata: false,
    column_metadata_row_height: 8,
    column_metadata_colors: "RdLrBu",
    max_height: 800,
    width: target_width,
    heatmap_colors: "Greens",
    heatmap_font_color: "black",
    heatmap_part_width: 0.7,
    column_dendrogram: false,
    independent_columns: true,
    metadata_colors: "Reds",
    highlight_colors: "Oranges",
    highlighted_rows: [],
    label_color: "#9E9E9E",
    count_column: false,
    count_column_colors: "Reds",
    min_row_height: 1,
    max_row_height: 25,
    max_column_width: 150,
    font: "Helvetica",
    draw_row_ids: false,
    fixed_row_id_size: false,
    max_percentile: 100,
    min_percentile: 0,
    middle_percentile: 50,
    columns_order: [],
    alternative_data: false,
    images_as_alternative_data: false,
    images_path: { dir: "", ext: "" },
    navigation_toggle: {
      color_scale: true,
      distance_scale: true,
      export_button: true,
      filter_button: true,
      hint_button: true,
    },
    dendrogram_map: {},
  };

  self.update_settings(settings);
  self.settings.width =
    settings.max_width && settings.max_width < target_width
      ? settings.max_width
      : self.settings.width;
  self.settings.heatmap_part_width =
    self.settings.heatmap_part_width > 0.9
      ? 0.9
      : self.settings.heatmap_part_width;

  self.header_height = 150;
  self.footer_height = 70;
  self.dendrogram_heatmap_distance = 5;

  /**
   * Default function definitions for the InCHlib2 events
   * @name InCHlib2#events
   */
  self.events = {
    /**
            * @name InCHlib2#row_onclick
            * @event
            * @param {function} function() callback function for click on the heatmap row event
            * @eventData {array} array array of object IDs represented by row
            * @eventData {object} event event object

            * @example 
            * instance.events.row_onclick = (
            *    function(object_ids, evt) {
            *       alert(object_ids);
            *    }
            * ); 
            * 
            */
    row_onclick: function (object_ids, evt) {
      return;
    },

    /**
            * @name InCHlib2#row_onmouseover
            * @event
            * @param {function} function() callback function for mouse cursor over the heatmap row event
            * @eventData {array} array array of object IDs represented by row
            * @eventData {object} event event object

            * @example 
            * instance.events.row_onmouseover = (
            *    function(object_ids, evt) {
            *       alert(object_ids);
            *    }
            * ); 
            * 
            */
    row_onmouseover: function (object_ids, evt) {
      return;
    },

    /**
            * @name InCHlib2#row_onmouseout
            * @event
            * @param {function} function() callback function for mouse cursor out of the heatmap row event
            * @eventData {object} event event object

            * @example 
            * instance.events.row_onmouseout = (
            *    function(evt) {
            *       alert("now");
            *    }
            * ); 
            * 
            */
    row_onmouseout: function (evt) {
      return;
    },

    /**
            * @name InCHlib2#dendrogram_node_onclick
            * @event
            * @param {function} function() callback function for dendrogram node click event
            * @eventData {array} array array of object IDs represented by the node
            * @eventData {string} node_id Id of the dendrogram node
            * @eventData {object} event event object

            * @example 
            * instance.events.dendrogram_node_onclick = (
            *    function(object_ids, node_id, evt) {
            *    alert(node_id + ": " + object_ids.length+" rows");
            *    }
            * ); 
            * 
            */
    dendrogram_node_onclick: function (object_ids, node_id, evt) {
      return;
    },

    /**
            * @name InCHlib2#column_dendrogram_node_onclick
            * @event
            * @param {function} function() callback function for column dendrogram click event
            * @eventData {array} array array of column indexes
            * @eventData {string} node_id Id of the dendrogram node
            * @eventData {object} event event object

            * @example 
            * instance.events.column_dendrogram_node_onclick = (
            *    function(column_ids, node_id, evt) {
            *    alert(node_id + ": " + column_ids.length+" columns");
            *    }
            * ); 
            * 
            */
    column_dendrogram_node_onclick: function (column_indexes, node_id, evt) {
      return;
    },

    /**
            * @name InCHlib2#dendrogram_node_highlight
            * @event
            * @param {function} function() callback function for the dendrogram node highlight event
            * @eventData {array} array array of object IDs represented by row
            * @eventData {string} node_id Id of the dendrogram node
            * @eventData {object} event event object

            * @example 
            * instance.events.dendrogram_node_highlight = (
            *    function(object_ids, node_id, evt) {
            *       alert(node_id + ": " + object_ids.length+" rows");
            *    }
            * ); 
            * 
            */
    dendrogram_node_highlight: function (object_ids, node_id) {
      return;
    },

    /**
            * @name InCHlib2#column_dendrogram_node_highlight
            * @event
            * @param {function} function() callback function for the column dendrogram node highlight event
            * @eventData {array} array array of column indexes
            * @eventData {string} node_id Id of the dendrogram node
            * @eventData {object} event event object

            * @example 
            * instance.events.column_dendrogram_node_highlight = (
            *    function(object_ids, node_id, evt) {
            *       alert(node_id + ": " + object_ids.length+" columns");
            *    }
            * ); 
            * 
            */
    column_dendrogram_node_highlight: function (column_indexes, node_id) {
      return;
    },

    /**
            * @name InCHlib2#dendrogram_node_unhighlight
            * @event
            * @param {function} function() callback function for the dendrogram node unhighlight event
            * @eventData {string} node_id Id of the dendrogram node

            * @example 
            * instance.events.dendrogram_node_unhighlight = (
            *    function(node_id) {
            *       alert(node_id);
            *    }
            * ); 
            * 
            */
    dendrogram_node_unhighlight: function (node_id) {
      return;
    },

    /**
            * @name InCHlib2#column_dendrogram_node_unhighlight
            * @event
            * @param {function} function() callback function for the column dendrogram node unhighlight event
            * @eventData {string} node_id Id of the column dendrogram node

            * @example 
            * instance.events.column_dendrogram_node_unhighlight = (
            *    function(node_id) {
            *       alert(node_id);
            *    }
            * ); 
            * 
            */
    column_dendrogram_node_unhighlight: function (node_id) {
      return;
    },

    /**
            * @name InCHlib2#heatmap_onmouseout
            * @event
            * @param {function} function() callback function for mouse cursor out of hte heatmap area
            * @eventData {object} event event object

            * @example 
            * instance.events.heatmap_onmouseout = (
            *    function(evt) {
            *       alert("now");
            *    }
            * ); 
            * 
            */
    heatmap_onmouseout: function (evt) {
      return;
    },

    /**
            * @name InCHlib2#on_zoom
            * @event
            * @param {function} function() callback function for zoom event
            * @eventData {string} node_id Id of the dendrogram node

            * @example 
            * instance.events.on_zoom = (
            *    function(node_id) {
            *       alert(node_id);
            *    }
            * ); 
            * 
            */
    on_zoom: function (object_ids, node_id) {
      return;
    },

    /**
            * @name InCHlib2#on_unzoom
            * @event
            * @param {function} function() callback function for unzoom event
            * @eventData {string} node_id Id of the dendrogram node

            * @example 
            * instance.events.on_unzoom = (
            *    function(node_id) {
            *       alert(node_id);
            *    }
            * ); 
            * 
            */
    on_unzoom: function (node_id) {
      return;
    },

    /**
            * @name InCHlib2#on_columns_zoom
            * @event
            * @param {function} function() callback function for columns zoom event
            * @eventData {array} array array of column indexes
            * @eventData {string} node_id Id of the column dendrogram node

            * @example 
            * instance.events.on_columns_zoom = (
            *    function(column_indexes, node_id) {
            *       alert(column_indexes, node_id);
            *    }
            * ); 
            * 
            */
    on_columns_zoom: function (column_indexes, node_id) {
      return;
    },

    /**
            * @name InCHlib2#on_columns_unzoom
            * @event
            * @param {function} function() callback function for columns unzoom event
            * @eventData {string} node_id Id of the column dendrogram node

            * @example 
            * instance.events.on_columns_unzoom = (
            *    function(node_id) {
            *       alert(node_id);
            *    }
            * ); 
            * 
            */
    on_columns_unzoom: function (node_id) {
      return;
    },

    /**
     * @name InCHlib2#on_refresh
     * @event
     * @param {function} function() callback function for refresh icon click event
     * @eventData {object} event event object
     * @example
     * instance.events.on_refresh = (
     *    function() {
     *       alert("now");
     *    }
     * );
     *
     */
    on_refresh: function () {
      return;
    },

    /**
            * @name InCHlib2#empty_space_onclick
            * @event
            * @param {function} function() callback function for click on empty(inactive) space in the visualization (e.g., around the heatmap)
            * @eventData {object} event event object

            * @example 
            * instance.events.empty_space_onclick = (
            *    function(evt) {
            *       alert("now");
            *    }
            * ); 
            * 
            */
    empty_space_onclick: function (evt) {
      return;
    },
  };

  /**
   * Default color scales
   * @name InCHlib2#colors
   */
  self.colors = {
    YlGn: { start: { r: 255, g: 255, b: 204 }, end: { r: 35, g: 132, b: 67 } },
    GnBu: { start: { r: 240, g: 249, b: 232 }, end: { r: 43, g: 140, b: 190 } },
    BuGn: { start: { r: 237, g: 248, b: 251 }, end: { r: 35, g: 139, b: 69 } },
    PuBu: { start: { r: 241, g: 238, b: 246 }, end: { r: 5, g: 112, b: 176 } },
    BuPu: { start: { r: 237, g: 248, b: 251 }, end: { r: 136, g: 65, b: 157 } },
    RdPu: { start: { r: 254, g: 235, b: 226 }, end: { r: 174, g: 1, b: 126 } },
    PuRd: { start: { r: 241, g: 238, b: 246 }, end: { r: 206, g: 18, b: 86 } },
    OrRd: { start: { r: 254, g: 240, b: 217 }, end: { r: 215, g: 48, b: 31 } },
    Purples2: {
      start: { r: 242, g: 240, b: 247 },
      end: { r: 106, g: 81, b: 163 },
    },
    Blues: {
      start: { r: 239, g: 243, b: 255 },
      end: { r: 33, g: 113, b: 181 },
    },
    Greens: {
      start: { r: 237, g: 248, b: 233 },
      end: { r: 35, g: 139, b: 69 },
    },
    Oranges: {
      start: { r: 254, g: 237, b: 222 },
      end: { r: 217, g: 71, b: 1 },
    },
    Reds: { start: { r: 254, g: 229, b: 217 }, end: { r: 203, g: 24, b: 29 } },
    Greys: { start: { r: 247, g: 247, b: 247 }, end: { r: 82, g: 82, b: 82 } },
    PuOr: { start: { r: 230, g: 97, b: 1 }, end: { r: 94, g: 60, b: 153 } },
    BrBG: { start: { r: 166, g: 97, b: 26 }, end: { r: 1, g: 133, b: 113 } },
    RdBu: { start: { r: 202, g: 0, b: 32 }, end: { r: 5, g: 113, b: 176 } },
    RdGy: { start: { r: 202, g: 0, b: 32 }, end: { r: 64, g: 64, b: 64 } },
    BuYl: { start: { r: 5, g: 113, b: 176 }, end: { r: 250, g: 233, b: 42 } },
    YlOrR: {
      start: { r: 255, g: 255, b: 178 },
      end: { r: 227, g: 26, b: 28 },
      middle: { r: 204, g: 76, b: 2 },
    },
    YlOrB: {
      start: { r: 255, g: 255, b: 212 },
      end: { r: 5, g: 112, b: 176 },
      middle: { r: 204, g: 76, b: 2 },
    },
    PRGn2: {
      start: { r: 123, g: 50, b: 148 },
      end: { r: 0, g: 136, b: 55 },
      middle: { r: 202, g: 0, b: 32 },
    },
    PiYG2: {
      start: { r: 208, g: 28, b: 139 },
      end: { r: 77, g: 172, b: 38 },
      middle: { r: 255, g: 255, b: 178 },
    },
    YlGnBu: {
      start: { r: 255, g: 255, b: 204 },
      end: { r: 34, g: 94, b: 168 },
      middle: { r: 35, g: 132, b: 67 },
    },
    RdYlBu: {
      start: { r: 215, g: 25, b: 28 },
      end: { r: 44, g: 123, b: 182 },
      middle: { r: 255, g: 255, b: 178 },
    },
    RdYlGn: {
      start: { r: 215, g: 25, b: 28 },
      end: { r: 26, g: 150, b: 65 },
      middle: { r: 255, g: 255, b: 178 },
    },
    BuWhRd: {
      start: { r: 33, g: 113, b: 181 },
      middle: { r: 255, g: 255, b: 255 },
      end: { r: 215, g: 25, b: 28 },
    },
    RdLrBu: {
      start: { r: 215, g: 25, b: 28 },
      middle: { r: 254, g: 229, b: 217 },
      end: { r: 44, g: 123, b: 182 },
    },
    RdBkGr: {
      start: { r: 215, g: 25, b: 28 },
      middle: { r: 0, g: 0, b: 0 },
      end: { r: 35, g: 139, b: 69 },
    },
    RdLrGr: {
      start: { r: 215, g: 25, b: 28 },
      middle: { r: 254, g: 229, b: 217 },
      end: { r: 35, g: 139, b: 69 },
    },
  };

  function createGradientTexture(width, height, colorStops) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    for (let i = 0; i < colorStops.length; i += 2) {
      gradient.addColorStop(colorStops[i], colorStops[i + 1]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    return PIXI.Texture.from(canvas);
  }

  // Extend PIXI.Sprite to include fillLinearGradientColorStops
  PIXI.Sprite.prototype.fillLinearGradientColorStops = function (colorStops) {
    const texture = createGradientTexture(this.width, this.height, colorStops);
    this.texture = texture;
  };

  function rgbToHex(rgb) {
    // Use a regular expression to match the RGB format and extract r, g, and b
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);

    // If the result is not null, convert to hex
    if (result) {
      const r = parseInt(result[1], 10);
      const g = parseInt(result[2], 10);
      const b = parseInt(result[3], 10);

      // Convert each component to hex and pad with zero if necessary
      return (
        "#" +
        ((1 << 24) | (r << 16) | (g << 8) | b)
          .toString(16)
          .slice(1)
          .toUpperCase()
      );
    } else {
      // Return the original string if it's not in RGB format
      return rgb;
    }
  }

  const texture  = PIXI.Texture.WHITE;

  self.objects_ref = {
    node: function (
      left_distance,
      y1,
      x1,
      y2,
      x2,
      y3,
      right_distance,
      y4,
      id,
      color = 0x000000,
      width = 2
    ) {
      var node = new PIXI.Graphics();
      node
        .lineStyle(width, color) // gray color in hex, 2px width
        .moveTo(left_distance, y1)
        .lineTo(x1, y2)
        .lineTo(x2, y3)
        .lineTo(right_distance, y4);

      node.left_distance = left_distance;
      node.y1 = y1;
      node.x1 = x1;
      node.y2 = y2;
      node.x2 = x2;
      node.y3 = y3;
      node.y4 = y4;
      node.id = id;
      node.id = id;
      node.right_distance = right_distance;

      // If you want to give it an id, although this is not native functionality in PixiJS:

      node.hitArea = node.getBounds();
      node.path_id = id;
      node.on("click", function (evt) {
        console.log("This click rect mouse up", node.id);
        //self._highlight_cluster(node.id);
      });

      node.interactive = true;
      return node;
    },
    node_rect: function (x, y, width, height, path_id, path) {
      var rect = new PIXI.Graphics();

      rect
        .beginFill(0xff0000, 0) // 0xFFFFFF is white color, and opacity is set to 0
        .drawRect(x, y, width, height)
        .endFill();

      // If you want to give it properties similar to KineticJS, although this is not native functionality in PixiJS:
      rect.id = [path_id, "rect"].join("_");
      rect.path = path;
      rect.path_id = path_id;
      rect.interactive = true;

      return rect;
    },

  
    heatmap_line: function (options) {
      // Create a PIXI.Sprite
      /* const spriteTexture = self.objects_ref.createTextureForColor(
        color,
        pixels_for_leaf,
        opacity
      );*/
      
      //console.log(x1, x2, y1, y2);
      // Set the position of the sprite
      const sprite = new PIXI.Sprite(texture);
      sprite.x = options.x1;
      sprite.y = options.y1 - options.pixels_for_leaf / 2;
      sprite.width = options.x2 - options.x1;
      sprite.height = options.y2 - options.y1 || options.pixels_for_leaf;
      sprite.tint = options.color;
      sprite.alpha = options.opacity ? options.opacity : 1;
      sprite.row_id = options.row_id;
      sprite.col_id = options.col_id;
      sprite.cullable = true;
      // If you want to give it additional properties:
      sprite.value = options.text_value;
      sprite.column = options.col_index;
      sprite.interactive = false;
      //sprite.hitArea = sprite.getBounds();

      /*sprite.onclick = (evt) => {
        //TODO Check working
        console.log("This click is to a heatmao rectangle", evt, sprite);
      };*/
      return sprite;
    },

    heatmap_value: function (options) {
      let style = new PIXI.TextStyle({
        fontFamily: self.settings.font,
        fontSize: options.fontSize || self.row_id_size,
        fill: options.fill || self.settings.heatmap_font_color,
        fontStyle: options.fontStyle || "bold",
        resolution: window.devicePixelRatio || 1,
      });

      let text = new PIXI.Text(options.text || "", style);
      text.x = options.x || 0;
      text.y = options.y || 0;
      text.defaultResolution = 2;
      text.interactive = false;
      text.defaultAutoResolution = false;

      return text;
    },

    rect_gradient: function createGradientRect(options) {
      // Create a temporary canvas to draw the gradient
      let canvas = document.createElement("canvas");
      canvas.width = options.width || 100;
      canvas.height = options.height || 20;
      let ctx = canvas.getContext("2d");

      // Create a linear gradient
      let gradient = ctx.createLinearGradient(
        options.fillLinearGradientStartPoint.x || 0,
        options.fillLinearGradientStartPoint.y || 80,
        options.fillLinearGradientEndPoint.x || 100,
        options.fillLinearGradientEndPoint.y || 80
      );

      // Add color stops (assuming color_steps is an array of [position, color] arrays)
      if (options.fillLinearGradientColorStops) {
        for (
          let i = 0;
          i < options.fillLinearGradientColorStops.length;
          i = i + 2
        ) {
          gradient.addColorStop(
            options.fillLinearGradientColorStops[i],
            options.fillLinearGradientColorStops[i + 1]
          );
        }
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Convert the canvas to a PIXI texture and then to a sprite
      let texture = PIXI.Texture.from(canvas);
      let sprite = new PIXI.Sprite(texture);

      sprite.x = options.x || 0;
      sprite.y = options.y || 80;
      sprite.label = options.label || "Color settings";
      sprite.id = options.id || self.settings.target + "_color_scale";

      // Adding a border if needed
      if (options.stroke && options.strokeWidth) {
        let graphics = new PIXI.Graphics();
        graphics.lineStyle(
          parseInt(options.strokeWidth, 10),
          parseInt(options.stroke.slice(1), 16),
          1
        );

        graphics.drawRect(0, 0, canvas.width, canvas.height);
        sprite.addChild(graphics);
      }
      //TODO: IS this supposed to be listening
      return sprite;
    },
    createTextureForColor: function (color, size, opacity = 1) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Set the fill color with opacity
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;

      // Draw a filled rectangle
      ctx.fillRect(0, 0, size, size);

      // Create a PIXI.Texture from the canvas
      const texture = PIXI.Texture.from(canvas);

      return texture;
    },
    tooltip_text: function createTooltipText(options) {
      var tooltip = new PIXI.Text(options.text, {
        fontFamily: options.font || self.settings.font,
        fontSize: 12,
        fill: options.fill || "white",
        fontWeight: options.fontWeight || "bold",
        align: "center",
        padding: 8,
        //lineHeight: 1.2,
        wordWrap: true,
      });

      //tooltip.anchor.set(0.5, 0.5);
      tooltip.x = options.x || (100 - tooltip.width) / 2;
      tooltip.y = options.y || (50 - tooltip.height) / 2;
      //tooltip.y = options.y || (50-tooltip.height)/2;
      tooltip.interactive = false;
      return tooltip;
    },
    column_header: function createColumn_header(options) {
      var columnHeader = new PIXI.Text(options.text, {
        fontFamily: options.font ? options.font : self.settings.font,
        fontSize: options.fontSize ? options.fontSize : 12,
        fill: "black",
        fontWeight: "bold",
        //align: "center",
        //padding: 8,
        //lineHeight: 1.2,
      });
      columnHeader.x = options.x;
      columnHeader.y = options.y;
      columnHeader.rotation = options.rotation ? options.rotation : 0;
      columnHeader.position_index = options.position_index;
      columnHeader.interactive = false;
      return columnHeader;
    },
    count: function count(options) {
      var count = new PIXI.Text(options.text, {
        fontFamily: self.settings.font,
        fontSize: 10,
        fill: "#6d6b6a",
        fontWeight: "bold",
        //align: "center",
        //padding: 8,
        //lineHeight: 1.2,
      });
      count.x = options.x;
      count.y = options.y;
      count.interactive = false;
      return count;
    },
    cluster_overlay: function clusterOverlay(options) {
      // Create a sprite using the white texture
      var clusterOverlay = new PIXI.Sprite(PIXI.Texture.WHITE);

      // Set the size of the sprite
      clusterOverlay.width = options.width;
      clusterOverlay.height = options.height;
      clusterOverlay.x = options.x;
      clusterOverlay.y = options.y;
      // Set the color and opacity
      clusterOverlay.tint = options.fill
        ? parseInt(options.fill.slice(1), 16)
        : 0xffffff; // Convert hex color to number
      clusterOverlay.alpha = options.opacity ? options.opacity : 0.5;

      return clusterOverlay;
    },
    icon_overlay: function iconOverlay(options) {
      // Create a sprite using the white texture
      var iconOverlay = new PIXI.Sprite(PIXI.Texture.WHITE);

      // Set the size of the sprite
      iconOverlay.width = 32;
      iconOverlay.height = 32;
      iconOverlay.x = options.x;
      iconOverlay.y = options.y;
      // Set the color and opacity
      iconOverlay.tint = options.fill
        ? parseInt(options.fill.slice(1), 16)
        : 0xffffff; // Convert hex color to number
      iconOverlay.alpha = 0;

      return iconOverlay;
    },
    cluster_border: function createClusterBorder(options) {
      var clusterBorder = new PIXI.Graphics();

      // Set line style
      clusterBorder.lineStyle(
        options.strokeWidth || 1,
        options.stroke ? parseInt(options.stroke.slice(1), 16) : 0x000000
      );

      // Custom method to draw a dashed line
      drawDashedLine(clusterBorder, options.points, options.dash || [6, 2]);

      return clusterBorder;
    },

    tooltip_tag: function createTooltipTag(options) {
      var tooltipTag = new PIXI.Graphics();

      // Set the fill color
      //console.log("108", options);
      tooltipTag.beginFill(
        options.fill ? parseInt(options.fill.slice(1), 16) : 0xffffff
      );

      // Draw the tag shape
      const width = options.width || 100; // default width
      const height = options.height || 50; // default height
      const pointerWidth = options.pointerWidth || 10;
      const pointerHeight = options.pointerHeight || 10;
      const pointerDirection = options.pointerDirection || "down";

      drawTagShape(
        tooltipTag,
        width,
        height,
        pointerWidth,
        pointerHeight,
        pointerDirection
      );

      tooltipTag.endFill();

      return tooltipTag;
    },
    tooltip_label: function createTooltipLabel(options) {
      var tooltipLabel = new PIXI.Container();

      // Set position
      tooltipLabel.x = options.x;
      tooltipLabel.y = options.y;
      tooltipLabel.interactive = false;
      tooltipLabel.id = options.id || "";
      // Set opacity
      tooltipLabel.alpha = options.opacity !== undefined ? options.opacity : 1;
      return tooltipLabel;
    },
    image: function createImageWithStroke(options) {
      // Create a sprite from the image
      var sprite = new PIXI.Sprite(PIXI.Texture.from(options.image));

      /*
      // Create a container to hold both the sprite and its stroke
      var container = new PIXI.Container();

      // Add the sprite to the container
      container.addChild(sprite);

      // If stroke is needed, create a rectangle around the sprite using Graphics
      if (options.stroke && options.strokeWidth) {
        var strokeGraphics = new PIXI.Graphics();
        strokeGraphics.lineStyle(
          options.strokeWidth,
          parseInt(options.stroke.slice(1), 16)
        );
        strokeGraphics.drawRect(0, 0, sprite.width, sprite.height);
        container.addChild(strokeGraphics);
      }
      container.sprite = sprite;
      */
      return sprite;
    },
  };

  function drawDashedLine(graphics, points, dashPattern) {
    if (points.length < 4) return; // Need at least two points (x1, y1, x2, y2)

    let [x1, y1, x2, y2] = points;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dashLength = dashPattern[0];
    const gapLength = dashPattern[1];
    let dashCount = Math.floor(distance / (dashLength + gapLength));

    let startX = x1;
    let startY = y1;
    for (let i = 0; i < dashCount; i++) {
      let endX = startX + dx / dashCount;
      let endY = startY + dy / dashCount;

      if (i % 2 === 0) {
        graphics.moveTo(startX, startY);
        graphics.lineTo(endX, endY);
      }

      startX = endX + (dx / dashCount) * (gapLength / dashLength);
      startY = endY + (dy / dashCount) * (gapLength / dashLength);
    }
  }

  function drawTagShape(
    graphics,
    width,
    height,
    pointerWidth,
    pointerHeight,
    pointerDirection
  ) {
    // Start drawing the tag shape
    graphics.moveTo(0, 0);

    if (pointerDirection === "down") {
      graphics.lineTo((width - pointerWidth) / 2, 0);
      graphics.lineTo(width / 2, -pointerHeight);
      graphics.lineTo((width + pointerWidth) / 2, 0);
    }
    
    graphics.lineTo(width, 0);
    graphics.lineTo(width, height);

    if (pointerDirection === "up") {
      graphics.lineTo((width + pointerWidth) / 2, height);
      graphics.lineTo(width / 2, height + pointerHeight);
      graphics.lineTo((width - pointerWidth) / 2, height);     
    }

    graphics.lineTo(0, height);
    graphics.closePath();
  }

  /**
   * Default kineticjs objects references
   * @name InCHlib2#objects_ref
   */
  /*
  self.objects_ref = {
   

    icon: new Kinetic.Path({
      fill: "grey",
    }),


  };
*/
  self.paths_ref = {
    zoom_icon:
      "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM15.687,9.051h-4v2.833H8.854v4.001h2.833v2.833h4v-2.834h2.832v-3.999h-2.833V9.051z",
    unzoom_icon:
      "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM8.854,11.884v4.001l9.665-0.001v-3.999L8.854,11.884z",
    lightbulb:
      "M15.5,2.833c-3.866,0-7,3.134-7,7c0,3.859,3.945,4.937,4.223,9.499h5.553c0.278-4.562,4.224-5.639,4.224-9.499C22.5,5.968,19.366,2.833,15.5,2.833zM15.5,28.166c1.894,0,2.483-1.027,2.667-1.666h-5.334C13.017,27.139,13.606,28.166,15.5,28.166zM12.75,25.498h5.5v-5.164h-5.5V25.498z",
  };
}

InCHlib2.prototype._update_user_settings = function (settings) {
  var self = this;
  var updated_settings = {},
    key;
  for (
    var i = 0, keys = Object.keys(settings), len = keys.length;
    i < len;
    i++
  ) {
    key = keys[i];
    if (
      self.user_settings[key] !== undefined &&
      self.user_settings[key] !== settings[key] &&
      self.user_settings[key] === true
    ) {
      updated_settings[key] = false;
    } else if (self.user_settings[key] === undefined) {
      updated_settings[key] = settings[key];
    }
  }
  $.extend(self.settings, updated_settings);
};

/**
 * Read data from JSON variable.
 *
 * @param {object} [variable] Clustering in proper JSON format.
 */
InCHlib2.prototype.read_data = function (json2) {
  var json = JSON.parse(JSON.stringify(json2));
  var self = this;
  self.json = json;
  self.data = JSON.parse(JSON.stringify(self.json.data));

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

  if (
    self.json["alternative_data"] !== undefined &&
    self.settings.alternative_data
  ) {
    self.alternative_data = self.json.alternative_data.nodes;
  } else {
    settings.alternative_data = false;
  }

  self._update_user_settings(settings);
  self._add_prefix();
};

/**
 * Read data from JSON file.
 *
 * @param {string} [filename] Path to the JSON data file.
 *
 */
InCHlib2.prototype.read_data_from_file = function (json) {
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
};

InCHlib2.prototype._add_prefix = function () {
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

  if (self.settings.alternative_data) {
    var alternative_data = {};
    for (
      var i = 0, keys = Object.keys(self.alternative_data), len = keys.length;
      i < len;
      i++
    ) {
      id = [self.settings.target, keys[i]].join("#");
      alternative_data[id] = self.alternative_data[keys[i]];
    }
    self.alternative_data = alternative_data;
  }

  if (self.column_dendrogram) {
    Object.seal(self.column_dendrogram.nodes);
    self.column_dendrogram.nodes = self._add_prefix_to_data(
      self.column_dendrogram.nodes
    );
  }
};

InCHlib2.prototype._add_prefix_to_data = function (data) {
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

    if (prefixed_data[id]["count"] != 1) {
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
};

InCHlib2.prototype._get_root_id = function (nodes) {
  var self = this;
  var root_id;
  for (var i = 0, keys = Object.keys(nodes), len = keys.length; i < len; i++) {
    if (nodes[keys[i]]["parent"] === undefined) {
      root_id = keys[i];
      break;
    }
  }
  return root_id;
};

InCHlib2.prototype._get_dimensions = function () {
  var self = this;
  var dimensions = { data: 0, metadata: 0, overall: 0 },
    key,
    keys,
    i;
  var len = 0;
  if (self.settings.images_as_alternative_data) {
    dimensions["data"] =
      self.alternative_data[Object.keys(self.alternative_data)[0]].length;
  } else {
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
  }

  if (self.settings.metadata) {
    key = Object.keys(self.metadata.nodes)[0];
    dimensions["metadata"] = self.metadata.nodes[key].length;
  }

  dimensions["overall"] = dimensions["data"] + dimensions["metadata"];
  return dimensions;
};

/*
InCHlib2.prototype._get_min_max_middle = function (data) {
  var self = this;
  var i, len;
  var min_max_middle = [];
  var all = [];

  for (i = 0, len = data.length; i < len; i++) {
    all = all.concat(
      data[i].filter(function (x) {
        return x !== null;
      })
    );
  }

  len = all.length;
  all.sort(function (a, b) {
    return a - b;
  });
  min_max_middle.push(
    self.settings.min_percentile > 0
      ? all[self._hack_round((len * self.settings.min_percentile) / 100)]
      : Math.min.apply(null, all)
  );
  min_max_middle.push(
    self.settings.max_percentile < 100
      ? all[self._hack_round((len * self.settings.max_percentile) / 100)]
      : Math.max.apply(null, all)
  );
  min_max_middle.push(
    self.settings.middle_percentile !== 50
      ? all[self._hack_round((len * self.settings.middle_percentile) / 100)]
      : all[self._hack_round((len - 1) / 2)]
  );
  return min_max_middle;
};
*/
InCHlib2.prototype._get_min_max_middle = function (data) {
  var self = this;
  var all = [];
  var min_value, max_value, middle_value;

  // Concatenate all non-null values from data into all
  for (var i = 0; i < data.length; i++) {
    all = all.concat(
      data[i].filter(function (x) {
        return x !== null;
      })
    );
  }

  // Sort all values to find min and max after sorting
  all.sort(function (a, b) {
    return a - b;
  });

  // Now that it's sorted, the first element is min and the last element is max
  min_value = all[0];
  max_value = all[all.length - 1];

  // Calculate the indices for the percentiles
  var len = all.length;
  var min_index = self._hack_round((len * self.settings.min_percentile) / 100);
  var max_index = self._hack_round((len * self.settings.max_percentile) / 100);
  var middle_index = self._hack_round(
    (len * self.settings.middle_percentile) / 100
  );

  // Get min, max, middle values based on percentiles
  min_value = self.settings.min_percentile > 0 ? all[min_index] : min_value;
  max_value = self.settings.max_percentile < 100 ? all[max_index] : max_value;
  middle_value =
    self.settings.middle_percentile !== 50
      ? all[middle_index]
      : all[self._hack_round((len - 1) / 2)];

  // Return the min, max, and middle values
  return [min_value, max_value, middle_value];
};

InCHlib2.prototype._get_data_min_max_middle = function (data, axis) {
  var self = this;
  if (axis === undefined) {
    axis = "column";
  }

  var i, j, value, len, columns;
  var data_length = data[0].length;

  if (axis === "column") {
    columns = [];

    for (i = 0; i < data_length; i++) {
      columns.push([]);
    }

    for (i = 0; i < data.length; i++) {
      for (j = 0; j < data_length; j++) {
        value = data[i][j];
        if (value !== null && value !== undefined) {
          columns[j].push(value);
        }
      }
    }
  } else {
    columns = data.slice(0);
  }

  var data2descs = {};
  var data_min_max_middle = [],
    min,
    max,
    middle;

  for (i = 0; i < columns.length; i++) {
    if (self._is_number(columns[i][0])) {
      columns[i] = columns[i].map(parseFloat);
      columns[i].sort(function (a, b) {
        return a - b;
      });
      len = columns[i].length;
      max =
        self.settings.max_percentile < 100
          ? columns[i][
              self._hack_round((len * self.settings.max_percentile) / 100)
            ]
          : Math.max.apply(null, columns[i]);
      min =
        self.settings.min_percentile > 0
          ? columns[i][
              self._hack_round((len * self.settings.min_percentile) / 100)
            ]
          : Math.min.apply(null, columns[i]);
      middle =
        self.settings.middle_percentile != 50
          ? columns[i][
              self._hack_round((len * self.settings.middle_percentile) / 100)
            ]
          : columns[i][self._hack_round((len - 1) / 2)];
      data2descs[i] = { min: min, max: max, middle: middle };
    } else {
      var hash_object = self._get_hash_object(columns[i]);
      min = 0;
      max = self._hack_size(hash_object) - 1;
      middle = max / 2;
      data2descs[i] = {
        min: min,
        max: max,
        middle: middle,
        str2num: hash_object,
      };
    }
  }

  return data2descs;
};

InCHlib2.prototype._get_hash_object = function (array) {
  var self = this;
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
};

InCHlib2.prototype._get_max_length = function (items) {
  var lengths = items.map(function (x) {
    return ("" + x).length;
  });
  var max = Math.max.apply(Math, lengths);
  return max;
};

InCHlib2.prototype._get_max_value_length = function () {
  var self = this;
  var nodes = self.data.nodes;
  var max_length = 0;
  var node_data, key;

  if (self.settings.alternative_data) {
    if (self.settings.images_as_alternative_data) {
      max_length = 0;
    } else {
      for (
        var i = 0, keys = Object.keys(self.alternative_data), len = keys.length;
        i < len;
        i++
      ) {
        key = keys[i];
        node_data = self.alternative_data[key];
        for (var j = 0, len_2 = node_data.length; j < len_2; j++) {
          if (("" + node_data[j]).length > max_length) {
            max_length = ("" + node_data[j]).length;
          }
        }
      }
    }
  } else {
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
};

InCHlib2.prototype._preprocess_heatmap_data = function () {
  var self = this;
  var heatmap_array = [],
    i,
    j = 0,
    keys,
    key,
    len,
    data,
    node;

  for (
    i = 0, keys = Object.keys(self.data.nodes), len = keys.length;
    i < len;
    i++
  ) {
    key = keys[i];
    node = self.data.nodes[key];
    if (node.count === 1) {
      data = node.features;
      heatmap_array.push([key]);
      heatmap_array[j].push.apply(heatmap_array[j], data);
      if (self.settings.metadata) {
        heatmap_array[j].push.apply(heatmap_array[j], self.metadata.nodes[key]);
      }
      j++;
    }
  }
  return heatmap_array;
};

InCHlib2.prototype._reorder_heatmap = function (column_index) {
  var self = this;
  self.leaves_y_coordinates = {};
  column_index++;

  if (self.ordered_by_index === column_index) {
    self.heatmap_array.reverse();
  } else {
    if (self._is_number(self.heatmap_array[0][column_index])) {
      self.heatmap_array.sort(function (a, b) {
        return a[column_index] == null
          ? -1
          : b[column_index] == null
            ? 1
            : a[column_index] - b[column_index];
      });
    } else {
      self.heatmap_array.sort(function (a, b) {
        return a[column_index] == null
          ? -1
          : b[column_index] == null
            ? 1
            : a[column_index] > b[column_index]
              ? 1
              : a[column_index] < b[column_index]
                ? -1
                : 0;
      });
    }
  }

  var y = self.pixels_for_leaf / 2 + self.header_height;

  for (var i = 0, len = self.heatmap_array.length; i < len; i++) {
    self.leaves_y_coordinates[self.heatmap_array[i][0]] = y;
    y += self.pixels_for_leaf;
  }

  self.ordered_by_index = column_index;
};

/**
 * Draw already read data (from file/JSON variable).
 */
InCHlib2.prototype.draw = function () {
  var self = this;
  console.log("CRITICAL 3", self.app === null);
  if (!self.app || !self.app.renderer || !self.app.stage) return;
  console.log("STARTING TO DRAW");
  self.zoomed_clusters = { row: [], column: [] };
  self.last_highlighted_cluster = null;
  self.current_object_ids = [];
  self.current_column_ids = [];
  self.highlighted_rows_y = [];
  self.heatmap_array = self._preprocess_heatmap_data();
  self.on_features = { data: [], metadata: [], count_column: [] };

  self.column_metadata_rows = self.settings.column_metadata
    ? self.column_metadata.features.length
    : 0;
  self.column_metadata_height =
    self.column_metadata_rows * self.settings.column_metadata_row_height;

  if (self.settings.heatmap) {
    self.last_column = null;
    self.dimensions = self._get_dimensions();
    self._set_heatmap_settings();
  } else {
    self.dimensions = { data: 0, metadata: 0, overall: 0 };
    self.settings.heatmap_header = false;
    self.settings.column_dendrogram = false;
  }

  self._adjust_leaf_size(self.heatmap_array.length);

  if (self.settings.draw_row_ids) {
    self._get_row_id_size();
  } else {
    self.right_margin = 100;
  }

  self._adjust_horizontal_sizes();
  self.top_heatmap_distance =
    self.header_height +
    self.column_metadata_height +
    self.settings.column_metadata_row_height / 2;

  if (self.settings.column_dendrogram && self.heatmap_header) {
    self.footer_height = 150;
  }

  /*
  self.stage = new Kinetic.Stage({
    container: self.settings.target,
  });*/
  self.settings.height =
    self.heatmap_array.length * self.pixels_for_leaf +
    self.header_height +
    self.footer_height;

  self.app?.renderer?.resize(self.settings.width, self.settings.height);

  /*
  self.app = new PIXI.Application({
    width: self.settings.width,
    height: self.settings.height,
    autoResize: true,
    resolution: devicePixelRatio * 1,
    antialias: true,
    transparent: true,
    background: 0xffffff,
  });*/

  if (self.stage) self.stage.removeChildren();
  self.stage = self.app?.stage;
  console.log(self.app, "self.app");

  //document.body.appendChild(this.app.view);
  self.settings.height =
    self.heatmap_array.length * self.pixels_for_leaf +
    self.header_height +
    self.footer_height;

  //document.getElementById(self.settings.target).innerHTML = "";
  //document.getElementById(self.settings.target)?.appendChild(self.app.view);

  //self.stage.setWidth(self.settings.width);
  //self.stage.setHeight(self.settings.height);

  self._draw_stage_layer();

  if (self.settings.dendrogram) {
    self.timer = 0;
    self._draw_dendrogram_layers();
    self.root_id = self._get_root_id(self.data.nodes);
    self._draw_row_dendrogram(self.root_id);

    if (self.settings.column_dendrogram && self.settings.dendrogram) {
      self.column_root_id = self._get_root_id(self.column_dendrogram.nodes);
      self.nodes2columns = false;
      self.columns_start_index = 0;
      self._draw_column_dendrogram(self.column_root_id);
    }
  } else {
    self.settings.column_dendrogram = false;
    self._reorder_heatmap(0);
    self.ordered_by_index = 0;
  }

  if (self.settings.images_as_alternative_data) {
    self.path2image = {};
    self.path2image_obj = {};
    self.image_counter = 0;
  }
  this.app.ticker.stop();
  self._draw_heatmap();
  self._draw_heatmap_header();
  //self.stage.removeChild(self.heatmap_layer);
  self.heatmap_layer.zIndex = 10;
  //self.stage.addChild(self.heatmap_layer);
  moveToBottom(self.stage_layer); //I added
  moveToTop(self.dendrogram_layer);

  //this.app.renderer.render(this.app.stage);
  //self.app.ticker.stop();
  self._draw_navigation();
  moveToTop(self.navigation_layer);
  self.highlight_rows(self.settings.highlighted_rows);
  self.refresh();
};

InCHlib2.prototype._draw_dendrogram_layers = function () {
  var self = this;
  self.cluster_layer = new PIXI.Container();
  self.dendrogram_hover_layer = new PIXI.Container();
  if (!self.stage) {
    console.log("Stage missing!");
    return;
  }
  self.stage.addChild(self.dendrogram_hover_layer, self.cluster_layer);
  self.cluster_layer.interactive = true;
  self.cluster_layer.on("click", function (evt) {
    console.log("This click is working  self.cluster_layer.on");
    self.unhighlight_cluster();
    self.unhighlight_column_cluster();
    self.events.empty_space_onclick(evt);
  });
};

InCHlib2.prototype._draw_row_dendrogram = function (node_id) {
  var self = this;
  if (!self.app || !self.app.render) return;
  self.dendrogram_layer = new PIXI.Container();
  var node = self.data.nodes[node_id];
  var count = node.count;

  self.distance_step = self.distance / node.distance;
  self.leaves_y_coordinates = {};
  self.objects2leaves = {};

  self._adjust_leaf_size(count);
  self.settings.height =
    count * self.pixels_for_leaf +
    self.header_height +
    self.footer_height +
    self.column_metadata_height;

  //self.stage.setWidth(self.settings.width); //TODO: DO we need these?
  //self.stage.setHeight(self.settings.height);
  self.app.renderer.resize(self.settings.width, self.settings.height);
  self.app.cullable =true;
  var current_left_count = 0;
  var current_right_count = 0;
  var y =
    self.header_height + self.column_metadata_height + self.pixels_for_leaf / 2;

  if (node.count > 1) {
    current_left_count = self.data.nodes[node.left_child].count;
    current_right_count = self.data.nodes[node.right_child].count;
  }
  self._draw_row_dendrogram_node(
    node_id,
    node,
    current_left_count,
    current_right_count,
    0,
    y
  );
  self.middle_item_count = (self.min_item_count + self.max_item_count) / 2;
  self._draw_distance_scale(node.distance);
  self.dendrogram_layer.interactive = true;
  self.stage.addChild(self.dendrogram_layer);
  moveToTop(self.dendrogram_layer);
  self._bind_dendrogram_hover_events(self.dendrogram_layer);

  self.dendrogram_layer.on("click", function (evt) {
    console.log(
      "This click working self.dendrogram_layer.on",
      self.dendrogram_layer,
      evt
    );
    self._dendrogram_layers_click(this, evt);
  });

  self.dendrogram_layer.on("mousedown", function (evt) {
    console.log("This click mousedown self.dendrogram_layer.on");
    self._dendrogram_layers_mousedown(this, evt);
  });

  self.dendrogram_layer.on("mouseup", function (evt) {
    console.log("This click mouseup self.dendrogram_layer.on");
    self._dendrogram_layers_mouseup(this, evt);
  });
};

InCHlib2.prototype._draw_row_dendrogram_node = function (
  node_id,
  node,
  current_left_count,
  current_right_count,
  x,
  y
) {
  var self = this;
  if (node.count !== 1) {
    var node_neighbourhood = self._get_node_neighbourhood(
      node,
      self.data.nodes
    );
    var right_child = self.data.nodes[node.right_child];
    var left_child = self.data.nodes[node.left_child];
    var y1 = self._get_y1(
      node_neighbourhood,
      current_left_count,
      current_right_count
    );
    var y2 = self._get_y2(
      node_neighbourhood,
      current_left_count,
      current_right_count
    );
    var x1 = self._hack_round(
      self.distance - self.distance_step * node.distance
    );
    x1 = x1 === 0 ? 2 : x1;

    var x2 = x1;
    var left_distance =
      self.distance -
      self.distance_step * self.data.nodes[node.left_child].distance;
    var right_distance =
      self.distance -
      self.distance_step * self.data.nodes[node.right_child].distance;

    if (right_child.count === 1) {
      y2 = y2 + self.pixels_for_leaf / 2;
    }

    self.dendrogram_layer.addChild(
      self._draw_horizontal_path(
        node_id,
        x1,
        y1,
        x2,
        y2,
        left_distance,
        right_distance
      )
    );

    self._draw_row_dendrogram_node(
      node.left_child,
      left_child,
      current_left_count - node_neighbourhood.left_node.right_count,
      current_right_count + node_neighbourhood.left_node.right_count,
      left_distance,
      y1
    );

    self._draw_row_dendrogram_node(
      node.right_child,
      right_child,
      current_left_count + node_neighbourhood.right_node.left_count,
      current_right_count - node_neighbourhood.right_node.left_count,
      right_distance,
      y2
    );
  } else {
    var objects = node.objects;
    self.leaves_y_coordinates[node_id] = y;

    for (var i = 0, len = objects.length; i < len; i++) {
      self.objects2leaves[objects[i]] = node_id;
    }

    var count = node.objects.length;
    if (count < self.min_item_count) {
      self.min_item_count = count;
    }
    if (count > self.max_item_count) {
      self.max_item_count = count;
    }
  }
};

InCHlib2.prototype._draw_stage_layer = function () {
  var self = this;
  self.stage_layer = new PIXI.Container();
  var stage_rect = new PIXI.Graphics();
  stage_rect
    .beginFill(0xffffff, 0.1) // 0xFFFFFF is white color, 0 is opacity
    .drawRect(0, 0, self.settings.width, self.settings.height)
    .endFill();
  //stage_rect.interactive = true;
  // Remove stage_rect from the container (no effect if it's not already added)
  //self.stage_layer.removeChild(stage_rect); //TODO IS THIS NEEDED?
  self.stage_layer.addChild(stage_rect);
  if (self.stage === null) self.stage = self.app?.stage;

  if (self.stage === null) return;

  self.stage.addChild(self.stage_layer);
  moveToBottom(self.stage_layer);

  self.stage_layer.interactive = true;
  console.log("sss", self.stage_layer);
  self.stage_layer.on("click", function (evt) {
    //TODO Check working
    console.log("This click is working self.stage_layer.on", evt);
    self.unhighlight_cluster();
    self.unhighlight_column_cluster();
    self.events.empty_space_onclick(evt);
  });
};

InCHlib2.prototype._draw_column_dendrogram = function (node_id) {
  var self = this;
  self.column_dendrogram_layer = new PIXI.Container();

  self.column_x_coordinates = {};
  var node = self.column_dendrogram.nodes[node_id];
  self.current_column_count = node.count;
  self.vertical_distance = self.header_height;
  self.vertical_distance_step = self.vertical_distance / node.distance;

  self.last_highlighted_column_cluster = null;
  var current_left_count = self.column_dendrogram.nodes[node.left_child].count;
  var current_right_count =
    self.column_dendrogram.nodes[node.right_child].count;
  self._draw_column_dendrogram_node(
    node_id,
    node,
    current_left_count,
    current_right_count,
    0,
    0
  );
  self.stage.addChild(self.column_dendrogram_layer);

  if (!self.nodes2columns) {
    self.nodes2columns = self._get_nodes2columns();
  }
  self.column_dendrogram_layer.interactive = true;
  self._bind_dendrogram_hover_events(self.column_dendrogram_layer);

  self.column_dendrogram_layer.on("click", function (evt) {
    console.log("This is working  click self.column_dendrogram_layer.on ");
    self._column_dendrogram_layers_click(this, evt);
  });

  self.column_dendrogram_layer.on("mousedown", function (evt) {
    console.log("This is working  mousedown self.column_dendrogram_layer.on ");
    self._column_dendrogram_layers_mousedown(this, evt);
  });

  self.column_dendrogram_layer.on("mouseup", function (evt) {
    console.log("This is working  mouseup self.column_dendrogram_layer.on ");
    self._dendrogram_layers_mouseup(this, evt);
  });
};

InCHlib2.prototype._get_nodes2columns = function () {
  var self = this;
  var coordinates = [];
  var coordinates2nodes = {};
  var nodes2columns = {};
  var key, value, i, keys, len;

  for (
    i = 0, keys = Object.keys(self.column_x_coordinates), len = keys.length;
    i < len;
    i++
  ) {
    key = keys[i];
    value = self.column_x_coordinates[key];
    coordinates2nodes[value] = key;
    coordinates.push(value);
  }
  coordinates.sort(function (a, b) {
    return a - b;
  });

  for (i = 0, len = coordinates.length; i < len; i++) {
    nodes2columns[coordinates2nodes[coordinates[i]]] = i;
  }
  return nodes2columns;
};

InCHlib2.prototype._bind_dendrogram_hover_events = function (layer) {
  var self = this;
  //layer.interactive = true;

  layer.on("mouseover", function (evt) {
    //console.log("This is working bind_dendrogram_hover_events  mouseover");
    self._dendrogram_layers_mouseover(this, evt);
  });

  layer.on("mouseout", function (evt) {
    //console.log("This is working bind_dendrogram_hover_events  mouseout");
    self._dendrogram_layers_mouseout(this, evt);
  });
};

InCHlib2.prototype._delete_layers = function (to_destroy, to_remove_children) {
  for (var i = 0, len = to_destroy.length; i < len; i++) {
    if (to_destroy[i] !== undefined) {
      to_destroy[i].destroy({
        children: true,
        texture: true,
        baseTexture: true,
      });

      //to_destroy[i].destroy();
    }
  }

  if (to_remove_children !== undefined) {
    for (var i = 0, len = to_remove_children.length; i < len; i++) {
      to_remove_children[i].removeChildren();
      //to_remove_children[i].draw(); TODO NOT SURE WHTHER WE SHOULD COMMENT OUT THIS
    }
  }
};

/*
InCHlib2.prototype._delete_all_layers = function () {
  var self = this;
  while (self.stage.children[0]) {
    self.stage.removeChild(self.stage.children[0]).destroy();
  }
};*/

InCHlib2.prototype._delete_all_layers = function () {
  const stage = this.stage;
  while (stage.children.length > 0) {
    const child = stage.removeChild(stage.children[0]);
    child.destroy({ children: true, texture: true, baseTexture: true });
  }
};

InCHlib2.prototype._adjust_leaf_size = function (leaves) {
  var self = this;
  self.pixels_for_leaf =
    (self.settings.max_height -
      self.header_height -
      self.footer_height -
      self.column_metadata_height -
      5) /
    leaves;

  if (self.settings.draw_row_ids && self.settings.fixed_row_id_size) {
    self.settings.min_row_height = self.settings.fixed_row_id_size + 2;
  }

  if (self.pixels_for_leaf > self.settings.max_row_height) {
    self.pixels_for_leaf = self.settings.max_row_height;
  }

  if (self.settings.min_row_height > self.pixels_for_leaf) {
    self.pixels_for_leaf = self.settings.min_row_height;
  }
};

InCHlib2.prototype._adjust_horizontal_sizes = function (dimensions) {
  var self = this;
  if (dimensions === undefined) {
    dimensions = self._get_visible_count();
  }

  if (self.settings.dendrogram) {
    if (self.settings.heatmap) {
      self.heatmap_width =
        (self.settings.width -
          self.right_margin -
          self.dendrogram_heatmap_distance) *
        self.settings.heatmap_part_width;
    } else {
      self.heatmap_width = 0;
    }

    self.pixels_for_dimension =
      dimensions > 0 && self.heatmap_width > 0
        ? self.heatmap_width / dimensions
        : 0;
    if (self.pixels_for_dimension === 0) {
      self.heatmap_width = 0;
    }

    self.distance =
      self.settings.width - self.heatmap_width - self.right_margin;
    self.heatmap_distance = self.distance + self.dendrogram_heatmap_distance;
  } else {
    self.heatmap_width = self.settings.width - self.right_margin;
    self.distance = self.right_margin / 2;
    self.heatmap_distance = self.distance;
    self.pixels_for_dimension = dimensions
      ? self.heatmap_width / dimensions
      : 0;
  }

  if (
    self.settings.max_column_width &&
    self.settings.max_column_width < self.pixels_for_dimension
  ) {
    self.pixels_for_dimension = self.settings.max_column_width;
    self.heatmap_width = dimensions * self.pixels_for_dimension;

    if (self.settings.dendrogram) {
      self.distance =
        self.settings.width -
        self.heatmap_width -
        self.right_margin -
        self.dendrogram_heatmap_distance;
      self.heatmap_distance = self.distance + self.dendrogram_heatmap_distance;
    } else {
      self.distance = self._hack_round(
        (self.settings.width - self.heatmap_width) / 2
      );
      self.right_margin = self.distance;
      self.heatmap_distance = self.distance;
    }
  }
};

InCHlib2.prototype._set_color_settings = function () {
  var self = this;
  var data = [];
  var i, keys, len, node;
  for (
    i = 0, keys = Object.keys(self.data.nodes), len = keys.length;
    i < len;
    i++
  ) {
    node = self.data.nodes[keys[i]];
    if (node.count === 1) {
      data.push(node.features);
    }
  }

  self.data_descs = {};
  if (self.settings.independent_columns) {
    self.data_descs = self._get_data_min_max_middle(data);
  } else {
    var min_max_middle = self._get_min_max_middle(data);
    for (i = 0; i < self.dimensions["data"]; i++) {
      self.data_descs[i] = {
        min: min_max_middle[0],
        max: min_max_middle[1],
        middle: min_max_middle[2],
      };
    }
  }

  if (self.settings.metadata) {
    var metadata = [];

    for (
      i = 0, keys = Object.keys(self.metadata.nodes), len = keys.length;
      i < len;
      i++
    ) {
      metadata.push(self.metadata.nodes[keys[i]]);
    }
    self.metadata_descs = self._get_data_min_max_middle(metadata);
  }
};

InCHlib2.prototype._set_heatmap_settings = function () {
  var self = this;
  var i, keys, key, len, node;

  self.header = [];
  for (i = 0; i < self.dimensions["overall"]; i++) {
    self.header.push("");
  }

  if (
    self.settings.columns_order.length === 0 ||
    self.settings.columns_order.length !== self.dimensions["data"]
  ) {
    self.settings.columns_order = [];
    for (i = 0; i < self.dimensions["data"]; i++) {
      self.settings.columns_order.push(i);
    }
  }

  if (self.settings.metadata) {
    for (
      i = self.dimensions["data"];
      i < self.dimensions["data"] + self.dimensions["metadata"];
      i++
    ) {
      self.settings.columns_order.push(i);
    }
  }

  if (self.settings.count_column) {
    self.settings.columns_order.push(self.settings.columns_order.length);
  }

  self.features = {};

  for (i = 0; i < self.settings.columns_order.length; i++) {
    self.features[i] = true;
  }

  self._set_on_features();

  self.heatmap_header = false;
  self.metadata_header = false;
  self.current_label = null;

  self._set_color_settings();

  if (
    self.settings.alternative_data &&
    self.json.alternative_data.feature_names !== undefined
  ) {
    self.heatmap_header = self.json.alternative_data.feature_names;
  } else if (self.data.feature_names !== undefined) {
    self.heatmap_header = self.data.feature_names;
  }

  if (self.heatmap_header) {
    for (i = 0; i < self.dimensions["data"]; i++) {
      self.header[i] = self.heatmap_header[self.on_features["data"][i]];
    }
  }

  if (self.settings.metadata) {
    if (self.metadata.feature_names) {
      self.metadata_header = self.metadata.feature_names;

      for (i = 0; i < self.dimensions["metadata"]; i++) {
        self.header[self.dimensions["data"] + i] = self.metadata_header[i];
      }
    }
  }

  if (self.settings.column_metadata) {
    if (self.column_metadata.feature_names !== undefined) {
      self.column_metadata_header = self.column_metadata.feature_names;
    }
  }

  if (self.settings.count_column) {
    self.max_item_count = 1;
    self.min_item_count = 1;
    self.dimensions["overall"]++;
    self.header.push("Count");
  }

  self._adjust_horizontal_sizes();
  self.top_heatmap_distance =
    self.header_height +
    self.column_metadata_height +
    self.settings.column_metadata_row_height / 2;
};

InCHlib2.prototype._set_on_features = function (features) {
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
};

InCHlib2.prototype._draw_heatmap = function () {
  var self = this;
  if (!self.settings.heatmap) {
    return;
  }

  var heatmap_row, row_id, col_number, col_label, row_values, y;
  self.heatmap_layer = new PIXI.Container();
  self.heatmap_overlay = new PIXI.Container();
  //self.heatmap_layer.interactive = true;

  self.current_draw_values = true;
  self.max_value_length = self._get_max_value_length();
  self.value_font_size = self._get_font_size(
    self.max_value_length,
    self.pixels_for_dimension,
    self.pixels_for_leaf,
    12
  );

  if (self.value_font_size < 4) {
    self.current_draw_values = false;
  }

  var x1 = self.heatmap_distance;
  var key;

  for (
    var i = 0, keys = Object.keys(self.leaves_y_coordinates), len = keys.length;
    i < len;
    i++
  ) {
    key = keys[i];

    y = self.leaves_y_coordinates[key];
    heatmap_row = self._draw_heatmap_row(key, x1, y); //return heatmap container all rect for a row
    heatmap_row.interactive = true;
    self.heatmap_layer.addChild(heatmap_row);
    self._bind_row_events(heatmap_row);
  }
  /*
  var heatmapGraphics = new PIXI.Graphics();

  // Iterate over each leaf node and draw its corresponding row
  for (
    var i = 0, keys = Object.keys(self.leaves_y_coordinates), len = keys.length;
    i < len;
    i++
  ) {
    var key = keys[i];
    var y = self.leaves_y_coordinates[key];
    // Instead of creating a new container, draw directly onto the single PIXI.Graphics object
    self._draw_heatmap_row(heatmapGraphics, key, x1, y);
  }
  self.heatmap_layer.addChild(heatmapGraphics);
  
  heatmapGraphics.interactive = true;

  heatmapGraphics.on("mousedown", (event) => {
    console.log("Clicked position:");
    // The 'event' parameter is a PIXI InteractionEvent, which contains data about the interaction
    const position = event.data.global; // This gives you the position in the global (renderer view) coordinates

    // Log the position to the console
    console.log(`Clicked position: x=${position.x}, y=${position.y}`);
  });
*/
  if (self.settings.column_metadata) {
    self.column_metadata_descs = self._get_data_min_max_middle(
      self.column_metadata.features,
      "row"
    );

    self.yStart =
      self.header_height + 0.5 * self.settings.column_metadata_row_height;
    self.yStep = self.settings.column_metadata_row_height;
    var y1 =
      self.header_height + 0.5 * self.settings.column_metadata_row_height;

    for (var i = 0, len = self.column_metadata.features.length; i < len; i++) {
      heatmap_row = self._draw_column_metadata_row(
        self.column_metadata.features[i],
        i,
        x1,
        y1
      );
      self.heatmap_layer.addChild(heatmap_row);
      self._bind_row_events(heatmap_row);
      y1 = y1 + self.settings.column_metadata_row_height;
    }
  }

  if (self.settings.draw_row_ids) {
    self._draw_row_ids();
  }

  self.highlighted_rows_layer = new PIXI.Container();
  self.heatmap_layer.id = "self.heatmap_layer";
  self.heatmap_overlay.id = "self.heatmap_overlay";

  self.stage.removeChild(self.highlighted_rows_layer);

  self.stage.addChild(self.highlighted_rows_layer);
  moveToTop(self.heatmap_layer);
  moveToBottom(self.stage_layer);
  //self.highlighted_rows_layer.moveToTop();
  //self.row_overlay = self.objects_ref.heatmap_line.clone();
  //self.column_overlay = self.objects_ref.heatmap_line.clone();

  /*
  self.heatmap_layer.on("mouseleave", function (evt) {
    self.last_header = null;

    while (self.heatmap_overlay.children[0]) {
      self.heatmap_overlay
        .removeChild(self.heatmap_overlay.children[0])
        .destroy();
    }

    self.heatmap_overlay.draw();
    self.events.heatmap_onmouseout(evt);
  });
*/
  self.heatmap_layer.on("pointerdown", function (evt) {
    const position = evt.data.global; // This gives you the position in the global (renderer view) coordinates
    console.log(`Clicked position: `, evt);

    // Log the position to the console
    console.log(`Clicked position: x=${position.x}, y=${position.y}`);
  });

  self.stage.addChild(
    self.heatmap_overlay,
    self.heatmap_layer,

    self.highlighted_rows_layer
  );
};

InCHlib2.prototype._draw_heatmap_row = function (node_id, x1, y1) {
  var self = this;
  var node = self.data.nodes[node_id];
  var row_id = node.objects[0];
  //console.log(node);
  var row = new PIXI.Container();
  //row.interactive = true;
  row.name = node_id;
  //var row = new Kinetic.Group({ id: node_id });
  var x2, y2, color, line, value, text, text_value, col_index;
  var col_id = "";
  for (var i = 0, len = self.on_features["data"].length; i < len; i++) {
    col_index = self.on_features["data"][i];
    col_id = self.data.feature_names[col_index];
    x2 = x1 + self.pixels_for_dimension;
    y2 = y1;
    value = node.features[col_index];
    text_value = value;
    // if (row_id === "PSMA4") console.log(value, node, col_index, self.data);

    if (self.settings.alternative_data) {
      text_value = self.alternative_data[node_id][col_index];

      if (
        self.settings.images_as_alternative_data &&
        text_value !== undefined &&
        text_value !== null &&
        text_value != ""
      ) {
        value = null;
        var filepath =
          self.settings.images_path.dir +
          text_value +
          self.settings.images_path.ext;
        filepath = escape(filepath);

        if (self.path2image[text_value] === undefined) {
          var image_obj = new Image();
          image_obj.src = filepath;

          image_obj.onload = function () {
            self.image_counter++;

            if (self.image_counter === Object.keys(self.path2image).length) {
              //self.heatmap_layer.draw();
            }
          };

          self.path2image_obj[text_value] = image_obj;
          self.path2image[text_value] = self.objects_ref.image({
            image: self.path2image_obj[text_value],
          });
        }

        self.path2image[text_value].x = x1;
        self.path2image[text_value].y =
          y1 - self._hack_round(0.5 * self.pixels_for_leaf);
        self.path2image[text_value].width = self.pixels_for_dimension;
        self.path2image[text_value].height = self.pixels_for_leaf;
        self.path2image[text_value].points = [
          x1,
          y1,
          x1 + self.pixels_for_dimension,
          null,
        ];
        self.path2image[text_value].column = ["d", col_index].join("_");
        self.path2image[text_value].value = text_value;
        /*
        var image = self.path2image[text_value].clone({
          width: self.pixels_for_dimension,
          height: self.pixels_for_leaf,
          x: x1,
          y: y1 - self._hack_round(0.5 * self.pixels_for_leaf),
          points: [x1, y1, x1 + self.pixels_for_dimension, null],
          column: ["d", col_index].join("_"),
          value: text_value,
        });
        */
        //row.addChild(image);
        row.addChild(self.path2image[text_value]);
      }
    }

    if (value !== null && !self.settings.images_as_alternative_data) {
      color = self._get_color_for_value(
        value,
        self.data_descs[col_index]["min"],
        self.data_descs[col_index]["max"],
        self.data_descs[col_index]["middle"],
        self.settings.heatmap_colors
      );

      line = self.objects_ref.heatmap_line({
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        color: color,
        text_value: text_value,
        col_index: ["d", col_index].join("_"),
        pixels_for_leaf: self.pixels_for_leaf,
        row_id: row_id,
        col_id: col_id,
      });

      //line.hitArea = line.getBounds();
      //line.interactive = true;

      row.addChild(line);

      if (self.current_draw_values) {
        console.log("We are here");
        text = self.objects_ref.heatmap_value({
          x: self._hack_round(
            (x1 + x2) / 2 -
              ("" + text_value).length * (self.value_font_size / 4)
          ),
          y: self._hack_round(y1 - self.value_font_size / 2),
          fontSize: self.value_font_size,
          text: text_value,
        });
        row.addChild(text);
      }
    }

    x1 = x2;
  }

  if (self.settings.metadata) {
    var metadata = self.metadata.nodes[node_id];

    if (metadata !== undefined) {
      for (var i = 0, len = self.on_features["metadata"].length; i < len; i++) {
        col_index = self.on_features["metadata"][i];
        value = metadata[col_index];
        x2 = x1 + self.pixels_for_dimension;
        y2 = y1;

        if (value !== null && value !== undefined) {
          text_value = value;

          if (self.metadata_descs[col_index]["str2num"] !== undefined) {
            value = self.metadata_descs[col_index]["str2num"][value];
          }
          color = self._get_color_for_value(
            value,
            self.metadata_descs[col_index]["min"],
            self.metadata_descs[col_index]["max"],
            self.metadata_descs[col_index]["middle"],
            self.settings.metadata_colors
          );

          line = self.objects_ref.heatmap_line({
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            color: color,
            text_value: text_value,
            col_index: ["m", col_index].join("_"),
            pixels_for_leaf: self.pixels_for_leaf,
            row_id: row_id,
            col_id: col_id,
          });

          row.addChild(line);

          if (self.current_draw_values) {
            text = self.objects_ref.heatmap_value({
              text: text_value,
              fontSize: self.value_font_size,
            });

            var width = text.getWidth();
            var x = self._hack_round((x1 + x2) / 2 - width / 2);
            var y = self._hack_round(y1 - self.value_font_size / 2);
            text.position({ x: x, y: y });
            row.addChild(text);
          }
        }
        x1 = x2;
      }
    }
  }

  if (
    self.settings.count_column &&
    self.features[self.dimensions["overall"] - 1]
  ) {
    x2 = x1 + self.pixels_for_dimension;
    var count = node.objects.length;
    color = self._get_color_for_value(
      count,
      self.min_item_count,
      self.max_item_count,
      self.middle_item_count,
      self.settings.count_column_colors
    );

    line = self.objects_ref.heatmap_line({
      column: "Count",
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      color: color,
      text_value: count,
      col_index: ["d", col_index].join("_"),
      pixels_for_leaf: self.pixels_for_leaf,
      row_id: row_id,
      col_id: col_id,
    });

    row.addChild(line);

    if (self.current_draw_values) {
      text = self.objects_ref.heatmap_value({
        text: count,
      });

      width = text.getWidth();
      x = self._hack_round((x1 + x2) / 2 - width / 2);
      y = self._hack_round(y1 - self.value_font_size / 2);
      text.position({ x: x, y: y });
      row.addChild(text);
    }
  }
  //console.log(row);
  return row;
};

InCHlib2.prototype._draw_column_metadata_row = function (
  data,
  row_index,
  x1,
  y1
) {
  var self = this;
  //var row = new Kinetic.Group({ class: "column_metadata" });
  var row = new PIXI.Container();
  row.metadata = { class: "column_metadata" };

  var x2, y2, color, line, value, text, text_value, width, col_index, col_id;
  var str2num =
    self.column_metadata_descs[row_index]["str2num"] === undefined
      ? false
      : true;

  for (var i = 0, len = self.on_features["data"].length; i < len; i++) {
    col_index = self.on_features["data"][i];
    value = data[col_index];
    text_value = value;
    col_id = self.data.feature_names[col_index];

    if (str2num) {
      value = self.column_metadata_descs[row_index]["str2num"][value];
    }

    color = self._get_color_for_value(
      value,
      self.column_metadata_descs[row_index]["min"],
      self.column_metadata_descs[row_index]["max"],
      self.column_metadata_descs[row_index]["middle"],
      self.settings.column_metadata_colors
    );
    x2 = x1 + self.pixels_for_dimension;
    y2 = y1;

    line = self.objects_ref.heatmap_line({
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      color: color,
      text_value: text_value,
      col_index: ["cm", row_index].join("_"),
      pixels_for_leaf: self.settings.column_metadata_row_height,
      //row_id: row_id, anyway to get this?
      col_id: col_id,
    });
    row.addChild(line);
    x1 = x2;
  }
  return row;
};

InCHlib2.prototype._bind_row_events = function (row) {
  var self = this;
  row.on("mouseenter", function (evt) {   
    self._row_mouseenter(evt);
  });

  row.on("mouseleave", function (evt) {
    self._row_mouseleave(evt);
    //self.refresh();
  });

  row.on("mouseover", function (evt) {
    //console.log("Mouse over the row");
    self._draw_col_label(evt);
    //self.refresh();
  });

    row.on("mousemove", function (evt) {
      //console.log("Mouse move over the row");
      self._draw_col_label(evt);
      
    });

  /*row.on("mouseout", function (evt) {
    //console.log("row.on(mouseout", evt);
    //self.refresh();
  });*/

  row.on("click", function (evt) {
    console.log("aaaaaaaaaaa");
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
};

InCHlib2.prototype._draw_row_ids = function () {
  var self = this;
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

  var x =
    self.distance + self._get_visible_count() * self.pixels_for_dimension + 15;

  for (i = 0; i < object_y.length; i++) {
    text = self.objects_ref.heatmap_value({
      x: x,
      y: self._hack_round(object_y[i][1] - self.row_id_size / 2),
      fontSize: self.row_id_size,
      text: object_y[i][0],
      fontStyle: "italic",
      fill: "gray",
    });
    self.heatmap_layer.addChild(text);
  }
};

InCHlib2.prototype._get_row_id_size = function () {
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
    /*
    var test = new Kinetic.Text({
      fontFamily: self.settings.font,
      fontSize: self.settings.fixed_row_id_size,
      fontStyle: "italic",
      listening: false,
      text: test_string,
    });
*/
    var test = new PIXI.Text(test_string, {
      fontFamily: self.settings.font,
      fontSize: self.settings.fixed_row_id_size,
      fontStyle: "italic",
      // "listening" is not applicable in PixiJS; it's specific to KineticJS event handling.
    });

    // Note: If you need to handle interactivity with the text in PixiJS,
    // you would set interactive properties on the PIXI.Text object.

    self.row_id_size = self.settings.fixed_row_id_size;
    self.right_margin = 20 + test.width;

    if (this.right_margin < 100) {
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
};

InCHlib2.prototype._draw_heatmap_header = function () {
  var self = this;
  if (self.settings.heatmap_header && self.header.length > 0) {
    self.header_layer = new PIXI.Container();
    var count = self._hack_size(self.leaves_y_coordinates);
    var y =
      self.settings.column_dendrogram && self.heatmap_header
        ? self.header_height +
          self.pixels_for_leaf * count +
          10 +
          self.column_metadata_height
        : self.header_height - 20;
    var rotation =
      self.settings.column_dendrogram && self.heatmap_header ? 45 : -45;
    var distance_step = 0;
    var x, i, column_header, key;
    var current_headers = [],
      len;

    for (i = 0, len = self.on_features["data"].length; i < len; i++) {
      current_headers.push(self.header[self.on_features["data"][i]]);
    }

    for (i = 0, len = self.on_features["metadata"].length; i < len; i++) {
      current_headers.push(
        self.header[self.on_features["metadata"][i] + self.dimensions["data"]]
      );
    }
    if (
      self.settings.count_column &&
      self.features[self.dimensions["overall"] - 1]
    ) {
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
      x =
        self.heatmap_distance +
        distance_step * self.pixels_for_dimension +
        self.pixels_for_dimension / 2;
      column_header = self.objects_ref.column_header({
        x: x,
        y: y,
        text: current_headers[i],
        position_index: i,
        fontSize: font_size,
        rotationDeg: rotation,
      });
      self.header_layer.addChild(column_header);
      distance_step++;
    }

    self.stage.addChild(self.header_layer);

    if (!self.settings.dendrogram) {
      self.header_layer.on("click", function (evt) {
        var column = evt.target;
        var position_index = column.attrs.position_index;
        for (i = 0; i < self.header_layer.getChildren().length; i++) {
          self.header_layer.getChildren()[i].tint = "red";
        }
        evt.target.fill = "red";
        self._delete_layers([
          self.heatmap_layer,
          self.heatmap_overlay,
          self.highlighted_rows_layer,
        ]);
        self._reorder_heatmap(
          self._translate_column_to_feature_index(position_index)
        );
        self._draw_heatmap();
        //self.header_layer.draw();
      });

      self.header_layer.on("mouseover", function (evt) {
        var label = evt.target;
        label.opacity = 0.7;
        this.draw();
      });

      self.header_layer.on("mouseout", function (evt) {
        var label = evt.target;
        label.opacity = 1;
        this.draw();
      });
    }
  }
};

InCHlib2.prototype._translate_column_to_feature_index = function (
  column_index
) {
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
};

InCHlib2.prototype._draw_distance_scale = function (distance) {
  var self = this;
  if (!self.settings.navigation_toggle.distance_scale) {
    return;
  }
  var y1 =
    self.header_height +
    self.column_metadata_height +
    self.settings.column_metadata_row_height / 2 -
    10;
  var y2 = y1;
  var x1 = 0;
  var x2 = self.distance;

  /*
  var path = new Kinetic.Line({
    points: [x1, y1, x2, y2],
    stroke: "black",
    listening: false,
  });
  
  var circle = new Kinetic.Circle({
    x: x2,    
    y: y2,
    radius: 3,
    fill: "black",
    listening: false,
  });
*/
  var path = new PIXI.Graphics();
  path
    .lineStyle(1, 0x000000) // 1 is the line width, and 0x000000 is the color for "black".
    .moveTo(x1, y1)
    .lineTo(x2, y2);

  var circle = new PIXI.Graphics();
  circle
    .beginFill(0x000000) // Color for "black".
    .drawCircle(x2, y2, 3) // 3 is the radius.
    .endFill();

  var number = 0;
  var marker_tail = 3;
  var marker_distance = x2;
  var marker_number_distance =
    self._hack_round((30 / self.distance_step) * 10) / 10;
  var distance = Math.round((100 * self.distance) / self.distance_step) / 100;
  var marker_distance_step = self._hack_round(
    self.distance_step * marker_number_distance
  );
  var marker_counter = 0;
  /*
  var distance_number = new Kinetic.Text({
    x: 0,
    y: y1 - 20,
    text: distance,
    fontSize: 12,
    fontFamily: self.settings.font,
    fontStyle: "bold",
    fill: "black",
    align: "right",
    listening: false,
  });
*/
  var distance_number = new PIXI.Text(distance, {
    fontFamily: self.settings.font,
    fontSize: 12,
    fontStyle: "bold",
    fill: 0x000000, // Color for "black".
    align: "right",
  });

  // Positioning the text
  distance_number.x = 0;
  distance_number.y = y1 - 20;

  self.dendrogram_layer.addChild(path, circle, distance_number);

  if (marker_distance_step == 0) {
    marker_distance_step = 0.5;
  }

  var path;
  if (marker_number_distance > 0.1) {
    while (marker_distance > 0) {
      /*path = new Kinetic.Line({
        points: [
          marker_distance,
          y1 - marker_tail,
          marker_distance,
          y2 + marker_tail,
        ],
        stroke: "black",
        listening: false,
      });
      */

      path = new PIXI.Graphics();
      path
        .lineStyle(1, 0x000000) // 1 is the line thickness, and 0x000000 is the color for "black".
        .moveTo(marker_distance, y1 - marker_tail)
        .lineTo(marker_distance, y2 + marker_tail)
        .endFill();
      self.dendrogram_layer.addChild(path);

      number = self._hack_round((number + marker_number_distance) * 10) / 10;
      if (number > 10) {
        number = self._hack_round(number);
      }

      marker_distance = marker_distance - marker_distance_step;
      marker_counter++;
    }
  }
};

InCHlib2.prototype._draw_navigation = function () {
  var self = this;
  self.navigation_layer = new PIXI.Container();
  //this.stage.addChild(self.navigation_layer);
  var x = 0;
  var y = 10;

  if (self.settings.heatmap) {
    self._draw_color_scale();
  }
  self._draw_help();

  if (
    !self.settings.column_dendrogram &&
    self.settings.heatmap &&
    self.settings.navigation_toggle.filter_button
  ) {
    /*
    var filter_icon = self.objects_ref.icon.clone({
      data: "M26.834,6.958c0-2.094-4.852-3.791-10.834-3.791c-5.983,0-10.833,1.697-10.833,3.791c0,0.429,0.213,0.84,0.588,1.224l8.662,15.002v4.899c0,0.414,0.709,0.75,1.583,0.75c0.875,0,1.584-0.336,1.584-0.75v-4.816l8.715-15.093h-0.045C26.625,7.792,26.834,7.384,26.834,6.958zM16,9.75c-6.363,0-9.833-1.845-9.833-2.792S9.637,4.167,16,4.167c6.363,0,9.834,1.844,9.834,2.791S22.363,9.75,16,9.75z",
      x: x,
      y: y,
      label: "Filter\ncolumns",
    });*/

    var filter_icon = new PIXI.Sprite(self.spritesheet.textures.filter);
    filter_icon.x = x;
    filter_icon.y = y;
    filter_icon.width = 32;
    filter_icon.height = 32;
    filter_icon.id = "filter_icon";
    filter_icon.label = "Filter\ncolumns";
    filter_icon.interactive = true;

    var filter_overlay = self._draw_icon_overlay(x, y);
    self.navigation_layer.addChild(filter_icon, filter_overlay);
    x = x + 40;

    filter_overlay.on("click", function () {
      self._filter_icon_click(this);
    });

    filter_overlay.on("mouseover", function () {
      self._icon_mouseover(filter_icon, filter_overlay, self.navigation_layer);
    });

    filter_overlay.on("mouseout", function () {
      self._icon_mouseout(filter_icon, filter_overlay, self.navigation_layer);
    });
  }

  if (
    self.zoomed_clusters["row"].length > 0 ||
    self.zoomed_clusters["column"].length > 0
  ) {
    /*
    var refresh_icon = self.objects_ref.icon.clone({
      data: "M24.083,15.5c-0.009,4.739-3.844,8.574-8.583,8.583c-4.741-0.009-8.577-3.844-8.585-8.583c0.008-4.741,3.844-8.577,8.585-8.585c1.913,0,3.665,0.629,5.09,1.686l-1.782,1.783l8.429,2.256l-2.26-8.427l-1.89,1.89c-2.072-1.677-4.717-2.688-7.587-2.688C8.826,3.418,3.418,8.826,3.416,15.5C3.418,22.175,8.826,27.583,15.5,27.583S27.583,22.175,27.583,15.5H24.083z",
      x: x,
      y: y,
      id: "refresh_icon",
      label: "Refresh",
    });
*/
    var refresh_icon = new PIXI.Sprite(self.spritesheet.textures.refresh);
    refresh_icon.x = x;
    refresh_icon.y = y;
    refresh_icon.width = 32;
    refresh_icon.height = 32;
    refresh_icon.id = "refresh_icon";
    refresh_icon.label = "Refresh";
    refresh_icon.interactive = true;

    var refresh_overlay = self._draw_icon_overlay(x, y);
    self.navigation_layer.addChild(refresh_icon, refresh_overlay);

    refresh_overlay.on("click", function () {
      self._refresh_icon_click();
      self.events.on_refresh();
    });

    refresh_overlay.on("mouseover", function () {
      self._icon_mouseover(
        refresh_icon,
        refresh_overlay,
        self.navigation_layer
      );
    });

    refresh_overlay.on("mouseout", function () {
      self._icon_mouseout(refresh_icon, refresh_overlay, self.navigation_layer);
    });
  }

  if (self.zoomed_clusters["row"].length > 0) {
    x = self.distance - 55;
    y = self.header_height + self.column_metadata_height - 40;
    /*var unzoom_icon = self.objects_ref.icon.clone({
      data: self.paths_ref["unzoom_icon"],
      x: x,
      y: y,
      scale: { x: 0.7, y: 0.7 },
      label: "Unzoom\nrows",
    });*/
    var unzoom_icon = new PIXI.Sprite(self.spritesheet.textures.zoomout);
    unzoom_icon.x = x;
    unzoom_icon.y = y;
    unzoom_icon.width = 32;
    unzoom_icon.height = 32;
    unzoom_icon.id = "unzoom_icon";
    unzoom_icon.label = "Unzoom\nrows";
    unzoom_icon.data = self.paths_ref["unzoom_icon"];
    unzoom_icon.scale = { x: 0.7, y: 0.7 };
    unzoom_icon.interactive = true;

    var unzoom_overlay = self._draw_icon_overlay(x, y);
    self.navigation_layer.addChild(unzoom_icon, unzoom_overlay);
    moveToTop(unzoom_icon);
    unzoom_overlay.on("click", function () {
      self._unzoom_icon_click();
    });

    unzoom_overlay.on("mouseover", function () {
      self._icon_mouseover(unzoom_icon, unzoom_overlay, self.navigation_layer);
    });

    unzoom_overlay.on("mouseout", function () {
      self._icon_mouseout(unzoom_icon, unzoom_overlay, self.navigation_layer);
    });
  }

  if (self.zoomed_clusters["column"].length > 0) {
    x = self.settings.width - 85;
    y = self.header_height - 50;

    /*
    var column_unzoom_icon = self.objects_ref.icon.clone({
      data: self.paths_ref["unzoom_icon"],
      x: x,
      y: y - 5,
      scale: { x: 0.7, y: 0.7 },
      label: "Unzoom\ncolumns",
    });
    */
    var column_unzoom_icon = new PIXI.Sprite(self.spritesheet.textures.zoomout);
    column_unzoom_icon.x = x;
    column_unzoom_icon.y = y - 5;
    column_unzoom_icon.width = 32;
    column_unzoom_icon.height = 32;
    column_unzoom_icon.id = "unzoom_icon";
    column_unzoom_icon.label = "Unzoom\nrows";
    column_unzoom_icon.data = self.paths_ref["unzoom_icon"];
    column_unzoom_icon.scale = { x: 0.7, y: 0.7 };
    column_unzoom_icon.interactive = true;

    var column_unzoom_overlay = self._draw_icon_overlay(x, y);

    self.navigation_layer.addChild(column_unzoom_icon, column_unzoom_overlay);

    column_unzoom_overlay.on("click", function () {
      self._column_unzoom_icon_click(this);
    });

    column_unzoom_overlay.on("mouseover", function () {
      self._icon_mouseover(
        column_unzoom_icon,
        column_unzoom_overlay,
        self.navigation_layer
      );
    });

    column_unzoom_overlay.on("mouseout", function () {
      self._icon_mouseout(
        column_unzoom_icon,
        column_unzoom_overlay,
        self.navigation_layer
      );
    });
  }

  if (self.settings.navigation_toggle.export_button) {
    /*
    var export_icon = self.objects_ref.icon.clone({
      data: "M24.25,10.25H20.5v-1.5h-9.375v1.5h-3.75c-1.104,0-2,0.896-2,2v10.375c0,1.104,0.896,2,2,2H24.25c1.104,0,2-0.896,2-2V12.25C26.25,11.146,25.354,10.25,24.25,10.25zM15.812,23.499c-3.342,0-6.06-2.719-6.06-6.061c0-3.342,2.718-6.062,6.06-6.062s6.062,2.72,6.062,6.062C21.874,20.78,19.153,23.499,15.812,23.499zM15.812,13.375c-2.244,0-4.062,1.819-4.062,4.062c0,2.244,1.819,4.062,4.062,4.062c2.244,0,4.062-1.818,4.062-4.062C19.875,15.194,18.057,13.375,15.812,13.375z",
      x: self.settings.width - 62,
      y: 10,
      scale: { x: 0.7, y: 0.7 },
      id: "export_icon",
      label: "Export\nin png format",
    });
*/
    var export_icon = new PIXI.Sprite(self.spritesheet.textures.download);
    export_icon.x = self.settings.width - 62;
    export_icon.y = 10;
    export_icon.width = 32;
    export_icon.height = 32;
    export_icon.id = "export_icon";
    export_icon.label = "Export\nin png format";
    export_icon.scale = { x: 0.7, y: 0.7 };
    export_icon.interactive = true;

    var export_overlay = self._draw_icon_overlay(self.settings.width - 62, 10);
    self.navigation_layer.addChild(export_icon, export_overlay);

    export_overlay.on("click", function () {
      self._export_icon_click(this);
    });

    export_overlay.on("mouseover", function () {
      self._icon_mouseover(export_icon, export_overlay, self.navigation_layer);
    });

    export_overlay.on("mouseout", function () {
      self._icon_mouseout(export_icon, export_overlay, self.navigation_layer);
    });
  }

  self.stage.addChild(self.navigation_layer);
  moveToTop(self.navigation_layer);
  console.log("self.navigation_layer", self.navigation_layer);
  self.refresh();
};

//TODO ICon issue
InCHlib2.prototype._draw_help = function () {
  var self = this;
  if (!self.settings.navigation_toggle.hint_button) {
    return;
  }

  /*
  var help_icon = self.objects_ref.icon.clone({
    data: self.paths_ref["lightbulb"],
    x: self.settings.width - 63,
    y: 40,
    scale: { x: 0.8, y: 0.8 },
    id: "help_icon",
    label: "Tip",
  });
*/
  self.spritesheet.parse();
  console.log(self.spritesheet);
  var help_icon = new PIXI.Sprite(self.spritesheet.textures.help);
  help_icon.x = self.settings.width - 63;
  help_icon.y = 40;
  help_icon.width = 32;
  help_icon.height = 32;
  help_icon.id = "help_icon";
  help_icon.label = "Tip";
  help_icon.scale = { x: 0.8, y: 0.8 };
  help_icon.interactive = true;

  var help_overlay = self._draw_icon_overlay(self.settings.width - 63, 40);

  self.navigation_layer.addChild(help_icon, help_overlay);

  help_overlay.on("mouseover", function () {
    self._icon_mouseover(help_icon, help_overlay, self.navigation_layer);
    self._help_mouseover();
  });

  help_overlay.on("mouseout", function () {
    self._help_mouseout();
    self._icon_mouseout(help_icon, help_overlay, self.navigation_layer);
  });
};

InCHlib2.prototype._draw_color_scale = function () {
  var self = this;
  if (!self.settings.navigation_toggle.color_scale) {
    return;
  }
  var color_steps = [
    self.settings.min_percentile / 100,
    self._get_color_for_value(0, 0, 1, 0.5, self.settings.heatmap_colors),
    self.settings.middle_percentile / 100,
    self._get_color_for_value(0.5, 0, 1, 0.5, self.settings.heatmap_colors),
    self.settings.max_percentile / 100,
    self._get_color_for_value(1, 0, 1, 0.5, self.settings.heatmap_colors),
  ];

  var color_scale = self.objects_ref.rect_gradient({
    x: 0,
    y: 80,
    width: 100,
    height: 20,
    fillLinearGradientStartPoint: { x: 0, y: 80 },
    fillLinearGradientEndPoint: { x: 100, y: 80 },
    fillLinearGradientColorStops: color_steps, // Assuming color_steps is defined elsewhere in your code
    stroke: "#D2D2D2",
    strokeWidth: "1px",
    label: "Color settings",
    id: self.settings.target + "_color_scale",
  });
  color_scale.interactive = true;

  color_scale.on("mouseover", function () {
    self._color_scale_mouseover(color_scale, self.navigation_layer);
  });

  color_scale.on("mouseout", function () {
    self._color_scale_mouseout(color_scale, self.navigation_layer);
  });

  color_scale.on("click", function () {
    self._color_scale_click(color_scale, self.navigation_layer);
  });

  self.navigation_layer.addChild(color_scale); //self.naviagtion_layer
};

// Function to find an element by ID within a container
function findElementById(container, id) {
  for (let i = 0; i < container.children.length; i++) {
    if (container.children[i].id?.includes(id)) {
      return container.children[i];
    }
  }
  return null; // Return null if no element is found
}

InCHlib2.prototype._update_color_scale = function () {
  var self = this;

  var color_scale = findElementById(
    self.navigation_layer,
    self.settings.target + "_color_scale"
  );
  console.log(self.navigation_layer, color_scale);
  var widthx = color_scale.width;
  var heightx = color_scale.height;
  var x = color_scale.x;
  var y = color_scale.y;
  color_scale.fillLinearGradientColorStops([
    self.settings.min_percentile / 100,
    self._get_color_for_value(0, 0, 1, 0.5, self.settings.heatmap_colors),
    self.settings.middle_percentile / 100,
    self._get_color_for_value(0.5, 0, 1, 0.5, self.settings.heatmap_colors),
    self.settings.max_percentile / 100,
    self._get_color_for_value(1, 0, 1, 0.5, self.settings.heatmap_colors),
  ]);
  color_scale.width = widthx;
  color_scale.height = heightx;
  color_scale.x = x;
  color_scale.y = y;
  //self.navigation_layer.draw();
  console.log("Updated color scale");
  self.refresh();
  moveToTop(this.navigation_layer);
};

InCHlib2.prototype._draw_icon_overlay = function (x, y) {
  var self = this;
  return self.objects_ref.icon_overlay({ x: x, y: y });
};

InCHlib2.prototype._highlight_path = function (node_id, color) {
  var self = this;
  var node = self.data.nodes[node_id];
  //console.log(node, node_id, self.data.nodes, self.dendrogram_map);
  if (node.count !== 1) {
    if (self.dendrogram_map[node_id] !== undefined)
      self.highlight_dendogram(node_id, color);
    self._highlight_path(node.left_child, color);
    self._highlight_path(node.right_child, color);
  } else {
    self.highlighted_rows_y.push(self.leaves_y_coordinates[node_id]);
    self.current_object_ids.push.apply(
      self.current_object_ids,
      node["objects"]
    );
    //console.log("self.highlighted_rows_y", self.highlighted_rows_y);
    //console.log("self.current_object_ids", self.current_object_ids);
  }
};

InCHlib2.prototype.refresh = function (stage = this.app.stage) {
  requestAnimationFrame(()=>this.app.renderer.render(stage));
};



InCHlib2.prototype.highlight_dendogramX = function (node, color = 0xff0000) {
  if (node) {
    node.tint = color;
  }
};

InCHlib2.prototype.highlight_dendogram = function (node_id, color) {
  const node = this.dendrogram_map[node_id];
  const parent = node.parent;
  if (parent) {
    parent.removeChild(node);
    var newNode = this.objects_ref.node(
      node.left_distance,
      node.y1,
      node.x1,
      node.y2,
      node.x2,
      node.y3,
      node.right_distance,
      node.y4,
      node.id,
      color ? color : 0xff0000,
      4
    );
    this.dendrogram_map[node_id] = newNode;
    parent.addChild(newNode);
  }
};

InCHlib2.prototype.dehighlight_dendogramOld = function (node, color) {
  const parent = node.parent;
  if (parent) {
    parent.removeChild(node);
    parent.addChild(
      this.objects_ref.node(
        node.left_distance,
        node.y1,
        node.x1,
        node.y2,
        node.x2,
        node.y3,
        node.right_distance,
        node.y4,
        node.id,
        (node.parent = parent),
        0x000000,
        2
      )
    );
  }
};

InCHlib2.prototype._highlight_column_path = function (path_id, color) {
  var self = this;
  var node = self.column_dendrogram.nodes[path_id];
  if (node.count != 1) {
    self.column_dendrogram_layer.get("#col" + path_id)[0].stroke(color);
    self._highlight_column_path(node.left_child, color);
    self._highlight_column_path(node.right_child, color);
  } else {
    self.current_column_ids.push(self.nodes2columns[path_id]);
  }
};

/**
 * Unhighlight highlighted heatmap rows.
 *
 * @example
 * instance.unhighlight_rows();
 */
InCHlib2.prototype.unhighlight_rows = function () {
  var self = this;
  self.highlight_rows([]);
};

/**
 * Highlight heatmap rows with color defined in instance.settings.highlight_colors.
 * When the empty array is passed it unhighlights all highlighted rows.
 *
 * @param {object} [row_ids] The array of heatmap row (object) IDs.
 *
 * @example
 * instance.highlight_rows(["CHEMBL7781", "CHEMBL273658", "CHEMBL415309", "CHEMBL267231", "CHEMBL8007", "CHEMBL7987", "CHEMBL7988", "CHEMBL266282", "CHEMBL7655", "CHEMBL7817", "CHEMBL8637", "CHEMBL8639", "CHEMBL8055", "CHEMBL7843", "CHEMBL266488", "CHEMBL8329"]);
 */

InCHlib2.prototype.highlight_rows = function (row_ids) {
  var self = this;
  var i, row, row_id;
  if (!self.settings.heatmap) {
    return;
  }

  self.settings.highlighted_rows = row_ids;

  while (self.highlighted_rows_layer.children[0]) {
    self.highlighted_rows_layer
      .removeChild(self.highlighted_rows_layer.children[0])
      .destroy();
  }

  var original_colors = self.settings.heatmap_colors;
  var original_metadata_colors = self.settings.metadata_colors;
  self.settings.heatmap_colors = self.settings.highlight_colors;
  self.settings.metadata_colors = self.settings.highlight_colors;

  var done_rows = {};
  var unique_row_ids = [];

  for (i = 0; i < row_ids.length; i++) {
    if (self.objects2leaves[row_ids[i]] !== undefined) {
      row_id = self.objects2leaves[row_ids[i]];
      if (done_rows[row_id] === undefined) {
        unique_row_ids.push(row_id);
        done_rows[row_id] = null;
      }
    }
  }

  for (i = 0; i < unique_row_ids.length; i++) {
    row = self._draw_heatmap_row(
      unique_row_ids[i],
      self.heatmap_distance,
      self.leaves_y_coordinates[unique_row_ids[i]]
    );
    self.highlighted_rows_layer.addChild(row);
    row.interactive = false;
  }

  //self.highlighted_rows_layer.draw();
  moveToTop(self.heatmap_overlay);

  self.settings.heatmap_colors = original_colors;
  self.settings.metadata_colors = original_metadata_colors;

  self.highlighted_rows_layer.on("click", function (evt) {
    self.heatmap_layer.fire("click");
  });
};

InCHlib2.prototype._highlight_cluster = function (path_id) {
  var self = this;
  var previous_cluster = self.last_highlighted_cluster;

  if (previous_cluster) {
    self.unhighlight_cluster();
  }

  if (previous_cluster !== path_id) {
    self.last_highlighted_cluster = path_id;
    self._highlight_path(path_id, "#F5273C");
    self._draw_cluster_layer(path_id);
    self.events.dendrogram_node_highlight(
      self.current_object_ids,
      self._unprefix(path_id)
    );
  }
  this.refresh();
  //self.dendrogram_layer.draw();
};

InCHlib2.prototype._highlight_column_cluster = function (path_id) {
  var self = this;
  var previous_cluster = self.last_highlighted_column_cluster;
  if (previous_cluster) {
    self.unhighlight_column_cluster();
  }
  if (previous_cluster !== path_id) {
    self.last_highlighted_column_cluster = path_id;
    self._highlight_column_path(path_id, "#F5273C");
    self.current_column_ids.sort(function (a, b) {
      return a - b;
    });
    self._draw_column_cluster_layer(path_id);
    self.events.column_dendrogram_node_highlight(
      self.current_column_ids,
      self._unprefix(path_id)
    );
  }
  //self.column_dendrogram_layer.draw();
};

InCHlib2.prototype.unhighlight_column_cluster = function () {
  var self = this;
  if (self.last_highlighted_column_cluster) {
    self._highlight_column_path(self.last_highlighted_column_cluster, "grey");
    //self.column_dendrogram_layer.draw();
    self.column_cluster_group.destroy();
    //self.cluster_layer.draw();
    self.current_column_ids = [];
    self.events.column_dendrogram_node_unhighlight(
      self._unprefix(self.last_highlighted_column_cluster)
    );
    self.last_highlighted_column_cluster = null;
  }
};

/**
 * Highlight cluster defined by the dendrogram node ID.
 *
 * @param {string} node_id The ID of particular node in dendrogram.
 *
 * @example
 * instance.highlight_cluster("node@715");
 */

InCHlib2.prototype.highlight_cluster = function (node_id) {
  var self = this;
  return self._highlight_cluster(self._prefix(node_id));
};

/**
 * Highlight column cluster defined by the dendrogram node ID.
 *
 * @param {string} node_id The ID of particular node in dendrogram.
 *
 * @example
 * instance.highlight_column_cluster("node@715");
 */

InCHlib2.prototype.highlight_column_cluster = function (node_id) {
  var self = this;
  return self._highlight_column_cluster(self._prefix(node_id));
};

/**
 * Unhighlight highlighted dendrogram node (cluster).
 *
 * @example
 * instance.unhighlight_cluster();
 */
InCHlib2.prototype.unhighlight_cluster = function () {
  var self = this;
  console.log(
    "Unhighlight cluster",
    self.last_highlighted_cluster,
    self.row_cluster_group
  );
  if (self.last_highlighted_cluster) {
    self._highlight_path(self.last_highlighted_cluster, "0x7a7a7a"); //  0x7a7a7a should we change to black 0x000000
    //self.dendrogram_layer.draw();
    self.row_cluster_group.destroy();
    //self.cluster_layer.draw();
    self.events.dendrogram_node_unhighlight(
      self._unprefix(self.last_highlighted_cluster)
    );
    self.highlighted_rows_y = [];
    self.current_object_ids = [];
    self.last_highlighted_cluster = null;
    this.refresh();
  }
};

InCHlib2.prototype._neutralize_path = function (path_id) {
  var self = this;
  var node = self.data.nodes[path_id];

  if (node.count != 1) {
    var path = self.dendrogram_layer.get("#" + path_id)[0];
    if (path) {
      path.setStroke("grey");
      self._neutralize_path(node.right_child);
      self._neutralize_path(node.left_child);
    }
  }
};

InCHlib2.prototype._draw_cluster_layer = function (path_id) {
  var self = this;
  //self.row_cluster_group = new Kinetic.Group();
  self.row_cluster_group = new PIXI.Container();

  var visible = self._get_visible_count();
  var count = self.data.nodes[path_id].count;
  var x = self.distance - 30;
  var y = self.header_height + self.column_metadata_height - 40;

  var rows_desc = self.objects_ref.count({
    x: x + 10,
    y: y - 10,
    text: count,
  });

  /*
  var zoom_icon = self.objects_ref.icon.clone({
    data: self.paths_ref["zoom_icon"],
    x: x,
    y: y,
    scale: { x: 0.7, y: 0.7 },
    label: "Zoom\nrows",
  });*/

  var zoom_icon = new PIXI.Sprite(self.spritesheet.textures.zoomin);
  zoom_icon.x = x;
  zoom_icon.y = y;
  zoom_icon.width = 32;
  zoom_icon.height = 32;
  zoom_icon.id = "zoom_icon";
  zoom_icon.label = "Zoom\nrows";
  zoom_icon.scale = { x: 0.7, y: 0.7 };
  zoom_icon.interactive = true;
  var zoom_overlay = self._draw_icon_overlay(x, y);

  x = self.distance + self.dendrogram_heatmap_distance;
  var width = visible * self.pixels_for_dimension + self.heatmap_distance;
  var upper_y = self.highlighted_rows_y[0] - self.pixels_for_leaf / 2;
  var lower_y =
    self.highlighted_rows_y[self.highlighted_rows_y.length - 1] +
    self.pixels_for_leaf / 2;

  var cluster_overlay_1 = self.objects_ref.cluster_overlay({
    x: x,
    y: self.header_height + self.column_metadata_height + 5,
    width: width,
    height: self._hack_round(
      upper_y - self.header_height - self.column_metadata_height - 5
    ),
  });

  var cluster_border_1 = self.objects_ref.cluster_border({
    points: [0, upper_y, width, upper_y],
  });

  var cluster_overlay_2 = self.objects_ref.cluster_overlay({
    x: x,
    y: lower_y,
    width: width,
    height: self.settings.height - lower_y - self.footer_height + 5,
  });

  var cluster_border_2 = self.objects_ref.cluster_border({
    points: [0, lower_y, width, lower_y],
  });

  self.row_cluster_group.addChild(rows_desc);
  self.row_cluster_group.addChild(cluster_overlay_1);
  self.row_cluster_group.addChild(cluster_overlay_2);
  self.row_cluster_group.addChild(zoom_icon);
  self.row_cluster_group.addChild(zoom_overlay);
  self.row_cluster_group.addChild(cluster_border_1);
  self.row_cluster_group.addChild(cluster_border_2);

  self.cluster_layer.addChild(self.row_cluster_group);
  self.stage.addChild(self.cluster_layer);
  moveToTop(rows_desc);
  moveToTop(self.navigation_layer);
  self.refresh();
  //self.cluster_layer.draw();

  zoom_overlay.interactive = true;
  zoom_overlay.on("mouseover", function () {
    self._icon_mouseover(zoom_icon, zoom_overlay, self.cluster_layer);
  });

  zoom_overlay.on("mouseout", function () {
    self._icon_mouseout(zoom_icon, zoom_overlay, self.cluster_layer);
  });

  zoom_overlay.on("click", function () {
    self._zoom_cluster(self.last_highlighted_cluster);
  });
};

InCHlib2.prototype._draw_column_cluster_layer = function (path_id) {
  var self = this;
  //self.column_cluster_group = new Kinetic.Group();
  self.column_cluster_group = new PIXI.Container();

  var count = self.column_dendrogram.nodes[path_id].count;
  var x = self.settings.width - 85;
  var y = self.header_height - 25;

  var cols_desc = self.objects_ref.count({
    x: x + 15,
    y: y - 5,
    text: count,
  });

  /* 
  var zoom_icon = self.objects_ref.icon.clone({
    data: self.paths_ref["zoom_icon"],
    x: x,
    y: y,
    scale: { x: 0.7, y: 0.7 },
    label: "Zoom\ncolumns",
  });*/
  var zoom_icon = new PIXI.Sprite(self.spritesheet.textures.zoomin);
  zoom_icon.x = x;
  zoom_icon.y = y;
  zoom_icon.width = 32;
  zoom_icon.height = 32;
  zoom_icon.id = "zoom_icon_columns";
  zoom_icon.label = "Zoom\ncolumns";
  zoom_icon.scale = { x: 0.7, y: 0.7 };
  zoom_icon.interactive = true;
  var zoom_overlay = self._draw_icon_overlay(x, y);

  var x1 = self._hack_round(
    (self.current_column_ids[0] - self.columns_start_index) *
      self.pixels_for_dimension
  );
  var x2 = self._hack_round(
    (self.current_column_ids[0] +
      self.current_column_ids.length -
      self.columns_start_index) *
      self.pixels_for_dimension
  );
  var y1 = 0;
  var y2 = self.settings.height - self.footer_height + 5;
  var height =
    self.settings.height -
    self.footer_height -
    self.header_height +
    self.settings.column_metadata_row_height;

  var cluster_border_1 = self.objects_ref.cluster_border({
    points: [self.heatmap_distance + x1, y1, self.heatmap_distance + x1, y2],
  });

  var cluster_overlay_1 = self.objects_ref.cluster_overlay({
    x: self.heatmap_distance,
    y: self.header_height,
    width: x1,
    height: height,
  });

  var cluster_border_2 = self.objects_ref.cluster_border({
    points: [self.heatmap_distance + x2, y1, self.heatmap_distance + x2, y2],
  });

  var cluster_overlay_2 = self.objects_ref.cluster_overlay({
    x: x2 + self.heatmap_distance,
    y: self.header_height,
    width:
      self.heatmap_width -
      x2 -
      (self.on_features["metadata"].length +
        self.on_features["count_column"].length) *
        self.pixels_for_dimension,
    height: height,
  });

  self.column_cluster_group.addChild(cluster_overlay_1);
  self.column_cluster_group.addChild(cluster_overlay_2);
  //self.column_cluster_group.addChild(zoom_icon);
  // self.column_cluster_group.addChild(zoom_overlay);
  self.column_cluster_group.addChild(cols_desc);
  self.column_cluster_group.addChild(cluster_border_1);
  self.column_cluster_group.addChild(cluster_border_2);

  self.cluster_layer.addChild(self.column_cluster_group);
  self.stage.addChild(self.cluster_layer);
  //self.cluster_layer.draw();
  moveToTop(self.navigation_layer);

  /*
  zoom_overlay.on("mouseover", function () {
    self._icon_mouseover(zoom_icon, zoom_overlay, self.cluster_layer);
  });

  zoom_overlay.on("mouseout", function () {
    self._icon_mouseout(zoom_icon, zoom_overlay, self.cluster_layer);
  });

  zoom_overlay.on("click", function () {
    self._zoom_column_cluster(self.last_highlighted_column_cluster);
  });*/
};

InCHlib2.prototype._draw_column_cluster = function (node_id) {
  var self = this;
  self.columns_start_index = self.current_column_ids[0];
  self.on_features["data"] = self.current_column_ids;
  var distance = self.distance;
  self._adjust_horizontal_sizes();
  self._delete_layers(
    [
      self.column_dendrogram_layer,
      self.heatmap_layer,
      self.heatmap_overlay,
      self.column_cluster_group,
      self.navigation_layer,
      self.highlighted_rows_layer,
    ],
    [self.dendrogram_hover_layer]
  );
  if (self.settings.heatmap_header) {
    self._delete_layers([self.header_layer]);
  }
  self._draw_column_dendrogram(node_id);
  self._draw_heatmap();
  self._draw_heatmap_header();
  self._draw_navigation();

  if (distance !== self.distance) {
    self._delete_layers([self.dendrogram_layer, self.cluster_layer]);
    var row_node =
      self.zoomed_clusters["row"].length > 0
        ? self.zoomed_clusters["row"][self.zoomed_clusters["row"].length - 1]
        : self.root_id;
    self._draw_row_dendrogram(row_node);
    if (self.last_highlighted_cluster !== null) {
      self._highlight_path(self.last_highlighted_cluster, "#F5273C");
      //self.dendrogram_layer.draw();
      self._draw_cluster_layer(self.last_highlighted_cluster);
    }
  } else {
    moveToTop(self.cluster_layer);
    //self.cluster_layer.draw();
  }
  this.refresh();
};

InCHlib2.prototype._zoom_column_cluster = function (node_id) {
  var self = this;
  if (node_id != self.column_root_id) {
    self.zoomed_clusters["column"].push(node_id);
    self._draw_column_cluster(node_id);
    self.highlight_rows(self.settings.highlighted_rows);
    self.events.on_columns_zoom(
      self.current_column_ids,
      self._unprefix(node_id)
    );
    self.current_column_ids = [];
    self.last_highlighted_column_cluster = null;
    self.refresh();
  }
};

InCHlib2.prototype._unzoom_column_cluster = function () {
  var self = this;
  var unzoomed = self.zoomed_clusters["column"].pop();
  var zoomed_count = self.zoomed_clusters["column"].length;
  var node_id =
    zoomed_count > 0
      ? self.zoomed_clusters["column"][zoomed_count - 1]
      : self.column_root_id;
  self._get_column_ids(node_id);
  self._draw_column_cluster(node_id);
  self.events.on_columns_unzoom(self._unprefix(unzoomed));
  self.current_column_ids = [];
  self._highlight_column_cluster(unzoomed);
  self.refresh();
};

InCHlib2.prototype._draw_cluster = function (node_id) {
  var self = this;
  self._delete_layers(
    [
      self.dendrogram_layer,
      self.heatmap_layer,
      self.heatmap_overlay,
      self.cluster_layer,
      self.navigation_layer,
      self.header_layer,
      self.highlighted_rows_layer,
    ],
    [self.dendrogram_hover_layer]
  );
  self._draw_row_dendrogram(node_id);
  self._draw_heatmap();
  self._draw_heatmap_header();
  self._draw_navigation();
  if (
    self.settings.column_dendrogram &&
    self.last_highlighted_column_cluster !== null
  ) {
    self._draw_column_cluster_layer(self.last_highlighted_column_cluster);
  }
  self.refresh();
};

InCHlib2.prototype._zoom_cluster = function (node_id) {
  var self = this;
  if (node_id !== self.root_id) {
    self.zoomed_clusters["row"].push(node_id);
    self._draw_cluster(node_id);
    self.highlight_rows(self.settings.highlighted_rows);
    self.events.on_zoom(self.current_object_ids, self._unprefix(node_id));
    self.highlighted_rows_y = [];
    self.current_object_ids = [];
    self.last_highlighted_cluster = null;
    self.refresh();
  }
};

InCHlib2.prototype._unzoom_cluster = function () {
  var self = this;
  var unzoomed = self.zoomed_clusters["row"].pop();
  var zoomed_count = self.zoomed_clusters["row"].length;
  var node_id =
    zoomed_count > 0
      ? self.zoomed_clusters["row"][zoomed_count - 1]
      : self.root_id;
  self._draw_cluster(node_id);
  self.events.on_unzoom(self._unprefix(unzoomed));
  self._highlight_cluster(unzoomed);
  self.refresh();
};

InCHlib2.prototype._get_node_neighbourhood = function (node, nodes) {
  var self = this;
  var node_neighbourhood = {
    left_node: {
      left_node: { left_count: 0, right_count: 0 },
      right_node: { left_count: 0, right_count: 0 },
      left_count: 0.5,
      right_count: 0.5,
    },
    right_node: {
      left_node: { left_count: 0, right_count: 0 },
      right_node: { left_count: 0, right_count: 0 },
      left_count: 0.5,
      right_count: 0.5,
    },
    left_count: nodes[node.left_child].count,
    right_count: nodes[node.right_child].count,
  };

  var left_child = nodes[node.left_child];
  var right_child = nodes[node.right_child];

  var left_child_left_child = nodes[left_child.left_child];
  var left_child_right_child = nodes[left_child.right_child];

  var right_child_left_child = nodes[right_child.left_child];
  var right_child_right_child = nodes[right_child.right_child];

  if (left_child.count != 1) {
    node_neighbourhood.left_node.left_count =
      nodes[left_child.left_child].count;
    node_neighbourhood.left_node.right_count =
      nodes[left_child.right_child].count;

    if (left_child_left_child.count != 1) {
      node_neighbourhood.left_node.left_node.left_count =
        nodes[left_child_left_child.left_child].count;
      node_neighbourhood.left_node.left_node.right_count =
        nodes[left_child_left_child.right_child].count;
    } else {
      node_neighbourhood.left_node.left_node.left_count = 0.5;
      node_neighbourhood.left_node.left_node.right_count = 0.5;
    }

    if (left_child_right_child.count != 1) {
      node_neighbourhood.left_node.right_node.left_count =
        nodes[left_child_right_child.left_child].count;
      node_neighbourhood.left_node.right_node.right_count =
        nodes[left_child_right_child.right_child].count;
    } else {
      node_neighbourhood.left_node.right_node.left_count = 0.5;
      node_neighbourhood.left_node.right_node.right_count = 0.5;
    }
  }

  if (right_child.count != 1) {
    node_neighbourhood.right_node.left_count =
      nodes[right_child.left_child].count;
    node_neighbourhood.right_node.right_count =
      nodes[right_child.right_child].count;

    if (right_child_left_child.count != 1) {
      node_neighbourhood.right_node.left_node.left_count =
        nodes[right_child_left_child.left_child].count;
      node_neighbourhood.right_node.left_node.right_count =
        nodes[right_child_left_child.right_child].count;
    } else {
      node_neighbourhood.right_node.left_node.left_count = 0.5;
      node_neighbourhood.right_node.left_node.right_count = 0.5;
    }

    if (right_child_right_child.count != 1) {
      node_neighbourhood.right_node.right_node.left_count =
        nodes[right_child_right_child.left_child].count;
      node_neighbourhood.right_node.right_node.right_count =
        nodes[right_child_right_child.right_child].count;
    } else {
      node_neighbourhood.right_node.right_node.left_count = 0.5;
      node_neighbourhood.right_node.right_node.right_count = 0.5;
    }
  }
  return node_neighbourhood;
};

InCHlib2.prototype._draw_column_dendrogram_node = function (
  node_id,
  node,
  current_left_count,
  current_right_count,
  x,
  y
) {
  var self = this;

  if (node.count > 1) {
    var node_neighbourhood = self._get_node_neighbourhood(
      node,
      self.column_dendrogram.nodes
    );
    var right_child = self.column_dendrogram.nodes[node.right_child];
    var left_child = self.column_dendrogram.nodes[node.left_child];
    var x1 = self._get_x1(
      node_neighbourhood,
      current_left_count,
      current_right_count
    );
    var x2 = self._get_x2(
      node_neighbourhood,
      current_left_count,
      current_right_count
    );
    var y1 = self._hack_round(
      self.vertical_distance - self.vertical_distance_step * node.distance
    );
    y1 = y1 === 0 ? 2 : y1;
    var y2 = y1;

    if (right_child.count === 1) {
      x2 = x2 - self.pixels_for_dimension / 2;
    }

    var left_distance =
      self.vertical_distance -
      self.vertical_distance_step *
        self.column_dendrogram.nodes[node.left_child].distance;
    var right_distance =
      self.vertical_distance -
      self.vertical_distance_step *
        self.column_dendrogram.nodes[node.right_child].distance;

    self.column_dendrogram_layer.addChild(
      self._draw_vertical_path(
        node_id,
        x1,
        y1,
        x2,
        y2,
        left_distance,
        right_distance
      )
    );
    self._draw_column_dendrogram_node(
      node.left_child,
      left_child,
      current_left_count - node_neighbourhood.left_node.right_count,
      current_right_count + node_neighbourhood.left_node.right_count,
      left_distance,
      y1
    );
    self._draw_column_dendrogram_node(
      node.right_child,
      right_child,
      current_left_count + node_neighbourhood.right_node.left_count,
      current_right_count - node_neighbourhood.right_node.left_count,
      right_distance,
      y2
    );
  } else {
    self.column_x_coordinates[node_id] =
      current_right_count * self.pixels_for_dimension;
  }
};

InCHlib2.prototype._get_y1 = function (
  node_neighbourhood,
  current_left_count,
  current_right_count
) {
  var self = this;
  current_left_count =
    current_left_count -
    node_neighbourhood.left_node.right_count -
    node_neighbourhood.left_node.left_node.right_count;
  var y =
    (current_left_count +
      (node_neighbourhood.left_node.left_node.right_count +
        node_neighbourhood.left_node.right_node.left_count) /
        2) *
    self.pixels_for_leaf;
  return y + self.top_heatmap_distance;
};

InCHlib2.prototype._get_y2 = function (
  node_neighbourhood,
  current_left_count,
  current_right_count
) {
  var self = this;
  current_left_count =
    current_left_count + node_neighbourhood.right_node.left_node.left_count;
  var y =
    (current_left_count +
      (node_neighbourhood.right_node.left_node.right_count +
        node_neighbourhood.right_node.right_node.left_count) /
        2) *
    self.pixels_for_leaf;
  return y + self.top_heatmap_distance;
};

InCHlib2.prototype._get_x1 = function (
  node_neighbourhood,
  current_left_count,
  current_right_count
) {
  var self = this;
  current_left_count =
    current_left_count -
    node_neighbourhood.left_node.right_count -
    node_neighbourhood.left_node.left_node.right_count;
  var x =
    (current_left_count +
      (node_neighbourhood.left_node.left_node.right_count +
        node_neighbourhood.left_node.right_node.left_count) /
        2) *
    self.pixels_for_dimension;
  return (
    self.heatmap_distance +
    self.on_features["data"].length * self.pixels_for_dimension -
    x
  );
};

InCHlib2.prototype._get_x2 = function (
  node_neighbourhood,
  current_left_count,
  current_right_count
) {
  var self = this;
  current_left_count =
    current_left_count + node_neighbourhood.right_node.left_node.left_count;
  var x =
    (current_left_count +
      (node_neighbourhood.right_node.left_node.right_count +
        node_neighbourhood.right_node.right_node.left_count) /
        2) *
    self.pixels_for_dimension;
  return (
    self.heatmap_distance +
    self.on_features["data"].length * self.pixels_for_dimension -
    x
  );
};

InCHlib2.prototype._draw_vertical_path = function (
  path_id,
  x1,
  y1,
  x2,
  y2,
  left_distance,
  right_distance
) {
  var self = this;
  //var path_group = new Kinetic.Group({});
  var path_group = new PIXI.Container();
  var path = self.objects_ref.node({
    //TODO NOT SURE WHTHER SHOULD BE INTERACTIVE
    points: [x1, left_distance, x1, y1, x2, y2, x2, right_distance],
    id: "col" + path_id,
  });
  var path_rect = self.objects_ref.node_rect({
    x: x2 - 1,
    y: y1 - 1,
    width: x1 - x2 + 2,
    height: self.header_height - y1,
    id: "col_rect" + path_id,
    path: path,
    path_id: path_id,
  });

  path_group.addChild(path);
  path_group.addChild(path_rect);
  path_group.isInteractive = true; //TODO NOT SURE WHTHER SHOULD BE INTERACTIVE
  return path_group;
};

InCHlib2.prototype._draw_horizontal_path = function (
  path_id,
  x1,
  y1,
  x2,
  y2,
  left_distance,
  right_distance
) {
  var self = this;
  //var path_group = new Kinetic.Group({});
  var path_group = new PIXI.Container();
  var path = self.objects_ref.node(
    left_distance,
    y1,
    x1,
    y1,
    x2,
    y2,
    right_distance,
    y2,
    path_id
  );

  self.dendrogram_map[path_id] = path;

  var path_rect = self.objects_ref.node_rect(
    x1 - 1,
    y1 - 1,
    self.distance - x1,
    y2 - y1,
    path_id,
    path
  );

  path_group.addChild(path_rect, path);
  //path_group.interactive = true; //TODO MAYBE WE DONT NEED THIS
  return path_group;
};

InCHlib2.prototype._filter_icon_click = function (filter_button) {
  var self = this;
  var filter_features_element = self.target_element.find(".filter_features");
  var symbol = "✖";

  if (filter_features_element.length) {
    filter_features_element.fadeIn("fast");
    var overlay = self._draw_target_overlay();
  } else {
    var filter_list = "";

    for (var attr in self.header) {
      if (self.features[attr]) {
        symbol = "✔";
      }
      if (attr < self.dimensions) {
        var text = self.header[attr];
        if (text == "") {
          text = parseInt(attr) + 1 + ". column";
        }
        filter_list =
          filter_list +
          "<li class='feature_switch' data-num='" +
          attr +
          "'><span class='symbol'>" +
          symbol +
          "</span>  " +
          text +
          "</li>";
      }
    }

    self.target_element.append(
      "<div class='filter_features'><ul>" +
        filter_list +
        "</ul><hr /><div><span class='cancel_filter_list'>Cancel</span>&nbsp;&nbsp;&nbsp;<span class='update_filter_list'>Update</span></div></div>"
    );
    filter_features_element = self.target_element.find(".filter_features");

    filter_features_element.css({
      display: "none",
      top: 45,
      left: 0,
      "border-radius": "5px",
      "text-align": "center",
      position: "absolute",
      "background-color": "#ffffff",
      border: "solid 2px #DEDEDE",
      "padding-top": "5px",
      "padding-left": "15px",
      "padding-bottom": "10px",
      "padding-right": "15px",
      "font-weight": "bold",
      "font-size": "14px",
      "z-index": 1000,
      "font-family": self.settings.font,
    });

    filter_features_element.find("ul").css({
      "list-style-type": "none",
      "margin-left": "0",
      "padding-left": "0",
      "text-align": "left",
    });

    filter_features_element.find("li").css({
      color: "green",
      "margin-top": "5px",
    });

    filter_features_element.find("div").css({
      cursor: "pointer",
      opacity: "0.7",
    });

    var overlay = self._draw_target_overlay();
    filter_features_element.fadeIn("fast");

    self.target_element.find(".feature_switch").click(function () {
      var num = parseInt($(this).attr("data-num"));
      var symbol_element = $(this).find("span");
      self.features[num] = !self.features[num];

      if (self.features[num]) {
        symbol_element.text("✔");
        $(this).css("color", "green");
      } else {
        symbol_element.text("✖");
        $(this).css("color", "red");
      }

      self._set_on_features();
    });

    $(function () {
      filter_features_element.click(function () {
        return false;
      });

      filter_features_element.mousedown(function () {
        return false;
      });

      $(
        "#" +
          self.settings.target +
          " .filter_features ul li," +
          "#" +
          self.settings.target +
          " .filter_features div span"
      ).hover(
        function () {
          $(this).css({
            cursor: "pointer",
            opacity: "0.7",
          });
        },
        function () {
          $(this).css({
            cursor: "default",
            opacity: "1",
          });
        }
      );
    });

    self.target_element.find(".cancel_filter_list").click(function () {
      filter_features_element.fadeOut("fast");
      overlay.fadeOut("fast");
    });

    overlay.click(function () {
      filter_features_element.fadeOut("fast");
      overlay.fadeOut("fast");
    });

    self.target_element.find(".update_filter_list").click(function () {
      filter_features_element.fadeOut("slow");
      overlay.fadeOut("slow");

      var node_id =
        self.zoomed_clusters["row"].length > 0
          ? self.zoomed_clusters["row"][self.zoomed_clusters["row"].length - 1]
          : self.root_id;
      var highlighted_cluster = self.last_highlighted_cluster;
      self.last_highlighted_cluster = null;
      self._adjust_horizontal_sizes();
      self._delete_all_layers();
      self._draw_stage_layer();
      if (self.settings.dendrogram) {
        self._draw_dendrogram_layers();
        self._draw_row_dendrogram(node_id);
        self._draw_dendrogram_layers();
        if (
          self.settings.column_dendrogram &&
          self._visible_features_equal_column_dendrogram_count()
        ) {
          self._draw_column_dendrogram(self.column_root_id);
        }
      }

      self._draw_navigation();
      self._draw_heatmap();
      self._draw_heatmap_header();

      if (highlighted_cluster != null) {
        self._highlight_cluster(highlighted_cluster);
      }
    });
  }
};
InCHlib2.prototype._draw_target_overlay = function (opacity = 0.5) {
  var self = this;
  var overlay = self.target_element.find(".target_overlay");

  if (overlay.length) {
    overlay.fadeIn("fast");
  } else {
    overlay = $("<div class='target_overlay'></div>");
    overlay.css({
      "background-color": "white",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: opacity,
    });
    self.target_element.append(overlay);
  }

  return overlay;
};

InCHlib2.prototype._refresh_icon_click = function () {
  var self = this;
  self.redraw();
};

InCHlib2.prototype._export_icon_click = function () {
  var self = this;
  var export_menu = self.target_element.find(".export_menu");
  var overlay = self._draw_target_overlay();

  if (export_menu.length) {
    export_menu.fadeIn("fast");
  } else {
    export_menu = $(
      "<div class='export_menu'><div><button type='submit' data-action='open'>Show image</button></div><div><button type='submit' data-action='save'>Save image</button></div></div>"
    );
    self.target_element.append(export_menu);
    export_menu.css({
      position: "absolute",
      top: 45,
      left: self.settings.width - 125,
      "font-size": "12px",
      border: "solid #D2D2D2 1px",
      "border-radius": "5px",
      padding: "2px",
      "background-color": "white",
    });

    var buttons = export_menu.find("button");
    buttons.css({
      "padding-top": "7px",
      "padding-bottom": "5px",
      "padding-right": "8px",
      "padding-left": "8px",
      color: "white",
      border: "solid #D2D2D2 1px",
      width: "100%",
      "background-color": "#2171b5",
      "font-weight": "bold",
    });

    buttons.hover(
      function () {
        $(this).css({ cursor: "pointer", opacity: 0.7 });
      },
      function () {
        $(this).css({ opacity: 1 });
      }
    );

    overlay.click(function () {
      export_menu.fadeOut("fast");
      overlay.fadeOut("fast");
    });

    buttons.click(function () {
      var action = $(this).attr("data-action");
      var zoom = 3;
      var width = self.stage.width();
      var height = self.stage.height();
      var loading_div = $(
        "<h3 style='margin-top: 100px; margin-left: 100px; width: " +
          width +
          "px; height: " +
          height +
          "px;'>Loading...</h3>"
      );
      self.target_element.after(loading_div);
      self.target_element.hide();
      self.stage.width(width * zoom);
      self.stage.height(height * zoom);
      self.stage.scale({ x: zoom, y: zoom });
      self.stage.draw();
      self.navigation_layer.hide();
      self.stage.toDataURL({
        quality: 1,
        callback: function (dataUrl) {
          if (action === "open") {
            open_image(dataUrl);
          } else {
            download_image(dataUrl);
          }
          self.stage.width(width);
          self.stage.height(height);
          self.stage.scale({ x: 1, y: 1 });
          self.stage.draw();
          loading_div.remove();
          self.target_element.show();
          self.navigation_layer.show();
          //self.navigation_layer.draw();
          overlay.trigger("click");
        },
      });
    });
  }

  function download_image(dataUrl) {
    $('<a download="inchlib" href="' + dataUrl + '"></a>')[0].click();
  }

  function open_image(dataUrl) {
    window.open(dataUrl, "_blank");
  }
};

InCHlib2.prototype._color_scale_click = function (icon, evt) {
  var self = this;
  var i, option, key, value;
  var color_options = { heatmap_colors: "Heatmap data colors" };

  if (self.settings.metadata) {
    color_options["metadata_colors"] = "Metadata colors";
  }

  if (self.settings.column_metadata) {
    color_options["column_metadata_colors"] = "Column metadata colors";
  }

  var form_id = "settings_form_" + self.settings.target;
  var settings_form = $("#" + form_id);
  var overlay = self._draw_target_overlay(0); //creates transparent background
  if (settings_form.length) {
    //settings_form.fadeIn("fast");
    settings_form.remove();
  }
  // } else {
  settings_form = $("<form class='settings_form' id='" + form_id + "'></form>");
  var options = "",
    color_1,
    color_2,
    color_3,
    keys,
    len;

  for (
    i = 0, keys = Object.keys(color_options), len = keys.length;
    i < len;
    i++
  ) {
    key = keys[i];
    color_1 = self._get_color_for_value(0, 0, 1, 0.5, self.settings[key]);
    color_2 = self._get_color_for_value(0.5, 0, 1, 0.5, self.settings[key]);
    color_3 = self._get_color_for_value(1, 0, 1, 0.5, self.settings[key]);

    option =
      "<div><div class='form_label'>" +
      color_options[key] +
      "</div><input type='text' name='" +
      key +
      "' value='" +
      self.settings[key] +
      "'/> <div class='color_button' style='background: linear-gradient(to right, " +
      color_1 +
      "," +
      color_2 +
      "," +
      color_3 +
      ")'></div></div>";
    options += option;
  }

  option =
    "<div><div class='form_label'>Heatmap coloring</div>\
                <select name='independent_columns'>";

  if (self.settings.independent_columns) {
    option +=
      "<option value='true' selected>By columns</option>\
                  <option value='false'>Entire heatmap</option>";
  } else {
    option +=
      "<option value='true'>By columns</option>\
                  <option value='false' selected>Entire heatmap</option>";
  }
  option += "</select></div><div class='range-slider-5'></div>";
  options += option;

  settings_form.html(options);

  /// Create a script element
  var scriptElement = document.createElement("script");
  // Set the src attribute to the URL of range-slider.main.min.js
  scriptElement.src = "./range-slider.main.min.js";
  var scriptElement2 = document.createElement("script");

  //max_percentile: "Max percentile value",
  //   middle_percentile: "Middle percentile value",
  // min_percentile: "Min percentile value",
  console.log(self.settings);
  scriptElement2.textContent =
    'new RangeSlider(".range-slider-5", {\
  values: [' +
    self.settings["min_percentile"] +
    ", " +
    self.settings["middle_percentile"] +
    ", " +
    self.settings["max_percentile"] +
    '],\
  pointRadius: 6,\
  railHeight: 4,\
  trackHeight: 5,\
  colors: {\
      points: ["' +
    rgbToHex(color_1) +
    '", "' +
    rgbToHex(color_2) +
    '", "' +
    rgbToHex(color_3) +
    '"],\
      rail: "white",\
      tracks: [\
          "linear-gradient(90deg,' +
    rgbToHex(color_1) +
    " 0%, " +
    rgbToHex(color_2) +
    ' 100%)",\
          "linear-gradient(90deg, ' +
    rgbToHex(color_2) +
    " 0%, " +
    rgbToHex(color_3) +
    ' 100%)"\
      ]\
  }\
}).onChange(val => { window.inchlib.settings["min_percentile"] = val[0];window.inchlib.settings["middle_percentile"] = val[1]; window.inchlib.settings["max_percentile"] = val[2];    window.inchlib._recolorNow();})';

  scriptElement.onload = function () {
    // Now that the script is loaded, you can use RangeSlider
    document.head.appendChild(scriptElement2);
  };

  // Append the script element to the document's head or body
  document.head.appendChild(scriptElement);
  // or document.body.appendChild(scriptElement); depending on your preference

  self.target_element.append(settings_form);

  settings_form.css({
    "z-index": 1000,
    position: "absolute",
    top: 110,
    left: 0,
    padding: "10px",
    border: "solid #D2D2D2 2px",
    "border-radius": "5px",
    "background-color": "white",
  });
  $("#" + form_id + " .color_button").css({
    border: "solid #D2D2D2 1px",
    height: "15px",
    width: "30px",
    display: "inline-block",
  });
  $("#" + form_id + " > div").css({
    "font-size": "12px",
    "margin-bottom": "10px",
  });
  $("#" + form_id + " input").css({ "border-radius": "5px", width: "100px" });
  $("#" + form_id + " .form_label").css({
    color: "gray",
    "margin-bottom": "5px",
    "font-style": "italic",
  });
  $("#" + form_id + " button").css({
    "padding-top": "7px",
    "padding-bottom": "5px",
    "padding-right": "5px",
    "padding-left": "5px",
    color: "white",
    border: "solid #D2D2D2 1px",
    "border-radius": "5px",
    width: "100%",
    "background-color": "#2171b5",
    "font-weight": "bold",
  });

  overlay.click(function () {
    settings_form.fadeOut("fast");
    overlay.fadeOut("fast");
  });

  var color_buttons = $("#" + form_id + " .color_button");
  var range_slider = $("#" + form_id + " .range-slider-5");
  var independent_columns = $("[name='independent_columns']");
  console.log(independent_columns, independent_columns.value);
  independent_columns.on("change", function () {
    // Get the selected option's value
    self.settings["independent_columns"] = $(this).val();
    window.inchlib._recolorNow();
  });

  console.log(range_slider);
  color_buttons.hover(
    function () {
      $(this).css({ cursor: "pointer", opacity: 0.7 });
    },
    function () {
      $(this).css({ opacity: 1 });
    }
  );

  color_buttons.click(function (evt) {
    self._draw_color_scales_select(this, evt);
  });
};

InCHlib2.prototype._recolorNow = function () {
  //this.update_settings(settings);
  this._recolor_heatmap();
  this._update_color_scale();
  this.refresh();
};

InCHlib2.prototype._draw_color_scales_select = function (element, evt) {
  var self = this;
  var scales_div = self.target_element.find(".color_scales");
  var scale_divs;

  if (scales_div.length) {
    scales_div.fadeIn("fast");
    scale_divs = scales_div.find(".color_scale");
  } else {
    scales_div = $("<div class='color_scales'></div>");
    var scale, color_1, color_2, color_3, key;

    for (
      var i = 0, keys = Object.keys(self.colors), len = keys.length;
      i < len;
      i++
    ) {
      key = keys[i];
      color_1 = self._get_color_for_value(0, 0, 1, 0.5, key);
      color_2 = self._get_color_for_value(0.5, 0, 1, 0.5, key);
      color_3 = self._get_color_for_value(1, 0, 1, 0.5, key);
      scale =
        "<div class='color_scale' data-scale_acronym='" +
        key +
        "' style='background: linear-gradient(to right, " +
        color_1 +
        "," +
        color_2 +
        "," +
        color_3 +
        ")'></div>";
      scales_div.append(scale);
    }
    self.target_element.append(scales_div);
    scales_div.css({
      border: "solid #D2D2D2 2px",
      "border-radius": "5px",
      padding: "5px",
      position: "absolute",
      top: 110,
      left: 170,
      "background-color": "white",
    });

    scale_divs = self.target_element.find(".color_scale");
    scale_divs.css({
      "margin-top": "3px",
      width: "80px",
      height: "20px",
      border: "solid #D2D2D2 1px",
    });

    scale_divs.hover(
      function () {
        $(this).css({ cursor: "pointer", opacity: 0.7 });
      },
      function () {
        $(this).css({ opacity: 1 });
      }
    );

    self.target_element.find(".target_overlay").click(function () {
      scales_div.fadeOut("fast");
    });
  }

  scale_divs.on("click", function () {
    var color = $(this).attr("data-scale_acronym");
    var input = $(element).prev("input:first").val(color);

    $(element).css({
      background:
        "linear-gradient(to right, " +
        self._get_color_for_value(0, 0, 1, 0.5, color) +
        "," +
        self._get_color_for_value(0.5, 0, 1, 0.5, color) +
        "," +
        self._get_color_for_value(1, 0, 1, 0.5, color) +
        ")",
    });
    var form_id = "settings_form_" + self.settings.target;
    var settings_form = $("#" + form_id);
    settings_form.fadeOut("fast");
    self.settings["heatmap_colors"] = color;
    self._recolorNow();

    scales_div.fadeOut("fast");
    scale_divs.off("click");
  });
};
InCHlib2.prototype._recolor_heatmap = function () {
  var self = this;

  console.log("ReColoring", this);

  self._set_color_settings();

  for (var rows of this.heatmap_layer.children) {
    for (var sprite of rows.children) {
      var col_index = sprite.column.split("_").pop();
      var color = self._get_color_for_value(
        sprite.value,
        self.data_descs[col_index]["min"],
        self.data_descs[col_index]["max"],
        self.data_descs[col_index]["middle"],
        self.settings.heatmap_colors
      );
      sprite.tint = color;
    }
  }
  self.refresh();
};

InCHlib2.prototype._color_scale_mouseover = function (color_scale, layer) {
  var self = this;
  console.log(color_scale);
  var label = color_scale.label;
  var x = color_scale.x;
  var y = color_scale.y;

  self.icon_tooltip = self.objects_ref.tooltip_label({ x: x, y: y + 25 });

  self.icon_tooltip.addChild(self.objects_ref.tooltip_tag({ fill: "#808080" }));
  self.icon_tooltip.addChild(self.objects_ref.tooltip_text({ text: label }));

  layer.addChild(self.icon_tooltip);
  moveToTop(self.icon_tooltip);
  color_scale.opacity = 0.7;
  this.refresh();
  //layer.draw();
};

InCHlib2.prototype._color_scale_mouseout = function (color_scale, layer) {
  var self = this;
  self.icon_tooltip.destroy();
  color_scale.opacity = 1;
  this.refresh();
  //layer.draw();
};

InCHlib2.prototype._unzoom_icon_click = function () {
  var self = this;
  self._unzoom_cluster();
  this.refresh();
};

InCHlib2.prototype._column_unzoom_icon_click = function () {
  var self = this;
  self._unzoom_column_cluster();
  this.refresh();
};

InCHlib2.prototype._icon_mouseover = function (icon, icon_overlay, layer) {
  var self = this;
  console.log(icon, layer);
  if (icon.id !== "help_icon") {
    var label = icon.label;
    var x = icon_overlay.x;
    var y = icon_overlay.y;
    var width = icon_overlay.width;
    var height = icon_overlay.height;

    if (icon.id === "export_icon") {
      x = x - 100;
      y = y - 50;
    }

    self.icon_tooltip = self.objects_ref.tooltip_label({
      x: x,
      y: y + 1.2 * height,
    });

    self.icon_tooltip.addChild(self.objects_ref.tooltip_tag({}));
    self.icon_tooltip.addChild(self.objects_ref.tooltip_text({ text: label }));
    layer.addChild(self.icon_tooltip);
    console.log(self.icon_tooltip);
  }
  icon.tint = "yellow";
  //layer.draw();
};

InCHlib2.prototype._icon_mouseout = function (icon, icon_overlay, layer) {
  var self = this;
  if (icon.id !== "help_icon") {
    self.icon_tooltip.destroy();
  }
  icon.tint = "grey";
  // layer.draw();
};

InCHlib2.prototype._help_mouseover = function () {
  var self = this;
  var help_element = self.target_element.find(".inchlib_help");
  if (help_element.length) {
    help_element.show();
  } else {
    help_element = $(
      "<div class='inchlib_help'><ul><li>Zoom clusters by a long click on a dendrogram node.</li></ul></div>"
    );
    help_element.css({
      position: "absolute",
      top: 70,
      left: self.settings.width - 200,
      "font-size": 12,
      "padding-right": 15,
      width: 200,
      "background-color": "white",
      "border-radius": 5,
      border: "solid #DEDEDE 2px",
      "z-index": 1000,
    });
    self.target_element.append(help_element);
  }
};

InCHlib2.prototype._help_mouseout = function () {
  var self = this;
  self.target_element.find(".inchlib_help").hide();
};

InCHlib2.prototype._dendrogram_layers_click = function (layer, evt) {
  var self = this;
  var path_id = evt.target.id;
  console.log(evt.target);
  //layer.fire("mouseout", layer, evt);
  self._highlight_cluster(path_id);
  self.events.dendrogram_node_onclick(
    self.current_object_ids,
    self._unprefix(path_id),
    evt
  );
};

InCHlib2.prototype._column_dendrogram_layers_click = function (layer, evt) {
  var self = this;
  var path_id = evt.target.path_id;
  //layer.fire("mouseout", layer, evt);
  self._highlight_column_cluster(path_id);
  self.events.column_dendrogram_node_onclick(
    self.current_column_ids,
    self._unprefix(path_id),
    evt
  );
};

InCHlib2.prototype._dendrogram_layers_mousedown = function (layer, evt) {
  var self = this;
  console.log(evt);
  var node_id = evt.target.path_id;
  clearTimeout(self.timer);
  self.timer = setTimeout(function () {
    self._get_object_ids(node_id);
    self._zoom_cluster(node_id);
  }, 500);
};

InCHlib2.prototype._column_dendrogram_layers_mousedown = function (layer, evt) {
  var self = this;
  var node_id = evt.target.path_id;
  clearTimeout(self.timer);
  self.timer = setTimeout(function () {
    self._get_column_ids(node_id);
    self._zoom_column_cluster(node_id);
  }, 500);
};

InCHlib2.prototype._dendrogram_layers_mouseup = function (layer, evt) {
  var self = this;
  clearTimeout(self.timer);
};

InCHlib2.prototype._dendrogram_layers_mouseout = function (layer, evt) {
  var self = this;
  //if (self.path_overlay) self.path_overlay.destroy();
  if (self.path_overlay && self.path_overlay.parent) {
    // Remove 'path_overlay' from its parent container
    self.path_overlay.parent.removeChild(self.path_overlay);
  } else if (self.path_overlay) {
    self.path_overlay.destroy();
  }

  //if (self.dendrogram_hover_layer) self.dendrogram_hover_layer.draw();
};

InCHlib2.prototype._dendrogram_layers_mouseover = function (layer, evt) {
  var self = this;
  //console.log(evt);
  if (evt.currentTarget.path) {
    self.path_overlay = evt.target.path.clone({ strokeWidth: 4 });
    self.dendrogram_hover_layer.addChild(self.path_overlay);
    //self.dendrogram_hover_layer.draw();
  }
};

InCHlib2.prototype._visible_features_equal_column_dendrogram_count =
  function () {
    var self = this;
    if (
      self.on_features["data"].length + self.on_features["metadata"].length ==
      self.current_column_count
    ) {
      return true;
    }
    return false;
  };

InCHlib2.prototype._get_color_for_value = function (
  value,
  min,
  max,
  middle,
  color_scale
) {
  var self = this;
  var color = self.colors[color_scale];
  var c1 = color["start"];
  var c2 = color["end"];

  if (value > max) {
    return "rgb(" + c2.r + "," + c2.g + "," + c2.b + ")";
  }

  if (min == max || value < min) {
    return "rgb(" + c1.r + "," + c1.g + "," + c1.b + ")";
  }

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
  return "rgb(" + r + "," + g + "," + b + ")";
};

InCHlib2.prototype._get_font_size = function (
  text_length,
  width,
  height,
  max_font_size
) {
  var self = this;
  var max_possible_size = height - 2;
  var font_size = max_possible_size;

  if ((font_size / 2) * text_length > width - 10) {
    font_size = font_size / (((font_size / 2) * text_length) / (width - 10));
  }
  font_size = font_size > max_possible_size ? max_possible_size : font_size;
  font_size = font_size > max_font_size ? max_font_size : font_size;
  return font_size;
};

InCHlib2.prototype._get_object_ids = function (node_id) {
  var self = this;
  self.current_object_ids = [];
  self._collect_object_ids(node_id);
};

InCHlib2.prototype._collect_object_ids = function (node_id) {
  var self = this;
  console.log(node_id, self.data.nodes);
  if (self.data.nodes[node_id]["left_child"] !== undefined) {
    self._collect_object_ids(self.data.nodes[node_id]["left_child"]);
    self._collect_object_ids(self.data.nodes[node_id]["right_child"]);
  } else {
    self.current_object_ids.push.apply(
      self.current_object_ids,
      self.data.nodes[node_id]["objects"]
    );
  }
};

InCHlib2.prototype._get_column_ids = function (node_id) {
  var self = this;
  self.current_column_ids = [];
  self._collect_column_ids(node_id);
  self.current_column_ids.sort(function (a, b) {
    return a - b;
  });
};

InCHlib2.prototype._collect_column_ids = function (node_id) {
  var self = this;
  if (self.column_dendrogram.nodes[node_id]["left_child"] !== undefined) {
    self._collect_column_ids(
      self.column_dendrogram.nodes[node_id]["left_child"]
    );
    self._collect_column_ids(
      self.column_dendrogram.nodes[node_id]["right_child"]
    );
  } else {
    self.current_column_ids.push(self.nodes2columns[node_id]);
  }
};

InCHlib2.prototype._hack_size = function (obj) {
  var self = this;
  return Object.keys(obj).length;
};

InCHlib2.prototype._hack_round = function (value) {
  var self = this;
  return (0.5 + value) >> 0;
};

InCHlib2.prototype._is_number = function (n) {
  var self = this;
  return !isNaN(parseFloat(n)) && isFinite(n);
};

InCHlib2.prototype._row_mouseenter = function (evt) {
  var self = this;
  var row_id = evt.target.name;
  console.log("_row_mouseenter");

  //var visible = self._get_visible_count();

  if (evt.target.parent?.id !== "column_metadata") {
    self.highlighted_row = row_id;
    var y = self.leaves_y_coordinates[row_id];
    var x = self.heatmap_distance;

    //Linear overlay white
    self.row_overlay = self.objects_ref.heatmap_line({
      x1: x,
      y1: y,
      x2: x + self.heatmap_width,
      y2: y,
      color: "#FFFFFF",
      text_value: "",
      col_index: "",
      pixels_for_leaf: self.pixels_for_leaf,
      opacity: 0.3,
    });

    //self.heatmap_overlay.addChild(self.row_overlay);
    console.log(self.row_overlay);
    //self.row_overlay.render(self.app.renderer)
    
    this.app.stage.addChild(self.row_overlay);
    this.refresh();


  
      
    self.events.row_onmouseover(self.data.nodes[row_id].objects, evt);
  }
};

InCHlib2.prototype._row_mouseleave = function (evt) {
  var self = this;
  if (self.row_overlay && self.row_overlay.parent){
    self.row_overlay.parent.removeChild(self.row_overlay);
    self.refresh();
  }      
  this.events.row_onmouseout(evt);
}

InCHlib2.prototype._draw_col_label = function (evt) {
  var self = this;
  var x_loc =
    Math.floor(
      (evt.globalX - evt.target.children[0].x) / evt.target.children[0].width
    );
  if (x_loc < 0) {
    console.log(
      "Something is wrong index is less than 0",
      x_loc,
      evt.target.children
    );
    return;
  }

  if (
    this.currentColumn &&
    this.highlighted_row &&
    (Number)(this.currentColumn) === x_loc &&
    (String)(this.highlighted_row) === (String)(evt.target.name)
  ){
     console.log("Equal");
return; 
  }
     

    console.log(
      this.currentColumn,
      this.highlighted_row,
      x_loc,
      evt.target.name
    );
  this.currentColumn = x_loc;
   

  var current_data = evt.target.children[x_loc];
  //var attrs = evt.target.attrs;

  var x = current_data.x;

  //var y = points[1] - 0.5 * self.pixels_for_leaf;
  var y = current_data.y;
  var column = current_data.column.split("_");
  var header_type2value = {
    d: self.heatmap_header[column[1]],
    m: self.metadata_header[column[1]],
    Count: "Count",
  };

  if (self.column_metadata_header !== undefined) {
    header_type2value["cm"] = self.column_metadata_header[column[1]];
  }

  var value = current_data.value;

  var header = header_type2value[column[0]];
  console.log(header, self.last_column);

  if (header !== self.last_column) {
    if(self.column_overlay)
      self.column_overlay.parent?.removeChild(self.column_overlay);
    self.last_column = current_data.column;    
    self.column_overlay = self.objects_ref.heatmap_line({
      x1: x,
      y1: self.header_height,
      x2: x + self.pixels_for_dimension,
      y2:
        self.header_height +
        self.column_metadata_height +
        (self.heatmap_array.length + 0.5) * self.pixels_for_leaf,
      color: "#FFFFFF",
      text_value: "",
      col_index: "",
      pixels_for_leaf: self.pixels_for_dimension,
      opacity: 0.3,
    });

    self.heatmap_overlay.addChild(self.column_overlay);
  
  }

  var row_id = current_data.row_id;

  if (header !== undefined) {
    value = ["Col: " + header, "Val: " + value].join("\n");
  }

  if (row_id !== undefined) {
    value = ["Row: " + row_id, value].join("\n");
  }

  var tooltip = self.objects_ref.tooltip_label({
    x: x - 50 + self.pixels_for_dimension/2,
    y: y - 50 - self.pixels_for_leaf / 2, //TO DO WE need to change the pointer up
  });

  tooltip.addChild(
    self.objects_ref.tooltip_tag({ pointerDirection: "up", fill: "#f3ca20" }),
    self.objects_ref.tooltip_text({ text: value, fill: "#000000" })
  );
  //self.tooltip?.parent.removeChild(self.tooltip); 
  self.tooltip?.destroy()
  self.tooltip = tooltip;
  self.heatmap_overlay.addChild(tooltip);
  
  //moveToTop(self.heatmap_overlay);
  moveToTop(self.tooltip);
  //self.heatmap_overlay.draw();
  //this.refresh(self.column_overlay);
  this.refresh();
};

InCHlib2.prototype._unprefix = function (prefixed) {
  var self = this;
  //console.log(prefixed);
  return prefixed.split(self.settings.target + "#")[1];
};

InCHlib2.prototype._prefix = function (nonprefixed) {
  var self = this;
  return self.settings.target + "#" + nonprefixed;
};

/**
 * Returns array of features for object by its ID. When sent object ID is not present, false is returned
 */
InCHlib2.prototype.get_features_for_object = function (object_id) {
  var self = this;
  if (self.objects2leaves[object_id] !== undefined) {
    var row_id = self.objects2leaves[object_id];
    return self.data.nodes[row_id].features;
  }
  return false;
};

/**
 * Adds a user defined color scale defined by its name start color, end color and optionaly middle color
 */
InCHlib2.prototype.add_color_scale = function (color_scale_name, color_scale) {
  var self = this;
  self.colors[color_scale_name] = color_scale;
  self.target_element.find(".color_scales").remove();
};

InCHlib2.prototype._get_visible_count = function () {
  var self = this;
  return (
    self.on_features["data"].length +
    self.on_features["metadata"].length +
    self.on_features["count_column"].length
  );
};

/**
 * Update cluster heatmap settings
 */
InCHlib2.prototype.update_settings = function (settings_object) {
  var self = this;
  var navigation_toggle = self.settings.navigation_toggle;
  $.extend(self.settings, settings_object);

  if (settings_object.navigation_toggle !== undefined) {
    self.settings.navigation_toggle = navigation_toggle;
    $.extend(
      self.settings.navigation_toggle,
      settings_object.navigation_toggle
    );
  }
};

/**
 * Redraw cluster heatmap
 */
InCHlib2.prototype.redraw = function () {
  var self = this;
  console.log("redraw triggered");
  //self._delete_all_layers();
  //self.draw();
};

/**
 * Redraw heatmap only
 */
InCHlib2.prototype.redraw_heatmap = function () {
  console.log("Redrawing", this);
  this.stage.removeChildren();
  var self = this;
  /*
  self._delete_layers([
    self.heatmap_layer,
    self.heatmap_overlay,
    self.highlighted_rows_layer,
    self.header_layer,
  ]);*/
  self._set_color_settings();
  self._draw_heatmap();
  self._draw_heatmap_header();
  self.stage.addChild(this.navigation_layer);
  moveToTop(self.heatmap_layer);
  self.refresh();
};

function rgbToHex(rgb) {
  // Use a regular expression to match the RGB format and extract r, g, and b
  const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);

  // If the result is not null, convert to hex
  if (result) {
    const r = parseInt(result[1], 10);
    const g = parseInt(result[2], 10);
    const b = parseInt(result[3], 10);

    // Convert each component to hex and pad with zero if necessary
    return (
      "#" +
      ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()
    );
  } else {
    // Return the original string if it's not in RGB format
    return rgb;
  }
}

function moveToTop(displayObject) {
  if (displayObject && displayObject.parent) {
    const parent = displayObject.parent;
    parent.removeChild(displayObject);
    parent.addChild(displayObject);
  }
}

// Function to move a PIXI.DisplayObject to the bottom (back)
function moveToBottom(displayObject) {
  if (displayObject && displayObject.parent) {
    const parent = displayObject.parent;
    parent.removeChild(displayObject);
    parent.addChildAt(displayObject, 0); // Add at index 0 to place it at the bottom
  }
}

//module.exports = InCHlib2;
export default InCHlib2;
