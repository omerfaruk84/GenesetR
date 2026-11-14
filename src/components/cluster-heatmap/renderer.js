/**
 * ClusterHeatmap - a cluster heatmap renderer that draws the matrix as ONE
 * texture (one texel per cell) instead of one scene-graph object per cell.
 *
 * - Matrix: WebGL2 float texture + colour lookup texture, coloured in the
 *   fragment shader. Zoom, pan and colour-scale changes only update uniforms.
 *   Falls back to a Canvas2D image when WebGL2 is unavailable or the matrix is
 *   larger than the GPU texture limit.
 * - Dendrograms, labels, selection and hover: a 2D canvas on top that only
 *   draws what is inside the viewport.
 * - Hit testing is arithmetic (row = floor(y / cellHeight)); there are no
 *   per-cell or per-node event listeners.
 *
 * It reads the JSON produced by `inchlib_clust` unchanged and exposes the part
 * of the InCHlib API that `components/heat-map` uses, so it can be passed to
 * that component as `inchlibConstructor`.
 *
 * The module has no dependencies.
 */

const COLOR_SCALES = {
  YlGn: { start: [255, 255, 204], end: [35, 132, 67] },
  GnBu: { start: [240, 249, 232], end: [43, 140, 190] },
  BuGn: { start: [237, 248, 251], end: [35, 139, 69] },
  PuBu: { start: [241, 238, 246], end: [5, 112, 176] },
  BuPu: { start: [237, 248, 251], end: [136, 65, 157] },
  RdPu: { start: [254, 235, 226], end: [174, 1, 126] },
  PuRd: { start: [241, 238, 246], end: [206, 18, 86] },
  OrRd: { start: [254, 240, 217], end: [215, 48, 31] },
  Purples2: { start: [242, 240, 247], end: [106, 81, 163] },
  Blues: { start: [239, 243, 255], end: [33, 113, 181] },
  Greens: { start: [237, 248, 233], end: [35, 139, 69] },
  Oranges: { start: [254, 237, 222], end: [217, 71, 1] },
  Reds: { start: [254, 229, 217], end: [203, 24, 29] },
  Greys: { start: [247, 247, 247], end: [82, 82, 82] },
  PuOr: { start: [230, 97, 1], end: [94, 60, 153] },
  BrBG: { start: [166, 97, 26], end: [1, 133, 113] },
  RdBu: { start: [202, 0, 32], end: [5, 113, 176] },
  RdGy: { start: [202, 0, 32], end: [64, 64, 64] },
  BuYl: { start: [5, 113, 176], end: [250, 233, 42] },
  YlOrR: { start: [255, 255, 178], middle: [204, 76, 2], end: [227, 26, 28] },
  YlOrB: { start: [255, 255, 212], middle: [204, 76, 2], end: [5, 112, 176] },
  PRGn2: { start: [123, 50, 148], middle: [202, 0, 32], end: [0, 136, 55] },
  PiYG2: { start: [208, 28, 139], middle: [255, 255, 178], end: [77, 172, 38] },
  YlGnBu: { start: [255, 255, 204], middle: [35, 132, 67], end: [34, 94, 168] },
  RdYlBu: { start: [215, 25, 28], middle: [255, 255, 178], end: [44, 123, 182] },
  RdYlGn: { start: [215, 25, 28], middle: [255, 255, 178], end: [26, 150, 65] },
  BuWhRd: { start: [33, 113, 181], middle: [255, 255, 255], end: [215, 25, 28] },
  RdLrBu: { start: [215, 25, 28], middle: [254, 229, 217], end: [44, 123, 182] },
  RdBkGr: { start: [215, 25, 28], middle: [0, 0, 0], end: [35, 139, 69] },
  RdLrGr: { start: [215, 25, 28], middle: [254, 229, 217], end: [35, 139, 69] },
  // Colour-blind-safe: purple-white-green (diverging) and three perceptually
  // uniform sequential scales given as evenly spaced stops.
  PRGn: { start: [118, 42, 131], middle: [247, 247, 247], end: [27, 120, 55] },
  Viridis: {
    stops: [
      [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
      [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37],
    ],
  },
  Cividis: {
    stops: [
      [0, 32, 77], [0, 48, 111], [55, 69, 108], [87, 91, 109], [115, 113, 115],
      [144, 137, 116], [174, 162, 110], [207, 189, 95], [240, 217, 69], [255, 234, 70],
    ],
  },
  Magma: {
    stops: [
      [0, 0, 4], [28, 16, 68], [79, 18, 123], [129, 37, 129], [181, 54, 122],
      [229, 80, 100], [251, 135, 97], [254, 194, 135], [252, 253, 191],
    ],
  },
};

// Scales with a neutral middle colour: zero is put on the middle when the
// data has both signs.
const DIVERGING = new Set([
  "BuWhRd", "RdLrBu", "RdBkGr", "RdLrGr", "RdYlBu", "RdYlGn", "PiYG2", "PRGn2", "PRGn",
]);

const DEFAULT_SCALE = "BuWhRd";
const MISSING = 3.0e38; // texel value for a missing cell
const MISSING_RGB = [232, 232, 232];
const LUT_SIZE = 256;
const PAD = 8;
const LEGEND_H = 34; // value histogram above the colour bar
const GAP = 6;
const MAX_CELL = 64;
const HIT_PX = 6;
const TRACK = 10; // width of one annotation track, including 1 px of space
const TRACK_COLORS = ["#111111", ...["#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#8c564b", "#e377c2", "#17becf"]];
const TRACK_OFF = "#e3e6ea";
// The dendrogram uses this share of its area, leaving a rest position for the
// cut line beyond the root. A cut at or above 1 (the root) means "no cut".
const TREE_SHARE = 0.92;
const MAX_CUT = 1 / TREE_SHARE;
const CLUSTER_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#8c564b", "#e377c2", "#17becf", "#bcbd22",
];

const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uData;
uniform sampler2D uLut;
uniform vec2 uOrigin;   // top-left of the heatmap view, in gl_FragCoord space
uniform vec2 uOffset;   // scroll offset, device px
uniform vec2 uCell;     // cell size, device px
uniform vec2 uCount;    // columns, rows
uniform vec3 uRange;    // min, middle, max
uniform float uHasMiddle;
uniform vec3 uMissing;
out vec4 outColor;
void main() {
  vec2 p = vec2(gl_FragCoord.x - uOrigin.x, uOrigin.y - gl_FragCoord.y);
  vec2 c = (p + uOffset) / uCell;
  if (c.x < 0.0 || c.y < 0.0 || c.x >= uCount.x || c.y >= uCount.y) discard;
  // Zoomed out, several cells share one pixel: average up to 4 x 4 of them
  // (missing cells left out) instead of showing whichever one is hit.
  vec2 perPixel = 1.0 / uCell;
  int nx = int(clamp(ceil(perPixel.x), 1.0, 4.0));
  int ny = int(clamp(ceil(perPixel.y), 1.0, 4.0));
  float sum = 0.0;
  float count = 0.0;
  for (int j = 0; j < 4; j++) {
    if (j >= ny) break;
    for (int i = 0; i < 4; i++) {
      if (i >= nx) break;
      vec2 offset = (vec2(float(i), float(j)) + 0.5) / vec2(float(nx), float(ny)) - 0.5;
      vec2 s = (p + offset + uOffset) / uCell;
      if (s.x < 0.0 || s.y < 0.0 || s.x >= uCount.x || s.y >= uCount.y) continue;
      float value = texelFetch(uData, ivec2(s), 0).r;
      if (value > 1.0e38) continue;
      sum += value;
      count += 1.0;
    }
  }
  if (count < 0.5) { outColor = vec4(uMissing, 1.0); return; }
  float v = sum / count;
  float t;
  if (uHasMiddle > 0.5) {
    t = v < uRange.y
      ? 0.5 * (v - uRange.x) / max(uRange.y - uRange.x, 1e-12)
      : 0.5 + 0.5 * (v - uRange.y) / max(uRange.z - uRange.y, 1e-12);
  } else {
    t = (v - uRange.x) / max(uRange.z - uRange.x, 1e-12);
  }
  t = clamp(t, 0.0, 1.0);
  outColor = vec4(texture(uLut, vec2(t * ${(LUT_SIZE - 1) / LUT_SIZE} + ${0.5 / LUT_SIZE}, 0.5)).rgb, 1.0);
}`;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const noop = () => {};

const formatValue = (v) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
};

/**
 * Lays out a dendrogram stored as `{ id: { left_child, right_child, distance } }`.
 * Leaves are numbered by an in-order walk (left child first). `reverse` mirrors
 * the positions, which is how InCHlib places the column dendrogram.
 */
function buildTree(nodes, reverse) {
  const hasChild = (node, key) =>
    node && node[key] !== undefined && node[key] !== null && nodes[node[key]] !== undefined;
  const isLeaf = (node) => !(hasChild(node, "left_child") && hasChild(node, "right_child"));

  const ids = Object.keys(nodes);
  const children = new Set();
  ids.forEach((id) => {
    const node = nodes[id];
    if (!isLeaf(node)) {
      children.add(String(node.left_child));
      children.add(String(node.right_child));
    }
  });
  const roots = ids.filter((id) => !isLeaf(nodes[id]) && !children.has(id));

  const leafIds = [];
  const info = new Map(); // id -> { pos, lo, hi, dist }
  const internal = [];
  const visitLeaf = (id) => {
    const index = leafIds.length;
    leafIds.push(id);
    info.set(id, { pos: index + 0.5, lo: index, hi: index, dist: 0 });
  };

  // Iterative walk: single-linkage trees can be thousands of levels deep.
  roots.forEach((root) => {
    const stack = [[root, 0]];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const id = top[0];
      const node = nodes[id];
      if (info.has(id)) {
        stack.pop();
      } else if (isLeaf(node)) {
        visitLeaf(id);
        stack.pop();
      } else if (top[1] === 0) {
        top[1] = 1;
        stack.push([String(node.left_child), 0]);
      } else if (top[1] === 1) {
        top[1] = 2;
        stack.push([String(node.right_child), 0]);
      } else {
        const a = info.get(String(node.left_child));
        const b = info.get(String(node.right_child));
        info.set(id, {
          pos: (a.pos + b.pos) / 2,
          lo: Math.min(a.lo, b.lo),
          hi: Math.max(a.hi, b.hi),
          dist: Number(node.distance) || 0,
        });
        internal.push(id);
        stack.pop();
      }
    }
  });
  // Leaves that no tree reaches (unclustered data) keep their key order.
  ids.forEach((id) => {
    if (!info.has(id) && isLeaf(nodes[id])) visitLeaf(id);
  });

  const n = leafIds.length;
  const m = internal.length;
  let minDist = Infinity;
  let maxDist = 0;
  internal.forEach((id) => {
    const d = info.get(id).dist;
    if (d < minDist) minDist = d;
    if (d > maxDist) maxDist = d;
  });
  // Trim the empty band below the lowest merge so the tree uses its space.
  const base = m ? Math.max(0, minDist - 0.15 * (maxDist - minDist)) : 0;
  const span = maxDist - base;
  const height = (d, leaf) => (leaf ? 0 : span > 0 ? clamp((d - base) / span, 0.02, 1) : 1);

  const tree = {
    leafCount: n,
    nodeCount: m,
    ids: internal,
    aPos: new Float32Array(m),
    bPos: new Float32Array(m),
    h: new Float32Array(m),
    aH: new Float32Array(m),
    bH: new Float32Array(m),
    lo: new Int32Array(m),
    hi: new Int32Array(m),
    leafIds: reverse ? leafIds.slice().reverse() : leafIds,
  };
  internal.forEach((id, i) => {
    const node = nodes[id];
    const self = info.get(id);
    const a = info.get(String(node.left_child));
    const b = info.get(String(node.right_child));
    tree.aPos[i] = reverse ? n - a.pos : a.pos;
    tree.bPos[i] = reverse ? n - b.pos : b.pos;
    tree.h[i] = height(self.dist, false);
    tree.aH[i] = height(a.dist, isLeaf(nodes[node.left_child]));
    tree.bH[i] = height(b.dist, isLeaf(nodes[node.right_child]));
    tree.lo[i] = reverse ? n - 1 - self.hi : self.lo;
    tree.hi[i] = reverse ? n - 1 - self.lo : self.hi;
  });
  const indexOf = new Map(internal.map((id, i) => [id, i]));
  tree.parent = new Int32Array(m).fill(-1);
  internal.forEach((id, i) => {
    [nodes[id].left_child, nodes[id].right_child].forEach((child) => {
      const index = indexOf.get(String(child));
      if (index !== undefined) tree.parent[index] = i;
    });
  });
  return tree;
}

/**
 * Cuts a tree at normalised height `cut`: every subtree whose top merge lies
 * at or below the cut (and whose parent lies above it) is one cluster; leaves
 * left over are clusters of one. Clusters are returned in display order.
 */
function cutTree(tree, cut) {
  const n = tree.leafCount;
  const candidates = [];
  for (let i = 0; i < tree.nodeCount; i++) {
    const parent = tree.parent[i];
    if (tree.h[i] <= cut && (parent < 0 || tree.h[parent] > cut)) {
      candidates.push({ lo: tree.lo[i], hi: tree.hi[i], node: i });
    }
  }
  // Widest first, so a subtree nested in an accepted cluster is skipped.
  candidates.sort((a, b) => a.lo - b.lo || b.hi - a.hi);
  const list = [];
  let next = 0;
  const addSingles = (until) => {
    for (; next < until; next++) list.push({ lo: next, hi: next, node: -1 });
  };
  candidates.forEach((candidate) => {
    if (candidate.lo < next) return;
    addSingles(candidate.lo);
    list.push(candidate);
    next = candidate.hi + 1;
  });
  addSingles(n);

  const leafCluster = new Int32Array(n);
  let color = 0;
  list.forEach((cluster, k) => {
    cluster.color = cluster.node >= 0 ? color++ : -1;
    for (let r = cluster.lo; r <= cluster.hi; r++) leafCluster[r] = k;
  });
  return { list, leafCluster };
}

function buildLut(scaleName) {
  const scale = COLOR_SCALES[scaleName] || COLOR_SCALES[DEFAULT_SCALE];
  const lut = new Uint8Array(LUT_SIZE * 4);
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    let from = scale.start;
    let to = scale.end;
    let f = t;
    if (scale.stops) {
      const position = t * (scale.stops.length - 1);
      const index = Math.min(Math.floor(position), scale.stops.length - 2);
      from = scale.stops[index];
      to = scale.stops[index + 1];
      f = position - index;
    } else if (scale.middle) {
      if (t < 0.5) {
        to = scale.middle;
        f = t * 2;
      } else {
        from = scale.middle;
        f = (t - 0.5) * 2;
      }
    }
    lut[i * 4] = Math.round(from[0] + (to[0] - from[0]) * f);
    lut[i * 4 + 1] = Math.round(from[1] + (to[1] - from[1]) * f);
    lut[i * 4 + 2] = Math.round(from[2] + (to[2] - from[2]) * f);
    lut[i * 4 + 3] = 255;
  }
  return lut;
}

class ClusterHeatmap {
  constructor(options = {}) {
    this.settings = {
      target: null,
      max_height: 800,
      heatmap_colors: DEFAULT_SCALE,
      draw_row_ids: true,
      heatmap_header: true,
      dendrogram: true,
      column_dendrogram: true,
      show_cell_values: false,
      max_column_width: 20,
      max_row_height: 20,
      heatmap_part_width: 0.9,
      max_dendrogram_width: 200,
      max_dendrogram_height: 110,
      dendrogram_line_width: 1,
      columns_order: [],
      highlighted_rows: [],
      font: "Helvetica, Arial, sans-serif",
      ...options,
    };
    this.events = {
      row_onclick: noop,
      row_onmouseover: noop,
      row_onmouseout: noop,
      dendrogram_node_onclick: noop,
      column_dendrogram_node_onclick: noop,
      empty_space_onclick: noop,
      heatmap_onmouseout: noop,
      // Called with getRangeInfo() whenever the colour range or the data changes.
      range_onchange: noop,
      // Called when the user sets the range on the legend: { min, max, auto }.
      range_onuserchange: noop,
      // Called with { axis, label, objects } when a row or column label is clicked.
      label_onclick: noop,
      // Called with getViewState() when the zoom, the position or a cut changes.
      view_onchange: noop,
      // Called with getClusters() when a cut line is released or cleared.
      clusters_onchange: noop,
    };

    this.data = null;
    this.column_dendrogram = null;
    this.leaves_y_coordinates = {};
    this.objects2leaves = {};

    this._nRows = 0;
    this._nCols = 0;
    this._values = null; // Float32Array in display order (rows x columns)
    this._range = { min: 0, mid: 0.5, max: 1 };
    this._lut = buildLut(this.settings.heatmap_colors);
    this._cam = null; // { cw, ch, sx, sy } in CSS px
    this._layoutBox = null;
    this._hover = null;
    this._hoverNode = { row: -1, col: -1 };
    this._selected = { row: -1, col: -1 };
    this._cut = { row: null, col: null }; // normalised cut height per axis
    this._clusters = { row: null, col: null };
    this._highlightRows = [];
    this._marks = { rows: [], cols: [] }; // highlightGenes()
    this._clusterLabels = { row: {}, col: {} }; // setClusterLabels()
    this._annotations = { rows: [], columns: [] }; // as given to setAnnotations()
    this._tracks = { rows: [], cols: [] }; // resolved against the matrix
    this._pointers = new Map(); // touch points, for pinch zoom
    this._pinch = null;
    this._boxZoom = null; // rectangle being drawn with Shift-drag
    this._exporting = false;
    this._raf = 0;
    this._viewportHint = null;
    this._listeners = [];

    // The slice of the Kinetic stage API that the export code relies on.
    this.stage = {
      getContent: () => {
        this._renderNow();
        return this._root;
      },
    };
    this.navigation_layer = {
      hide: () => {
        this._exporting = true;
      },
      show: () => {
        this._exporting = false;
      },
      draw: () => this._renderNow(),
    };
  }

  /* ---------------------------------------------------------------- data */

  read_data(json) {
    const source = json && json.data ? json : { data: json };
    this.data = source.data || { nodes: {}, feature_names: [] };
    this.column_dendrogram = source.column_dendrogram || null;
    this._metadata = source.metadata || null;
    this._columnMetadata = source.column_metadata || null;

    const nodes = this.data.nodes || {};
    const rowTree = buildTree(nodes, false);
    const featureNames = Array.isArray(this.data.feature_names) ? this.data.feature_names : [];
    const firstLeaf = nodes[rowTree.leafIds[0]];
    const nCols = featureNames.length || (firstLeaf?.features?.length ?? 0);

    this._rowTree = rowTree;
    this._nRows = rowTree.leafCount;
    this._nCols = nCols;
    this._rowLeafIds = rowTree.leafIds;
    this._rowObjects = rowTree.leafIds.map((id) => nodes[id]?.objects || [id]);
    this._rowLabels = this._rowObjects.map((objects) =>
      objects.length > 1 ? `${objects[0]} (+${objects.length - 1})` : String(objects[0])
    );
    this._featureNames = featureNames.length
      ? featureNames.map(String)
      : Array.from({ length: nCols }, (_, i) => String(i + 1));

    this.leaves_y_coordinates = {};
    this.objects2leaves = {};
    this._rowIndexByLeaf = new Map();
    rowTree.leafIds.forEach((id, index) => {
      this.leaves_y_coordinates[id] = index + 0.5;
      this._rowIndexByLeaf.set(id, index);
      this._rowObjects[index].forEach((object) => {
        this.objects2leaves[object] = id;
      });
    });

    let colTree = null;
    if (this.column_dendrogram?.nodes) {
      colTree = buildTree(this.column_dendrogram.nodes, true);
      if (colTree.leafCount !== nCols || colTree.nodeCount === 0) colTree = null;
    }
    this._colTree = colTree;

    this._rangeMode = "auto";
    this._buildValues();
    this._selected = { row: -1, col: -1 };
    this._cut = { row: null, col: null };
    this._clusters = { row: null, col: null };
    this._highlightRows = [];
    this._marks = { rows: [], cols: [] };
    this._clusterLabels = { row: {}, col: {} };
    this._hover = null;
    this._cam = null;
    this._labelMetrics = null;
  }

  /** Extremes and a sorted sample of the displayed values. */
  _computeStats() {
    const values = this._values;
    const step = Math.max(1, Math.floor(values.length / 200000));
    const sample = [];
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v > 1e38) continue;
      if (v < min) min = v;
      if (v > max) max = v;
      if (i % step === 0) sample.push(v);
    }
    this._histogram = null;
    this._stats = sample.length
      ? { min, max, sorted: Float64Array.from(sample).sort() }
      : { min: 0, max: 1, sorted: Float64Array.from([0, 1]) };
  }

  /**
   * The automatic colour range: 2nd to 98th percentile, so a few extreme
   * cells (the diagonal of a correlation matrix) do not flatten the rest.
   * With a diverging scale and data of both signs it is centred on zero.
   */
  _autoRange() {
    const { sorted, min: dataMin, max: dataMax } = this._stats;
    const quantile = (q) => sorted[Math.round(q * (sorted.length - 1))];
    let min = quantile(0.02);
    let max = quantile(0.98);
    if (!(min < max)) {
      min = dataMin;
      max = dataMax;
    }
    if (!(min < max)) max = min + 1;
    const scale = this.settings.heatmap_colors;
    if (DIVERGING.has(scale) && min < 0 && max > 0) {
      const extent = Math.max(-min, max);
      return { min: -extent, mid: 0, max: extent };
    }
    if (COLOR_SCALES[scale]?.middle) return { min, mid: clamp(quantile(0.5), min, max), max };
    return { min, mid: (min + max) / 2, max };
  }

  _applyAutoRange() {
    if (this._rangeMode === "auto") this._range = this._autoRange();
    this._lutDirty = true;
    this.events.range_onchange?.(this.getRangeInfo());
  }

  /** Data extremes, the automatic range and the range in use. */
  getRangeInfo() {
    const auto = this._autoRange();
    return {
      dataMin: this._stats.min,
      dataMax: this._stats.max,
      autoMin: auto.min,
      autoMax: auto.max,
      min: this._range.min,
      max: this._range.max,
      mode: this._rangeMode,
    };
  }

  /** Back to the automatic colour range (see _autoRange). */
  setAutoRange() {
    this._rangeMode = "auto";
    this._applyAutoRange();
    this._requestRender();
  }

  /** Shows each row as z-scores of its own values (true) or the values as given. */
  setRowScaling(enabled) {
    if (!!this.settings.row_scaling === !!enabled) return;
    this.settings.row_scaling = !!enabled;
    if (!this.data) return;
    this._buildValues();
    this._requestRender();
  }

  _columnOrder() {
    const order = this.settings.columns_order;
    const n = this._nCols;
    if (Array.isArray(order) && order.length === n) {
      const seen = new Uint8Array(n);
      const valid = order.every((v) => {
        if (!Number.isInteger(v) || v < 0 || v >= n || seen[v]) return false;
        seen[v] = 1;
        return true;
      });
      if (valid) return order;
    }
    return null;
  }

  /** Builds the display-order matrix: row r is leaf r, column p is feature order[p]. */
  _buildValues() {
    const nodes = this.data.nodes;
    const nRows = this._nRows;
    const nCols = this._nCols;
    const order = this._columnOrder();
    const values = new Float32Array(nRows * nCols);
    for (let r = 0; r < nRows; r++) {
      const features = nodes[this._rowLeafIds[r]]?.features || [];
      const offset = r * nCols;
      for (let p = 0; p < nCols; p++) {
        const v = features[order ? order[p] : p];
        values[offset + p] = typeof v === "number" && Number.isFinite(v) ? v : MISSING;
      }
    }
    this._rawValues = null;
    if (this.settings.row_scaling) {
      // Row z-scores; the values as given are kept for the tooltip.
      this._rawValues = values.slice();
      for (let r = 0; r < nRows; r++) {
        const offset = r * nCols;
        let count = 0;
        let sum = 0;
        let squares = 0;
        for (let p = 0; p < nCols; p++) {
          const v = values[offset + p];
          if (v > 1e38) continue;
          count += 1;
          sum += v;
          squares += v * v;
        }
        const mean = count ? sum / count : 0;
        const sd = count > 1 ? Math.sqrt(Math.max(0, (squares - count * mean * mean) / (count - 1))) : 0;
        for (let p = 0; p < nCols; p++) {
          const v = values[offset + p];
          if (v <= 1e38) values[offset + p] = sd > 0 ? (v - mean) / sd : 0;
        }
      }
    }
    this._values = values;
    this._colLabels = order ? order.map((i) => this._featureNames[i]) : this._featureNames;
    this._labelMetrics = null;
    this._dataDirty = true;
    this._computeStats();
    this._applyAutoRange();
    this._resolveTracks(); // the column order may have changed
  }

  /* ------------------------------------------------------------ settings */

  update_settings(settings) {
    Object.assign(this.settings, settings || {});
  }

  updateCellColors(scaleName) {
    this.settings.heatmap_colors = COLOR_SCALES[scaleName] ? scaleName : DEFAULT_SCALE;
    this._lut = buildLut(this.settings.heatmap_colors);
    if (this._stats && this._rangeMode === "manual") {
      this._setManualRange(this._range.min, this._range.max); // the middle depends on the scale
    } else if (this._stats) {
      this._applyAutoRange(); // so does the automatic range
    }
    this._lutDirty = true;
    this._requestRender();
  }

  /** Despite the name (kept for InCHlib compatibility) these are data values. */
  updateCellColorsPercentile({ minValue, maxValue } = {}) {
    const min = Number(minValue);
    const max = Number(maxValue);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return;
    this._setManualRange(min, max);
  }

  _setManualRange(min, max) {
    this._rangeMode = "manual";
    // A diverging scale keeps its neutral colour on zero.
    const zeroCentred = DIVERGING.has(this.settings.heatmap_colors) && min < 0 && max > 0;
    this._range = { min, mid: zeroCentred ? 0 : (min + max) / 2, max };
    this._lutDirty = true;
    if (this._stats) this.events.range_onchange?.(this.getRangeInfo());
    this._requestRender();
  }

  setRowIdsVisibility(visible) {
    this.settings.draw_row_ids = !!visible;
    this._relayout(false);
  }

  setColumnIdsVisibility(visible) {
    this.settings.heatmap_header = !!visible;
    this._relayout(false);
  }

  /** Keeps cells square: both axes share one cell size and zoom together. */
  setSquareCells(enabled) {
    this.settings.square_cells = !!enabled;
    this._relayout(false);
  }

  /** Zooms so that the given cluster of the cut fills the view along its axis. */
  zoomToCluster(axis, number) {
    const kind = axis === "row" ? "row" : "col";
    const cluster = this._clusters[kind]?.list[number - 1];
    if (!cluster || !this._cam) return false;
    const cam = this._cam;
    const view = this._viewRect();
    const cols = [cam.sx / cam.cw, (cam.sx + view.w) / cam.cw];
    const rows = [cam.sy / cam.ch, (cam.sy + view.h) / cam.ch];
    if (kind === "row") this._zoomToCells(cols[0], cols[1], cluster.lo, cluster.hi + 1);
    else this._zoomToCells(cluster.lo, cluster.hi + 1, rows[0], rows[1]);
    return true;
  }

  /** Shows the cell rectangle [c0, c1) x [r0, r1) as large as the view allows. */
  _zoomToCells(c0, c1, r0, r1) {
    const box = this._layoutBox;
    const cam = this._cam;
    if (!box || !cam || !(c1 > c0) || !(r1 > r0)) return;
    cam.cw = box.availW / (c1 - c0);
    cam.ch = box.availH / (r1 - r0);
    this._clampCamera(); // applies the limits (and square cells) to the sizes
    cam.sx = c0 * cam.cw;
    cam.sy = r0 * cam.ch;
    this._clampCamera();
    this._requestRender();
  }

  /** Multiplies the cell size, keeping the point (px, py) of the view in place. */
  _zoomBy(factor, px, py, zoomX = true, zoomY = true) {
    const cam = this._cam;
    const box = this._layoutBox;
    if (!cam || !box) return false;
    const before = { cw: cam.cw, ch: cam.ch };
    if (this.settings.square_cells) zoomX = zoomY = true;
    if (zoomX) {
      const next = clamp(cam.cw * factor, box.fitCw, Math.max(MAX_CELL, box.fitCw));
      cam.sx = ((cam.sx + px) * next) / cam.cw - px;
      cam.cw = next;
    }
    if (zoomY) {
      const next = clamp(cam.ch * factor, box.fitCh, Math.max(MAX_CELL, box.fitCh));
      cam.sy = ((cam.sy + py) * next) / cam.ch - py;
      cam.ch = next;
    }
    this._clampCamera();
    return cam.cw !== before.cw || cam.ch !== before.ch;
  }

  setCellValueVisibility(visible) {
    this.settings.show_cell_values = !!visible;
    this._requestRender();
  }

  setDendrogramVisibility(visible) {
    this.settings.dendrogram = !!visible;
    this._relayout(false);
  }

  setColumnDendrogramVisibility(visible) {
    this.settings.column_dendrogram = !!visible;
    this._relayout(false);
  }

  /** A value above 1 is a width limit in pixels, otherwise the heatmap's share of the width. */
  setDendrogramWidth(value) {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return;
    if (v > 1) this.settings.max_dendrogram_width = v;
    else this.settings.heatmap_part_width = v;
    this._relayout(false);
  }

  updateDendrogramLineWidth(width) {
    const w = Number(width);
    if (!Number.isFinite(w) || w <= 0) return;
    this.settings.dendrogram_line_width = w;
    this._requestRender();
  }

  highlight_rows(ids) {
    const list = Array.isArray(ids) ? ids : [];
    this.settings.highlighted_rows = list;
    const rows = new Set();
    list.forEach((id) => {
      const leaf = this.objects2leaves[id];
      if (leaf !== undefined && this._rowIndexByLeaf.has(leaf)) {
        rows.add(this._rowIndexByLeaf.get(leaf));
      }
    });
    this._highlightRows = Array.from(rows);
    this._requestRender();
  }

  /**
   * Marks the rows and columns of the given gene symbols (a guide suffix such
   * as "_2" is ignored). An empty list removes the marks.
   */
  highlightGenes(symbols) {
    const wanted = new Set((symbols || []).map((symbol) => String(symbol).split("_")[0].toUpperCase()));
    const matches = (name) => wanted.has(String(name).split("_")[0].toUpperCase());
    const rows = [];
    const cols = [];
    if (wanted.size) {
      (this._rowObjects || []).forEach((objects, r) => {
        if (objects.some(matches)) rows.push(r);
      });
      (this._colLabels || []).forEach((label, c) => {
        if (matches(label)) cols.push(c);
      });
    }
    this._marks = { rows, cols };
    this._requestRender();
  }

  /**
   * Annotation tracks: colour bars beside the rows and below the columns.
   *
   *   setAnnotations({ rows: [track, ...], columns: [track, ...] })
   *   track = { name, values }, values keyed by gene symbol (a guide suffix
   *   is ignored): true marks membership, a string is a category, a number
   *   is drawn on a light-to-dark scale.
   *
   * Row metadata and column metadata of the InCHlib format are shown the
   * same way without a call.
   */
  setAnnotations(annotations) {
    this._annotations = {
      rows: (annotations?.rows || []).filter((track) => track && track.values),
      columns: (annotations?.columns || []).filter((track) => track && track.values),
    };
    this._resolveTracks();
    if (this._layoutBox) this._relayout(false);
  }

  /** Maps every track onto the rows / columns in display order and picks its colours. */
  _resolveTracks() {
    const base = (name) => String(name).split("_")[0].toUpperCase();
    const build = (name, values) => {
      const present = values.filter((value) => value !== null && value !== undefined && value !== false && value !== "");
      if (!present.length) return null;
      let colors;
      if (present.every((value) => typeof value === "number")) {
        const min = Math.min(...present);
        const max = Math.max(...present);
        colors = values.map((value) => {
          if (typeof value !== "number") return null;
          const t = max > min ? (value - min) / (max - min) : 1;
          const shade = Math.round(225 - t * 190);
          return `rgb(${shade},${shade},${Math.min(255, shade + 20)})`;
        });
      } else if (present.every((value) => value === true)) {
        colors = values.map((value) => (value === true ? TRACK_COLORS[0] : TRACK_OFF));
      } else {
        const categories = Array.from(new Set(present.map(String)));
        colors = values.map((value) =>
          value === null || value === undefined || value === false || value === ""
            ? null
            : TRACK_COLORS[(categories.indexOf(String(value)) + 1) % TRACK_COLORS.length]
        );
      }
      return { name: String(name), values, colors };
    };
    const lookup = (values, keys) => {
      const map = new Map(Object.entries(values).map(([key, value]) => [base(key), value]));
      return keys.map((names) => {
        const hit = names.map(base).find((key) => map.has(key));
        return hit === undefined ? null : map.get(hit);
      });
    };
    const rows = [];
    const cols = [];
    if (!this.data) {
      this._tracks = { rows, cols };
      return;
    }
    // Metadata that came with the data (InCHlib format).
    const metadata = this._metadata;
    if (metadata?.nodes) {
      const names = metadata.feature_names || [];
      const count = Math.max(0, ...Object.values(metadata.nodes).map((list) => (Array.isArray(list) ? list.length : 0)));
      for (let i = 0; i < count; i++) {
        rows.push(build(names[i] || `Metadata ${i + 1}`, this._rowLeafIds.map((id) => metadata.nodes[id]?.[i] ?? null)));
      }
    }
    const columnMetadata = this._columnMetadata;
    if (Array.isArray(columnMetadata?.features)) {
      const order = this._columnOrder();
      columnMetadata.features.forEach((list, i) => {
        const inOrder = Array.from({ length: this._nCols }, (_, p) => list?.[order ? order[p] : p] ?? null);
        cols.push(build(columnMetadata.feature_names?.[i] || `Metadata ${i + 1}`, inOrder));
      });
    }
    this._annotations.rows.forEach((track) => rows.push(build(track.name, lookup(track.values, this._rowObjects))));
    this._annotations.columns.forEach((track) =>
      cols.push(build(track.name, lookup(track.values, this._colLabels.map((label) => [label]))))
    );
    this._tracks = { rows: rows.filter(Boolean), cols: cols.filter(Boolean) };
  }

  /** Identifies the matrix a saved view belongs to. */
  _signature() {
    const rows = this._rowLabels || [];
    const cols = this._colLabels || [];
    return `${rows.length}x${cols.length}:${rows[0]}:${rows[rows.length - 1]}:${cols[0]}`;
  }

  /**
   * The view as numbers that survive a resize: zoom relative to "everything
   * in view", the centre as a fraction of the matrix, and the cut heights.
   */
  getViewState() {
    const cam = this._cam;
    const box = this._layoutBox;
    if (!cam || !box) return null;
    const view = this._viewRect();
    const round = (value) => Math.round(value * 1e4) / 1e4;
    return {
      signature: this._signature(),
      zoomX: round(cam.cw / box.fitCw),
      zoomY: round(cam.ch / box.fitCh),
      centerX: round((cam.sx + view.w / 2) / (this._nCols * cam.cw)),
      centerY: round((cam.sy + view.h / 2) / (this._nRows * cam.ch)),
      rowCut: this._cut.row === null ? null : round(this._cut.row),
      colCut: this._cut.col === null ? null : round(this._cut.col),
    };
  }

  /** Restores a view from getViewState(); ignored when it belongs to another matrix. */
  setViewState(state) {
    const cam = this._cam;
    const box = this._layoutBox;
    if (!state || !cam || !box || state.signature !== this._signature()) return false;
    if ((state.rowCut ?? null) !== this._cut.row) this._setCut("row", state.rowCut ?? null, true);
    if ((state.colCut ?? null) !== this._cut.col) this._setCut("col", state.colCut ?? null, true);
    // Kept until the user moves the view: the layout may still settle (the
    // page around the heatmap changes size), and the view is relative to it.
    this._restoredView = state;
    this._applyCamera(state);
    return true;
  }

  _applyCamera(state) {
    const cam = this._cam;
    const box = this._layoutBox;
    cam.cw = box.fitCw * (Number(state.zoomX) || 1);
    cam.ch = box.fitCh * (Number(state.zoomY) || 1);
    this._clampCamera();
    cam.sx = (Number(state.centerX) || 0) * this._nCols * cam.cw - box.availW / 2;
    cam.sy = (Number(state.centerY) || 0) * this._nRows * cam.ch - box.availH / 2;
    this._clampCamera();
    this._requestRender();
  }

  /**
   * Runs `draw` with the whole matrix laid out at `cell` px per cell (smaller
   * when that would exceed the canvas limit), then restores the view.
   */
  _withExportLayout(cell, scale, draw) {
    const saved = { box: this._layoutBox, cam: this._cam, dpr: this._dpr, exporting: this._exporting };
    if (!saved.box || !saved.cam) return null;
    const limit = 8192 / scale;
    const fixedW = saved.box.hmX + saved.box.trackW + saved.box.rowLabelW + PAD;
    const fixedH = saved.box.hmY + saved.box.trackH + saved.box.colLabelH + PAD;
    let cw = Math.max(Math.min(cell, (limit - fixedW) / Math.max(this._nCols, 1)), 0.25);
    let ch = Math.max(Math.min(cell, (limit - fixedH) / Math.max(this._nRows, 1)), 0.25);
    if (this.settings.square_cells) cw = ch = Math.min(cw, ch);
    const availW = this._nCols * cw;
    const availH = this._nRows * ch;
    this._layoutBox = {
      ...saved.box,
      availW, availH, fitCw: cw, fitCh: ch,
      width: Math.ceil(fixedW + availW),
      height: Math.ceil(fixedH + availH),
    };
    this._cam = { cw, ch, sx: 0, sy: 0 };
    this._dpr = scale;
    this._exporting = true;
    try {
      return draw();
    } finally {
      this._layoutBox = saved.box;
      this._cam = saved.cam;
      this._dpr = saved.dpr;
      this._exporting = saved.exporting;
    }
  }

  /**
   * The whole heatmap (not only the part on screen) as a canvas, `scale`
   * device pixels per unit, with labels where the cells are large enough.
   */
  exportCanvas({ cell = 14, scale = 2, background = "#ffffff" } = {}) {
    if (!this._root) return null;
    const sizes = [this._base, this._overlay].map((canvas) => [canvas.width, canvas.height]);
    const out = this._withExportLayout(cell, scale, () => {
      const box = this._layoutBox;
      [this._base, this._overlay].forEach((canvas) => {
        canvas.width = Math.round(box.width * scale);
        canvas.height = Math.round(box.height * scale);
      });
      this._render();
      const copy = document.createElement("canvas");
      copy.width = this._base.width;
      copy.height = this._base.height;
      const ctx = copy.getContext("2d");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, copy.width, copy.height);
      ctx.drawImage(this._base, 0, 0);
      ctx.drawImage(this._overlay, 0, 0);
      return copy;
    });
    // Back to the view on screen.
    [this._base, this._overlay].forEach((canvas, i) => {
      canvas.width = sizes[i][0];
      canvas.height = sizes[i][1];
    });
    this._renderNow();
    return out;
  }

  /**
   * The whole heatmap as an SVG document: dendrograms, labels, tracks and
   * legend as vectors, the matrix as an embedded image of one pixel per cell.
   */
  exportSvg({ cell = 14 } = {}) {
    if (!this._root) return null;
    return this._withExportLayout(cell, 1, () => {
      const box = this._layoutBox;
      const cam = this._cam;
      const view = this._viewRect();
      const n = (value) => Math.round(value * 100) / 100;
      const escape = (text) =>
        String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
      const parts = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" font-family="Helvetica, Arial, sans-serif">`,
        `<rect width="100%" height="100%" fill="#ffffff"/>`,
      ];

      // Matrix: one pixel per cell, scaled without smoothing.
      const image = document.createElement("canvas");
      image.width = this._nCols;
      image.height = this._nRows;
      const imageCtx = image.getContext("2d");
      const pixels = imageCtx.createImageData(this._nCols, this._nRows);
      for (let i = 0; i < this._values.length; i++) {
        const color = this._colorOf(this._values[i]);
        pixels.data[i * 4] = color[0];
        pixels.data[i * 4 + 1] = color[1];
        pixels.data[i * 4 + 2] = color[2];
        pixels.data[i * 4 + 3] = 255;
      }
      imageCtx.putImageData(pixels, 0, 0);
      parts.push(
        `<image x="${n(view.x)}" y="${n(view.y)}" width="${n(view.w)}" height="${n(view.h)}" preserveAspectRatio="none" image-rendering="pixelated" style="image-rendering:pixelated" xlink:href="${image.toDataURL("image/png")}"/>`
      );

      // Dendrograms, coloured by cluster where a cut is set.
      [["row", box.dendW], ["col", box.colDendH]].forEach(([kind, shown]) => {
        const tree = this._tree(kind);
        if (!shown || !tree || !tree.nodeCount) return;
        const frame = this._treeFrame(kind);
        const clusters = this._clusters[kind];
        const paths = new Map();
        for (let i = 0; i < tree.nodeCount; i++) {
          let color = "#5a6470";
          if (clusters) {
            const cluster = clusters.list[clusters.leafCluster[tree.lo[i]]];
            if (cluster.color >= 0 && tree.hi[i] <= cluster.hi) color = CLUSTER_COLORS[cluster.color % CLUSTER_COLORS.length];
          }
          const a = frame.along(tree.aPos[i]);
          const b = frame.along(tree.bPos[i]);
          const h = frame.across(tree.h[i]);
          const points = [
            frame.point(a, frame.across(tree.aH[i])),
            frame.point(a, h),
            frame.point(b, h),
            frame.point(b, frame.across(tree.bH[i])),
          ];
          const d = points.map((p, k) => `${k ? "L" : "M"}${n(p[0])} ${n(p[1])}`).join("");
          paths.set(color, (paths.get(color) || "") + d);
        }
        paths.forEach((d, color) => {
          parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${Number(this.settings.dendrogram_line_width) || 1}"/>`);
        });
      });

      // Cluster strips and boundaries.
      const rowClusters = box.dendW ? this._clusters.row : null;
      const colClusters = box.colDendH ? this._clusters.col : null;
      (rowClusters?.list || []).forEach((cluster) => {
        const y0 = view.y + cluster.lo * cam.ch;
        if (cluster.color >= 0) {
          parts.push(`<rect x="${n(view.x - GAP)}" y="${n(y0)}" width="${GAP - 1}" height="${n((cluster.hi - cluster.lo + 1) * cam.ch)}" fill="${CLUSTER_COLORS[cluster.color % CLUSTER_COLORS.length]}"/>`);
        }
        if (cluster.lo > 0) parts.push(`<line x1="${n(view.x)}" y1="${n(y0)}" x2="${n(view.x + view.w)}" y2="${n(y0)}" stroke="#000" stroke-opacity="0.8"/>`);
      });
      (colClusters?.list || []).forEach((cluster) => {
        const x0 = view.x + cluster.lo * cam.cw;
        if (cluster.color >= 0) {
          parts.push(`<rect x="${n(x0)}" y="${n(view.y - GAP)}" width="${n((cluster.hi - cluster.lo + 1) * cam.cw)}" height="${GAP - 1}" fill="${CLUSTER_COLORS[cluster.color % CLUSTER_COLORS.length]}"/>`);
        }
        if (cluster.lo > 0) parts.push(`<line x1="${n(x0)}" y1="${n(view.y)}" x2="${n(x0)}" y2="${n(view.y + view.h)}" stroke="#000" stroke-opacity="0.8"/>`);
      });

      // Annotation tracks.
      this._tracks.rows.forEach((track, t) => {
        track.colors.forEach((color, r) => {
          if (color) parts.push(`<rect x="${n(view.x + view.w + 6 + t * TRACK)}" y="${n(view.y + r * cam.ch)}" width="${TRACK - 1}" height="${n(cam.ch)}" fill="${color}"/>`);
        });
      });
      this._tracks.cols.forEach((track, t) => {
        track.colors.forEach((color, c) => {
          if (color) parts.push(`<rect x="${n(view.x + c * cam.cw)}" y="${n(view.y + view.h + 6 + t * TRACK)}" width="${n(cam.cw)}" height="${TRACK - 1}" fill="${color}"/>`);
        });
      });

      // Labels, where a cell is tall / wide enough for text.
      if (this.settings.draw_row_ids && cam.ch >= 6) {
        const size = n(clamp(cam.ch * 0.8, 5, 12));
        const x = n(view.x + view.w + 6 + box.trackW);
        this._rowLabels.forEach((label, r) => {
          parts.push(`<text x="${x}" y="${n(view.y + (r + 0.5) * cam.ch)}" font-size="${size}" dominant-baseline="central" fill="#222">${escape(label)}</text>`);
        });
      }
      if (this.settings.heatmap_header && cam.cw >= 6) {
        const size = n(clamp(cam.cw * 0.8, 5, 12));
        const y = n(view.y + view.h + 6 + box.trackH);
        this._colLabels.forEach((label, c) => {
          const x = n(view.x + (c + 0.5) * cam.cw);
          parts.push(`<text transform="translate(${x} ${y}) rotate(-90)" text-anchor="end" font-size="${size}" dominant-baseline="central" fill="#222">${escape(label)}</text>`);
        });
      }

      // Legend.
      const range = this._range;
      const stops = Array.from({ length: 13 }, (_, i) => {
        const value = range.min + (i / 12) * (range.max - range.min);
        return `<stop offset="${n(i / 12)}" stop-color="${rgb(this._colorOf(value))}"/>`;
      }).join("");
      parts.push(
        `<defs><linearGradient id="heatmap-scale">${stops}</linearGradient></defs>`,
        `<rect x="${PAD}" y="${PAD + 4}" width="160" height="12" fill="url(#heatmap-scale)" stroke="#000" stroke-opacity="0.25"/>`,
        `<text x="${PAD}" y="${PAD + 28}" font-size="11" fill="#333">${escape(formatValue(range.min))}</text>`,
        `<text x="${PAD + 160}" y="${PAD + 28}" font-size="11" text-anchor="end" fill="#333">${escape(formatValue(range.max))}</text>`
      );
      parts.push("</svg>");
      return parts.join("\n");
    });
  }

  /** Row and column labels in display order. */
  getLabels() {
    return { rows: (this._rowLabels || []).slice(), columns: (this._colLabels || []).slice() };
  }

  /**
   * Finds a gene by symbol (exact, else by prefix; a guide suffix is
   * ignored), marks its rows and columns and brings the first one to the
   * middle of the view, zooming in far enough to read its label. An empty
   * query removes the marks. Returns the number of rows and columns found.
   */
  focusGene(query) {
    const wanted = String(query || "").trim().toUpperCase();
    const base = (name) => String(name).split("_")[0].toUpperCase();
    const search = (test) => {
      const rows = [];
      const cols = [];
      (this._rowObjects || []).forEach((objects, r) => {
        if (objects.some((object) => test(base(object)))) rows.push(r);
      });
      (this._colLabels || []).forEach((label, c) => {
        if (test(base(label))) cols.push(c);
      });
      return { rows, cols };
    };
    let found = { rows: [], cols: [] };
    if (wanted) {
      found = search((name) => name === wanted);
      if (!found.rows.length && !found.cols.length) found = search((name) => name.startsWith(wanted));
    }
    this._marks = found;
    if (wanted) this._restoredView = null;
    const cam = this._cam;
    const box = this._layoutBox;
    if (cam && box && (found.rows.length || found.cols.length)) {
      const readable = 12;
      if (found.rows.length) cam.ch = Math.max(cam.ch, readable);
      if (found.cols.length) cam.cw = Math.max(cam.cw, readable);
      if (this.settings.square_cells) cam.cw = cam.ch = Math.max(cam.cw, cam.ch);
      this._clampCamera();
      if (found.rows.length) cam.sy = (found.rows[0] + 0.5) * cam.ch - box.availH / 2;
      if (found.cols.length) cam.sx = (found.cols[0] + 0.5) * cam.cw - box.availW / 2;
      this._clampCamera();
    }
    this._requestRender();
    return { rows: found.rows.length, columns: found.cols.length };
  }

  unhighlight_cluster() {
    this._selected = { row: -1, col: -1 };
    this._requestRender();
  }

  /* ------------------------------------------------------------- clusters */

  _tree(kind) {
    return kind === "row" ? this._rowTree : this._colTree;
  }

  _setCut(kind, height, notify) {
    const tree = this._tree(kind);
    const active = !!tree && tree.nodeCount > 0 && height !== null && height < 1;
    this._cut[kind] = active ? Math.max(height, 0.005) : null;
    this._clusters[kind] = active ? cutTree(tree, this._cut[kind]) : null;
    this._clusterLabels[kind] = {}; // labels belong to the previous clusters
    this._requestRender();
    if (notify) this.events.clusters_onchange?.(this.getClusters());
  }

  /**
   * The clusters defined by the cut lines, in display order. `items` are row
   * objects (genes) for rows and column labels for columns.
   */
  getClusters() {
    const describe = (kind, itemsOf) =>
      (this._clusters[kind]?.list || []).map((cluster, index) => {
        const items = [];
        for (let i = cluster.lo; i <= cluster.hi; i++) items.push(...itemsOf(i));
        return { cluster: index + 1, size: items.length, first: cluster.lo, last: cluster.hi, items };
      });
    return {
      rows: describe("row", (r) => this._rowObjects[r]),
      columns: describe("col", (c) => [this._colLabels[c]]),
    };
  }

  /** Splits an axis ("row" or "column") into `count` clusters, or as close as the tree allows. */
  setClusterCount(axis, count) {
    const kind = axis === "row" ? "row" : "col";
    const tree = this._tree(kind);
    if (!tree || !tree.nodeCount || !(count > 1)) {
      this._setCut(kind, null, true);
      return;
    }
    // Cut halfway between the (k-1)-th and k-th highest merges.
    const heights = Array.from(tree.h).sort((a, b) => b - a);
    const k = Math.min(Math.round(count), heights.length + 1);
    const upper = heights[k - 2];
    const lower = k - 1 < heights.length ? heights[k - 1] : 0;
    this._setCut(kind, lower < upper ? (lower + upper) / 2 : upper * 0.999, true);
  }

  /**
   * Short texts drawn on the clusters of a cut, keyed by cluster number as in
   * getClusters(): { rows: { 1: "Ribosome" }, columns: { 2: "Proteasome" } }.
   */
  setClusterLabels(labels) {
    this._clusterLabels = { row: { ...(labels?.rows || {}) }, col: { ...(labels?.columns || {}) } };
    this._requestRender();
  }

  /** Selects a cluster of the cut as if its colour strip had been clicked. */
  selectCluster(axis, number) {
    const kind = axis === "row" ? "row" : "col";
    const cluster = this._clusters[kind]?.list[number - 1];
    if (!cluster || cluster.node < 0) return false;
    this._selectNode(kind, cluster.node, null);
    this._requestRender();
    return true;
  }

  _selectNode(kind, node, event) {
    const tree = this._tree(kind);
    if (kind === "row") {
      this._selected = { row: node, col: -1 };
      const objects = [];
      for (let r = tree.lo[node]; r <= tree.hi[node]; r++) objects.push(...this._rowObjects[r]);
      this.events.dendrogram_node_onclick?.(objects, tree.ids[node], event);
    } else {
      this._selected = { row: -1, col: node };
      const positions = [];
      for (let c = tree.lo[node]; c <= tree.hi[node]; c++) positions.push(c);
      this.events.column_dendrogram_node_onclick?.(positions, tree.ids[node], event);
    }
  }

  clearClusterCut() {
    this._cut = { row: null, col: null };
    this._clusters = { row: null, col: null };
    this._clusterLabels = { row: {}, col: {} };
    this._requestRender();
    this.events.clusters_onchange?.(this.getClusters());
  }

  /* --------------------------------------------------------------- drawing */

  draw() {
    if (!this.data) return;
    this._ensureDom();
    if (!this._root) return;
    this._relayout(true);
    this._renderNow();
  }

  redraw() {
    if (!this.data) return;
    this._buildValues();
    this._ensureDom();
    this._relayout(false);
    this._renderNow();
  }

  redraw_heatmap() {
    this.redraw();
  }

  request_viewport_update() {
    this._requestRender();
  }

  resetCamera() {
    this._restoredView = null;
    if (!this._layoutBox) return;
    const { fitCw, fitCh } = this._layoutBox;
    this._cam = { cw: fitCw, ch: fitCh, sx: 0, sy: 0 };
    this._requestRender();
  }

  /**
   * Re-fits the canvas to its container (called by the host on every resize).
   * The zoom is kept: a side panel opening must not throw the user back to
   * the overview. resetCamera() is the explicit "show everything".
   */
  fitToScreen(width, height) {
    if (Number.isFinite(width) && Number.isFinite(height)) {
      this._viewportHint = { width, height };
    }
    this._relayout(false);
  }

  cleanup() {
    this._teardownDom();
    this._values = null;
    this._rowTree = null;
    this._colTree = null;
    this._layoutBox = null;
  }

  _teardownDom() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._listeners.forEach(([target, type, handler, options]) =>
      target.removeEventListener(type, handler, options)
    );
    this._listeners = [];
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._gl) {
      this._gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    if (this._root?.parentNode) this._root.parentNode.removeChild(this._root);
    this._root = null;
    this._base = null;
    this._overlay = null;
    this._ctx = null;
    this._gl = null;
    this._glState = null;
    this._image = null;
    this._tooltip = null;
    this._drag = null;
  }

  destroy() {
    this.cleanup();
  }

  /* ------------------------------------------------------------------ DOM */

  _target() {
    const target = this.settings.target;
    return typeof target === "string" ? document.getElementById(target) : target;
  }

  _listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._listeners.push([target, type, handler, options]);
  }

  _ensureDom() {
    const target = this._target();
    if (!target) return;

    const probe = document.createElement("canvas").getContext("webgl2");
    const maxSize = probe ? probe.getParameter(probe.MAX_TEXTURE_SIZE) : 0;
    probe?.getExtension("WEBGL_lose_context")?.loseContext();
    const mode = probe && this._nRows <= maxSize && this._nCols <= maxSize ? "gl" : "2d";
    if (this._root && this._root.parentNode === target && this._mode === mode) return;
    if (this._root) this._teardownDom();

    const root = document.createElement("div");
    root.style.cssText =
      "position:relative;width:100%;overflow:hidden;touch-action:none;user-select:none;outline:none;";
    root.tabIndex = 0; // keyboard: arrows pan, + / - zoom, 0 fits
    root.setAttribute("role", "application");
    root.setAttribute("aria-label", "Cluster heatmap. Arrow keys pan, plus and minus zoom, zero fits the view.");
    const makeCanvas = () => {
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;left:0;top:0;display:block;";
      root.appendChild(canvas);
      return canvas;
    };
    this._base = makeCanvas();
    this._overlay = makeCanvas();
    this._ctx = this._overlay.getContext("2d");

    const tooltip = document.createElement("div");
    tooltip.style.cssText =
      "position:absolute;display:none;pointer-events:none;white-space:pre;z-index:2;" +
      "background:rgba(33,37,41,0.92);color:#fff;font:12px/1.35 Helvetica,Arial,sans-serif;" +
      "padding:5px 8px;border-radius:4px;";
    root.appendChild(tooltip);
    this._tooltip = tooltip;

    this._mode = mode;
    this._gl = null;
    this._glState = null;
    this._image = null;
    if (mode === "gl") {
      this._gl = this._base.getContext("webgl2", { antialias: false, alpha: true });
      this._listen(this._base, "webglcontextlost", (e) => {
        e.preventDefault();
        this._glState = null;
      });
      this._listen(this._base, "webglcontextrestored", () => this._requestRender());
    } else {
      this._baseCtx = this._base.getContext("2d");
    }

    target.innerHTML = "";
    target.appendChild(root);
    this._root = root;
    // Lets the browser tests (and the console) reach the instance behind a heatmap.
    root.setAttribute("data-cluster-heatmap", "");
    root.__heatmap = this;
    this._dataDirty = true;
    this._lutDirty = true;

    this._listen(root, "pointerdown", (e) => this._onPointerDown(e));
    this._listen(root, "pointermove", (e) => this._onPointerMove(e));
    this._listen(root, "pointerup", (e) => this._onPointerUp(e));
    this._listen(root, "pointercancel", (e) => {
      this._pointers.delete(e.pointerId);
      this._pinch = null;
      this._drag = null;
      this._boxZoom = null;
    });
    this._listen(root, "keydown", (e) => this._onKeyDown(e));
    this._listen(root, "pointerleave", (e) => this._onPointerLeave(e));
    this._listen(root, "dblclick", (e) => {
      const region = this._regionAt(e);
      const kind = region.name === "rowTree" ? "row" : region.name === "colTree" ? "col" : null;
      // Double-click on a cut dendrogram removes the cut; elsewhere it fits the view.
      if (region.name === "legend") {
        // Double-click on the legend goes back to the automatic range.
        this.setAutoRange();
        this.events.range_onuserchange?.({ min: this._range.min, max: this._range.max, auto: true });
      } else if (kind && this._clusters[kind] && this._onStrip(kind, region)) {
        // Double-click on a cluster's colour strip zooms to that cluster.
        const leaf = this._treeFrame(kind).leafAt(region.x, region.y);
        const index = this._clusters[kind].leafCluster[leaf];
        if (index !== undefined) this.zoomToCluster(kind === "row" ? "row" : "column", index + 1);
      } else if (kind && this._cut[kind] !== null) {
        this._selected = { row: -1, col: -1 }; // undo the selection made by the first click
        this._setCut(kind, null, true);
      } else if (["heatmap", "rowTree", "colTree"].includes(region.name)) this.resetCamera();
    });
    this._listen(root, "wheel", (e) => this._onWheel(e), { passive: false });

    // Follow the container's width (a side panel opening, the sidebar collapsing).
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => {
        const width = target.clientWidth;
        if (this._layoutBox && width > 0 && Math.abs(width - this._layoutBox.width) > 1) {
          this._relayout(false);
        }
      });
      this._resizeObserver.observe(target);
    }
  }

  /* --------------------------------------------------------------- layout */

  _measureLabels() {
    if (this._labelMetrics) return this._labelMetrics;
    const ctx = this._ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `12px ${this.settings.font}`;
    const widest = (labels) => {
      // Measuring every label is wasteful; the longest strings decide the width.
      const longest = labels
        .slice()
        .sort((a, b) => b.length - a.length)
        .slice(0, 12);
      return longest.reduce((w, label) => Math.max(w, ctx.measureText(label).width), 0);
    };
    this._labelMetrics = {
      row: clamp(widest(this._rowLabels) + 14, 40, 170),
      col: clamp(widest(this._colLabels) + 12, 30, 150),
    };
    ctx.restore();
    return this._labelMetrics;
  }

  _relayout(resetCamera) {
    const target = this._target();
    if (!this._root || !target) return;
    // A view that shows everything keeps doing so when the layout changes;
    // a view the user zoomed keeps its zoom.
    const wasFit =
      !!this._cam &&
      !!this._layoutBox &&
      this._cam.cw === this._layoutBox.fitCw &&
      this._cam.ch === this._layoutBox.fitCh;

    const width = Math.max(target.clientWidth || this._viewportHint?.width || 0, 320);
    const metrics = this._measureLabels();
    const s = this.settings;

    const showRowTree = s.dendrogram && this._rowTree.nodeCount > 0;
    const showColTree = s.dendrogram && s.column_dendrogram && !!this._colTree;
    const share = clamp(1 - (Number(s.heatmap_part_width) || 0.9), 0.02, 0.5);
    const dendW = showRowTree
      ? clamp(width * share, 70, Math.max(70, Number(s.max_dendrogram_width) || 200))
      : 0;
    const rowLabelW = s.draw_row_ids ? metrics.row : 10;
    const colLabelH = s.heatmap_header ? metrics.col : 6;

    // Height budget: what is visible below the top of the heatmap.
    const top = Math.max(target.getBoundingClientRect().top, 0);
    let budget = window.innerHeight - top - 12;
    if (budget < 360) budget = Math.max(360, window.innerHeight * 0.8);
    if (this._viewportHint?.height) budget = Math.min(budget, Math.max(360, this._viewportHint.height));
    const colDendH = showColTree
      ? clamp(budget * 0.16, 50, Number(s.max_dendrogram_height) || 110)
      : 0;

    const hmX = PAD + dendW + (dendW ? GAP : 0);
    const hmY = PAD + LEGEND_H + colDendH + (colDendH ? GAP : 0);
    const trackW = this._tracks.rows.length ? this._tracks.rows.length * TRACK + 3 : 0;
    const trackH = this._tracks.cols.length ? this._tracks.cols.length * TRACK + 3 : 0;
    const availW = Math.max(60, width - hmX - trackW - rowLabelW - PAD);
    const maxRowH = Number(s.max_row_height) || 20;
    const maxColW = Number(s.max_column_width) || 20;
    const availH = clamp(this._nRows * maxRowH, 120, Math.max(120, budget - hmY - trackH - colLabelH - PAD));
    const height = Math.ceil(hmY + availH + trackH + colLabelH + PAD);

    let fitCw = this._nCols ? Math.min(maxColW, availW / this._nCols) : maxColW;
    let fitCh = this._nRows ? Math.min(maxRowH, availH / this._nRows) : maxRowH;
    if (s.square_cells) fitCw = fitCh = Math.min(fitCw, fitCh);
    this._layoutBox = {
      width, height, dendW, colDendH, rowLabelW, colLabelH, trackW, trackH,
      hmX, hmY, availW, availH, fitCw, fitCh,
      dendX: PAD, colDendY: PAD + LEGEND_H,
    };

    const dpr = window.devicePixelRatio || 1;
    this._dpr = dpr;
    [this._base, this._overlay].forEach((canvas) => {
      const w = Math.round(width * dpr);
      const h = Math.round(height * dpr);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    });
    this._root.style.height = `${height}px`;
    target.style.height = `${height}px`;
    this.settings.height = height;
    this.settings.width = width;

    if (resetCamera || !this._cam || wasFit) this._cam = { cw: fitCw, ch: fitCh, sx: 0, sy: 0 };
    this._clampCamera();
    if (this._restoredView && !resetCamera) this._applyCamera(this._restoredView);
    this._requestRender();
  }

  _clampCamera() {
    const cam = this._cam;
    const box = this._layoutBox;
    if (!cam || !box) return;
    if (this.settings.square_cells) cam.cw = cam.ch = Math.min(cam.cw, cam.ch);
    cam.cw = clamp(cam.cw, box.fitCw, Math.max(MAX_CELL, box.fitCw));
    cam.ch = clamp(cam.ch, box.fitCh, Math.max(MAX_CELL, box.fitCh));
    cam.sx = clamp(cam.sx, 0, Math.max(0, this._nCols * cam.cw - box.availW));
    cam.sy = clamp(cam.sy, 0, Math.max(0, this._nRows * cam.ch - box.availH));
  }

  /** Visible part of the heatmap in CSS px. */
  _viewRect() {
    const box = this._layoutBox;
    const cam = this._cam;
    return {
      x: box.hmX,
      y: box.hmY,
      w: Math.min(box.availW, this._nCols * cam.cw - cam.sx),
      h: Math.min(box.availH, this._nRows * cam.ch - cam.sy),
    };
  }

  /* --------------------------------------------------------------- render */

  _requestRender() {
    if (this._raf || !this._root) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._render();
    });
  }

  _renderNow() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._render();
  }

  _render() {
    if (!this._root || !this._layoutBox || !this._cam || !this._values) return;
    if (this._mode === "gl") this._drawMatrixGl();
    else this._drawMatrix2d();
    this._drawOverlay();
    this._dataDirty = false;
    this._lutDirty = false;
    if (this._exporting) return;
    // Tell the host when the view changed (it stores it for shared links).
    const state = this.getViewState();
    const key = JSON.stringify(state);
    if (key !== this._viewKey) {
      this._viewKey = key;
      this.events.view_onchange?.(state);
    }
  }

  _initGl() {
    const gl = this._gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`ClusterHeatmap shader: ${gl.getShaderInfoLog(shader)}`);
      }
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`ClusterHeatmap program: ${gl.getProgramInfoLog(program)}`);
    }
    const uniforms = {};
    ["uData", "uLut", "uOrigin", "uOffset", "uCell", "uCount", "uRange", "uHasMiddle", "uMissing"].forEach(
      (name) => {
        uniforms[name] = gl.getUniformLocation(program, name);
      }
    );
    const makeTexture = (filter) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };
    this._glState = {
      program,
      uniforms,
      vao: gl.createVertexArray(),
      data: makeTexture(gl.NEAREST),
      lut: makeTexture(gl.LINEAR),
    };
    this._dataDirty = true;
    this._lutDirty = true;
  }

  _drawMatrixGl() {
    const gl = this._gl;
    if (!gl || gl.isContextLost()) return;
    if (!this._glState) this._initGl();
    const state = this._glState;
    const dpr = this._dpr;
    const cam = this._cam;
    const view = this._viewRect();

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (this._dataDirty) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, state.data);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.R32F, Math.max(1, this._nCols), Math.max(1, this._nRows), 0,
        gl.RED, gl.FLOAT, this._values.length ? this._values : new Float32Array(1)
      );
    }
    if (this._lutDirty) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, state.lut);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LUT_SIZE, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, this._lut);
    }

    const canvasH = this._base.height;
    gl.viewport(0, 0, this._base.width, canvasH);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (view.w <= 0 || view.h <= 0) return;

    const x = Math.round(view.x * dpr);
    const yTop = Math.round(view.y * dpr);
    const w = Math.ceil(view.w * dpr);
    const h = Math.ceil(view.h * dpr);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x, canvasH - yTop - h, w, h);

    gl.useProgram(state.program);
    gl.bindVertexArray(state.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state.data);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, state.lut);
    const u = state.uniforms;
    gl.uniform1i(u.uData, 0);
    gl.uniform1i(u.uLut, 1);
    gl.uniform2f(u.uOrigin, x, canvasH - yTop);
    gl.uniform2f(u.uOffset, cam.sx * dpr, cam.sy * dpr);
    gl.uniform2f(u.uCell, cam.cw * dpr, cam.ch * dpr);
    gl.uniform2f(u.uCount, this._nCols, this._nRows);
    gl.uniform3f(u.uRange, this._range.min, this._range.mid, this._range.max);
    gl.uniform1f(u.uHasMiddle, COLOR_SCALES[this.settings.heatmap_colors]?.middle ? 1 : 0);
    gl.uniform3f(u.uMissing, MISSING_RGB[0] / 255, MISSING_RGB[1] / 255, MISSING_RGB[2] / 255);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Position of a value on the colour scale, 0..1 (mirrors the shader). */
  _scalePosition(v) {
    const { min, mid, max } = this._range;
    let t;
    if (COLOR_SCALES[this.settings.heatmap_colors]?.middle) {
      t = v < mid
        ? (0.5 * (v - min)) / Math.max(mid - min, 1e-12)
        : 0.5 + (0.5 * (v - mid)) / Math.max(max - mid, 1e-12);
    } else {
      t = (v - min) / Math.max(max - min, 1e-12);
    }
    return clamp(t, 0, 1);
  }

  _colorOf(v) {
    if (v > 1e38) return MISSING_RGB;
    const i = Math.round(this._scalePosition(v) * (LUT_SIZE - 1)) * 4;
    return [this._lut[i], this._lut[i + 1], this._lut[i + 2]];
  }

  _drawMatrix2d() {
    const ctx = this._baseCtx;
    const dpr = this._dpr;
    const cam = this._cam;
    const view = this._viewRect();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this._base.width, this._base.height);
    if (!this._nRows || !this._nCols || view.w <= 0 || view.h <= 0) return;

    if (!this._image || this._dataDirty || this._lutDirty) {
      const image = this._image || document.createElement("canvas");
      image.width = this._nCols;
      image.height = this._nRows;
      const imageCtx = image.getContext("2d");
      const pixels = imageCtx.createImageData(this._nCols, this._nRows);
      const values = this._values;
      for (let i = 0; i < values.length; i++) {
        const rgb = this._colorOf(values[i]);
        pixels.data[i * 4] = rgb[0];
        pixels.data[i * 4 + 1] = rgb[1];
        pixels.data[i * 4 + 2] = rgb[2];
        pixels.data[i * 4 + 3] = 255;
      }
      imageCtx.putImageData(pixels, 0, 0);
      this._image = image;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Zoomed out, let the browser blend the cells that share a pixel.
    ctx.imageSmoothingEnabled = cam.cw * dpr < 1 || cam.ch * dpr < 1;
    ctx.drawImage(
      this._image,
      cam.sx / cam.cw, cam.sy / cam.ch, view.w / cam.cw, view.h / cam.ch,
      view.x, view.y, view.w, view.h
    );
  }

  /* -------------------------------------------------------------- overlay */

  _drawOverlay() {
    const ctx = this._ctx;
    const box = this._layoutBox;
    const cam = this._cam;
    const view = this._viewRect();
    const dpr = this._dpr;
    const font = this.settings.font;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    this._drawLegend(ctx, box);

    if (box.dendW) {
      this._drawTree(ctx, this._rowTree, "row", this._hoverNode.row, this._selected.row);
    }
    if (box.colDendH) {
      this._drawTree(ctx, this._colTree, "col", this._hoverNode.col, this._selected.col);
    }
    if (view.w <= 0 || view.h <= 0) return;

    const firstRow = Math.max(0, Math.floor(cam.sy / cam.ch));
    const lastRow = Math.min(this._nRows - 1, Math.floor((cam.sy + view.h - 0.01) / cam.ch));
    const firstCol = Math.max(0, Math.floor(cam.sx / cam.cw));
    const lastCol = Math.min(this._nCols - 1, Math.floor((cam.sx + view.w - 0.01) / cam.cw));
    const rowY = (r) => view.y + r * cam.ch - cam.sy;
    const colX = (c) => view.x + c * cam.cw - cam.sx;

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    // Cell values, once cells are large enough to hold them.
    if (this.settings.show_cell_values && cam.cw >= 26 && cam.ch >= 12) {
      ctx.font = `${clamp(Math.min(cam.ch * 0.6, cam.cw * 0.34), 8, 12)}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let r = firstRow; r <= lastRow; r++) {
        for (let c = firstCol; c <= lastCol; c++) {
          const v = this._values[r * this._nCols + c];
          if (v > 1e38) continue;
          const rgb = this._colorOf(v);
          const luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
          ctx.fillStyle = luminance < 140 ? "#fff" : "#111";
          ctx.fillText(formatValue(v), colX(c) + cam.cw / 2, rowY(r) + cam.ch / 2);
        }
      }
    }

    // Boundaries between the clusters of a cut.
    const rowClusters = box.dendW ? this._clusters.row : null;
    const colClusters = box.colDendH ? this._clusters.col : null;
    if (rowClusters || colClusters) {
      ctx.beginPath();
      (rowClusters?.list || []).forEach((cluster) => {
        if (cluster.lo === 0 || cluster.lo < firstRow || cluster.lo > lastRow) return;
        const y = Math.round(rowY(cluster.lo)) + 0.5;
        ctx.moveTo(view.x, y);
        ctx.lineTo(view.x + view.w, y);
      });
      (colClusters?.list || []).forEach((cluster) => {
        if (cluster.lo === 0 || cluster.lo < firstCol || cluster.lo > lastCol) return;
        const x = Math.round(colX(cluster.lo)) + 0.5;
        ctx.moveTo(x, view.y);
        ctx.lineTo(x, view.y + view.h);
      });
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Labels of the clusters (setClusterLabels), where the band has room.
    const drawClusterLabel = (text, x, y, maxWidth) => {
      ctx.font = `bold 11px ${font}`;
      const width = Math.min(ctx.measureText(text).width, maxWidth);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillRect(x, y, width + 8, 15);
      ctx.fillStyle = "#111";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + 4, y + 8, maxWidth);
    };
    (rowClusters?.list || []).forEach((cluster, k) => {
      const text = this._clusterLabels.row[k + 1];
      if (!text) return;
      const y0 = Math.max(rowY(cluster.lo), view.y);
      const y1 = Math.min(rowY(cluster.hi + 1), view.y + view.h);
      // The bottom line belongs to the column labels when there are any.
      const reserved = colClusters && Object.keys(this._clusterLabels.col).length ? 21 : 0;
      if (y1 - y0 >= 19 && y0 + 17 <= view.y + view.h - reserved) {
        drawClusterLabel(text, view.x + 4, y0 + 2, view.w - 16);
      }
    });
    (colClusters?.list || []).forEach((cluster, k) => {
      const text = this._clusterLabels.col[k + 1];
      if (!text) return;
      const x0 = Math.max(colX(cluster.lo), view.x);
      const x1 = Math.min(colX(cluster.hi + 1), view.x + view.w);
      // Below the row labels' line so the two sets do not collide.
      if (x1 - x0 >= 60) drawClusterLabel(text, x0 + 4, view.y + view.h - 19, x1 - x0 - 16);
    });

    // Selected clusters: wash out everything outside the cluster.
    const wash = "rgba(255,255,255,0.55)";
    const selRow = this._selected.row;
    if (selRow >= 0 && this._rowTree) {
      const y0 = rowY(this._rowTree.lo[selRow]);
      const y1 = rowY(this._rowTree.hi[selRow] + 1);
      ctx.fillStyle = wash;
      ctx.fillRect(view.x, view.y, view.w, y0 - view.y);
      ctx.fillRect(view.x, y1, view.w, view.y + view.h - y1);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(view.x + 0.75, y0, view.w - 1.5, y1 - y0);
    }
    const selCol = this._selected.col;
    if (selCol >= 0 && this._colTree) {
      const x0 = colX(this._colTree.lo[selCol]);
      const x1 = colX(this._colTree.hi[selCol] + 1);
      ctx.fillStyle = wash;
      ctx.fillRect(view.x, view.y, x0 - view.x, view.h);
      ctx.fillRect(x1, view.y, view.x + view.w - x1, view.h);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0, view.y + 0.75, x1 - x0, view.h - 1.5);
    }

    // Rows highlighted through highlight_rows().
    if (this._highlightRows.length) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      this._highlightRows.forEach((r) => {
        if (r < firstRow || r > lastRow) return;
        ctx.strokeRect(view.x + 1, rowY(r), view.w - 2, Math.max(cam.ch, 2));
      });
    }

    if (this._boxZoom) {
      const { x0, y0, x1, y1 } = this._boxZoom;
      ctx.fillStyle = "rgba(17,17,17,0.12)";
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.min(x0, x1) + 0.5, Math.min(y0, y1) + 0.5, Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.setLineDash([]);
    }

    const hover = this._exporting ? null : this._hover;
    if (hover) {
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      ctx.fillRect(view.x, rowY(hover.row), view.w, Math.max(cam.ch, 1));
      ctx.fillRect(colX(hover.col), view.y, Math.max(cam.cw, 1), view.h);
      if (cam.cw >= 4 && cam.ch >= 4) {
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 1;
        ctx.strokeRect(colX(hover.col) + 0.5, rowY(hover.row) + 0.5, cam.cw - 1, cam.ch - 1);
      }
    }
    ctx.restore();

    // Genes marked by highlightGenes(): a bar in the gutter beside each row
    // and below each column, visible at any zoom.
    ctx.fillStyle = "#d7191c";
    this._marks.rows.forEach((r) => {
      if (r < firstRow || r > lastRow) return;
      ctx.fillRect(view.x + view.w + 1, rowY(r), 4, Math.max(cam.ch, 1.5));
    });
    this._marks.cols.forEach((c) => {
      if (c < firstCol || c > lastCol) return;
      ctx.fillRect(colX(c), view.y + view.h + 1, Math.max(cam.cw, 1.5), 4);
    });

    // Colour strip marking each cluster next to its dendrogram.
    (rowClusters?.list || []).forEach((cluster) => {
      if (cluster.color < 0 || cluster.hi < firstRow || cluster.lo > lastRow) return;
      const y0 = Math.max(rowY(cluster.lo), view.y);
      const y1 = Math.min(rowY(cluster.hi + 1), view.y + view.h);
      ctx.fillStyle = CLUSTER_COLORS[cluster.color % CLUSTER_COLORS.length];
      ctx.fillRect(view.x - GAP, y0, GAP - 1, y1 - y0);
    });
    (colClusters?.list || []).forEach((cluster) => {
      if (cluster.color < 0 || cluster.hi < firstCol || cluster.lo > lastCol) return;
      const x0 = Math.max(colX(cluster.lo), view.x);
      const x1 = Math.min(colX(cluster.hi + 1), view.x + view.w);
      ctx.fillStyle = CLUSTER_COLORS[cluster.color % CLUSTER_COLORS.length];
      ctx.fillRect(x0, view.y - GAP, x1 - x0, GAP - 1);
    });

    // Annotation tracks: beside the rows, below the columns.
    this._tracks.rows.forEach((track, t) => {
      const x = view.x + view.w + 6 + t * TRACK;
      for (let r = firstRow; r <= lastRow; r++) {
        if (!track.colors[r]) continue;
        const y0 = Math.max(rowY(r), view.y);
        const y1 = Math.min(rowY(r + 1), view.y + view.h);
        ctx.fillStyle = track.colors[r];
        ctx.fillRect(x, y0, TRACK - 1, Math.max(y1 - y0, 0.5));
      }
    });
    this._tracks.cols.forEach((track, t) => {
      const y = view.y + view.h + 6 + t * TRACK;
      for (let c = firstCol; c <= lastCol; c++) {
        if (!track.colors[c]) continue;
        const x0 = Math.max(colX(c), view.x);
        const x1 = Math.min(colX(c + 1), view.x + view.w);
        ctx.fillStyle = track.colors[c];
        ctx.fillRect(x0, y, Math.max(x1 - x0, 0.5), TRACK - 1);
      }
    });

    // Row labels: only the visible rows, only when they are legible.
    const markedRows = new Set(this._marks.rows);
    const markedCols = new Set(this._marks.cols);
    ctx.fillStyle = "#222";
    ctx.textBaseline = "middle";
    if (this.settings.draw_row_ids) {
      const x = view.x + view.w + 6 + box.trackW;
      ctx.textAlign = "left";
      if (cam.ch >= 8) {
        ctx.font = `${clamp(cam.ch * 0.8, 8, 12)}px ${font}`;
        for (let r = firstRow; r <= lastRow; r++) {
          const y = rowY(r) + cam.ch / 2;
          if (y < view.y - 1 || y > view.y + view.h + 1) continue;
          ctx.fillStyle = markedRows.has(r) ? "#d7191c" : "#222";
          ctx.fillText(this._rowLabels[r], x, y);
        }
        ctx.fillStyle = "#222";
      } else if (hover) {
        ctx.font = `bold 11px ${font}`;
        ctx.fillText(this._rowLabels[hover.row], x, clamp(rowY(hover.row) + cam.ch / 2, view.y + 6, view.y + view.h - 6));
      }
    }
    if (this.settings.heatmap_header) {
      const y = view.y + view.h + 6 + box.trackH;
      const drawColumn = (c, weight) => {
        const x = clamp(colX(c) + cam.cw / 2, view.x + 6, view.x + view.w - 6);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "right";
        ctx.font = `${weight}${clamp(cam.cw * 0.8, 8, 12)}px ${font}`;
        ctx.fillStyle = markedCols.has(c) ? "#d7191c" : "#222";
        ctx.fillText(this._colLabels[c], 0, 0);
        ctx.restore();
      };
      if (cam.cw >= 8) {
        for (let c = firstCol; c <= lastCol; c++) {
          const x = colX(c) + cam.cw / 2;
          if (x < view.x - 1 || x > view.x + view.w + 1) continue;
          drawColumn(c, "");
        }
      } else if (hover) {
        drawColumn(hover.col, "bold ");
      }
    }
    this._drawMinimap(ctx);
  }

  /**
   * Where the minimap goes: the empty corner below the row labels and right
   * of the column labels. Null when the whole matrix is in view or the corner
   * is too small.
   */
  _minimapRect() {
    const box = this._layoutBox;
    const cam = this._cam;
    if (!box || !cam || !this._nRows || !this._nCols) return null;
    const zoomed = this._nCols * cam.cw > box.availW + 1 || this._nRows * cam.ch > box.availH + 1;
    if (!zoomed) return null;
    const view = this._viewRect();
    const maxW = box.rowLabelW - 10;
    const maxH = box.colLabelH - 10;
    if (maxW < 30 || maxH < 30) return null;
    // Same proportions as the whole matrix at the current cell shape.
    const aspect = (this._nCols * cam.cw) / (this._nRows * cam.ch);
    const w = Math.min(maxW, maxH * aspect);
    const h = Math.min(maxH, maxW / aspect);
    if (w < 12 || h < 12) return null;
    return { x: view.x + box.availW + 6 + box.trackW, y: view.y + box.availH + 6 + box.trackH, w, h };
  }

  _drawMinimap(ctx) {
    const rect = this._exporting ? null : this._minimapRect();
    if (!rect) return;
    if (!this._thumbnail || this._dataDirty || this._lutDirty) {
      // A small picture of the whole matrix, one sampled cell per pixel.
      const size = 64;
      const thumb = this._thumbnail || document.createElement("canvas");
      thumb.width = Math.min(size, this._nCols);
      thumb.height = Math.min(size, this._nRows);
      const thumbCtx = thumb.getContext("2d");
      const pixels = thumbCtx.createImageData(thumb.width, thumb.height);
      for (let y = 0; y < thumb.height; y++) {
        const r = Math.floor(((y + 0.5) / thumb.height) * this._nRows);
        for (let x = 0; x < thumb.width; x++) {
          const c = Math.floor(((x + 0.5) / thumb.width) * this._nCols);
          const rgb = this._colorOf(this._values[r * this._nCols + c]);
          const i = (y * thumb.width + x) * 4;
          pixels.data[i] = rgb[0];
          pixels.data[i + 1] = rgb[1];
          pixels.data[i + 2] = rgb[2];
          pixels.data[i + 3] = 255;
        }
      }
      thumbCtx.putImageData(pixels, 0, 0);
      this._thumbnail = thumb;
    }
    const cam = this._cam;
    const view = this._viewRect();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this._thumbnail, rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x - 0.5, rect.y - 0.5, rect.w + 1, rect.h + 1);
    // The part of the matrix on screen.
    const fx = rect.w / (this._nCols * cam.cw);
    const fy = rect.h / (this._nRows * cam.ch);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      rect.x + cam.sx * fx,
      rect.y + cam.sy * fy,
      Math.max(view.w * fx, 2),
      Math.max(view.h * fy, 2)
    );
  }

  /** Centres the view on the point (x, y) of the minimap. */
  _panToMinimap(x, y) {
    const rect = this._minimapRect();
    if (!rect) return;
    const cam = this._cam;
    const box = this._layoutBox;
    cam.sx = (clamp(x - rect.x, 0, rect.w) / rect.w) * this._nCols * cam.cw - box.availW / 2;
    cam.sy = (clamp(y - rect.y, 0, rect.h) / rect.h) * this._nRows * cam.ch - box.availH / 2;
    this._clampCamera();
    this._requestRender();
  }

  /**
   * Geometry of the legend: an axis over the data's extent (symmetric around
   * zero when it has both signs) with the colour range marked on it.
   */
  _legendFrame() {
    const box = this._layoutBox;
    const range = this._range;
    let lo = Math.min(this._stats.min, range.min);
    let hi = Math.max(this._stats.max, range.max);
    if (lo < 0 && hi > 0) {
      hi = Math.max(-lo, hi);
      lo = -hi;
    }
    if (!(lo < hi)) hi = lo + 1;
    const x0 = PAD;
    const w = clamp(box.width - 2 * PAD - 160, 80, 220);
    return {
      x0, w, lo, hi,
      top: PAD, histH: 12, barY: PAD + 13, barH: 10,
      toX: (value) => x0 + ((value - lo) / (hi - lo)) * w,
      toValue: (x) => lo + (clamp(x - x0, 0, w) / w) * (hi - lo),
    };
  }

  /** "min" / "max" when (x, y) is on that end of the legend's colour range. */
  _legendHandleAt(x, y) {
    if (!this._stats || !this._layoutBox) return null;
    const frame = this._legendFrame();
    if (y < frame.top - 2 || y > frame.barY + frame.barH + 6) return null;
    const toMin = Math.abs(x - frame.toX(this._range.min));
    const toMax = Math.abs(x - frame.toX(this._range.max));
    if (Math.min(toMin, toMax) > 6) return null;
    return toMin <= toMax ? "min" : "max";
  }

  _drawLegend(ctx, box) {
    const frame = this._legendFrame();
    const range = this._range;
    const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
    const xMin = frame.toX(range.min);
    const xMax = frame.toX(range.max);

    // Histogram of the values (square-root heights, so the tails stay visible).
    const BINS = 44;
    const key = `${frame.lo}:${frame.hi}`;
    if (!this._histogram || this._histogram.key !== key) {
      const counts = new Float64Array(BINS);
      const sorted = this._stats.sorted;
      for (let i = 0; i < sorted.length; i++) {
        const bin = Math.floor(((sorted[i] - frame.lo) / (frame.hi - frame.lo)) * BINS);
        counts[clamp(bin, 0, BINS - 1)] += 1;
      }
      this._histogram = { key, counts, peak: Math.max(1, ...counts) };
    }
    ctx.fillStyle = "#aab2bd";
    const binW = frame.w / BINS;
    for (let i = 0; i < BINS; i++) {
      const h = frame.histH * Math.sqrt(this._histogram.counts[i] / this._histogram.peak);
      if (h > 0) ctx.fillRect(frame.x0 + i * binW, frame.top + frame.histH - h, Math.max(binW - 0.5, 0.5), h);
    }

    // Colour bar: flat below and above the range, the scale in between.
    const gradient = ctx.createLinearGradient(xMin, 0, Math.max(xMax, xMin + 0.01), 0);
    for (let stop = 0; stop <= 24; stop++) {
      const value = range.min + (stop / 24) * (range.max - range.min);
      gradient.addColorStop(stop / 24, rgb(this._colorOf(value)));
    }
    ctx.fillStyle = rgb(this._colorOf(range.min));
    ctx.fillRect(frame.x0, frame.barY, Math.max(xMin - frame.x0, 0), frame.barH);
    ctx.fillStyle = rgb(this._colorOf(range.max));
    ctx.fillRect(xMax, frame.barY, Math.max(frame.x0 + frame.w - xMax, 0), frame.barH);
    ctx.fillStyle = gradient;
    ctx.fillRect(xMin, frame.barY, Math.max(xMax - xMin, 0), frame.barH);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(frame.x0 + 0.5, frame.barY + 0.5, frame.w - 1, frame.barH - 1);

    // The two ends of the range, draggable.
    if (!this._exporting) {
      ctx.fillStyle = "#111";
      [xMin, xMax].forEach((x) => {
        ctx.fillRect(Math.round(x) - 1, frame.top, 2, frame.histH + frame.barH + 1);
        ctx.fillRect(Math.round(x) - 3, frame.barY + frame.barH, 6, 4);
      });
    }

    ctx.font = `11px ${this.settings.font}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#333";
    const y = frame.barY + frame.barH / 2;
    const rangeLabel =
      `${formatValue(range.min)} to ${formatValue(range.max)}` + (this._rangeMode === "auto" ? "  (auto)" : "");
    ctx.fillText(rangeLabel, frame.x0 + frame.w + 10, y);
    let used = frame.x0 + frame.w + 10 + ctx.measureText(rangeLabel).width;

    const counts = [];
    if (this._clusters.row) counts.push(`${this._clusters.row.list.length} row clusters`);
    if (this._clusters.col) counts.push(`${this._clusters.col.list.length} column clusters`);
    if (counts.length) {
      ctx.font = `bold 11px ${this.settings.font}`;
      const text = counts.join("  ·  ");
      ctx.fillText(text, used + 18, y);
      used += 18 + ctx.measureText(text).width;
      ctx.font = `11px ${this.settings.font}`;
    }
    if (!this._exporting) {
      const hints = [
        `${this._nRows} × ${this._nCols}`,
        "scroll or pinch: zoom",
        "drag: pan",
        "shift-drag: zoom to a box",
        "double-click: fit",
        "drag a dashed dendrogram line: cut into clusters",
        "drag the legend's ends: colour range",
      ];
      // Drop hints from the end until the line fits beside the legend.
      const separator = "   ·   ";
      while (hints.length && ctx.measureText(hints.join(separator)).width > box.width - PAD - used - 24) {
        hints.pop();
      }
      ctx.fillStyle = "#888";
      ctx.textAlign = "right";
      ctx.fillText(hints.join(separator), box.width - PAD, y);
    }
  }

  /** Maps tree coordinates (position along the leaves, height 0..1) to the screen. */
  _treeFrame(kind) {
    const box = this._layoutBox;
    const cam = this._cam;
    const view = this._viewRect();
    if (kind === "row") {
      const x0 = box.dendX + 2;
      const span = box.dendW - 3;
      return {
        rect: { x: box.dendX, y: view.y, w: box.dendW, h: view.h },
        along: (pos) => view.y + pos * cam.ch - cam.sy,
        across: (h) => x0 + span * (1 - h * TREE_SHARE),
        height: (x) => (1 - (x - x0) / span) / TREE_SHARE,
        leafAt: (x, y) => Math.floor((y - view.y + cam.sy) / cam.ch),
        first: Math.floor(cam.sy / cam.ch),
        last: Math.floor((cam.sy + view.h) / cam.ch),
        point: (along, across) => [across, along],
        coord: (x) => x,
      };
    }
    const y0 = box.colDendY + 2;
    const span = box.colDendH - 3;
    return {
      rect: { x: view.x, y: box.colDendY, w: view.w, h: box.colDendH },
      along: (pos) => view.x + pos * cam.cw - cam.sx,
      across: (h) => y0 + span * (1 - h * TREE_SHARE),
      height: (x, y) => (1 - (y - y0) / span) / TREE_SHARE,
      leafAt: (x) => Math.floor((x - view.x + cam.sx) / cam.cw),
      first: Math.floor(cam.sx / cam.cw),
      last: Math.floor((cam.sx + view.w) / cam.cw),
      point: (along, across) => [along, across],
      coord: (x, y) => y,
    };
  }

  _drawTree(ctx, tree, kind, hoverNode, selectedNode) {
    if (!tree || !tree.nodeCount) return;
    const frame = this._treeFrame(kind);
    const { rect } = frame;
    if (rect.w <= 0 || rect.h <= 0) return;
    const focus = hoverNode >= 0 ? hoverNode : selectedNode;
    const focusLo = focus >= 0 ? tree.lo[focus] : 0;
    const focusHi = focus >= 0 ? tree.hi[focus] : -1;
    const clusters = this._clusters[kind];

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.lineJoin = "miter";
    const base = Number(this.settings.dendrogram_line_width) || 1;

    // One path per colour: the plain tree, each cluster colour, the focused subtree.
    const FOCUS = CLUSTER_COLORS.length;
    const PLAIN = FOCUS + 1;
    const paths = new Array(PLAIN + 1).fill(null);
    for (let i = 0; i < tree.nodeCount; i++) {
      if (tree.hi[i] < frame.first || tree.lo[i] > frame.last) continue;
      let bucket = PLAIN;
      if (tree.lo[i] >= focusLo && tree.hi[i] <= focusHi) {
        bucket = FOCUS;
      } else if (clusters) {
        const cluster = clusters.list[clusters.leafCluster[tree.lo[i]]];
        if (cluster.color >= 0 && tree.hi[i] <= cluster.hi) bucket = cluster.color % CLUSTER_COLORS.length;
      }
      const path = paths[bucket] || (paths[bucket] = new Path2D());
      const a = frame.along(tree.aPos[i]);
      const b = frame.along(tree.bPos[i]);
      const h = frame.across(tree.h[i]);
      let p = frame.point(a, frame.across(tree.aH[i]));
      path.moveTo(p[0], p[1]);
      p = frame.point(a, h);
      path.lineTo(p[0], p[1]);
      p = frame.point(b, h);
      path.lineTo(p[0], p[1]);
      p = frame.point(b, frame.across(tree.bH[i]));
      path.lineTo(p[0], p[1]);
    }
    [PLAIN, ...CLUSTER_COLORS.keys(), FOCUS].forEach((bucket) => {
      if (!paths[bucket]) return;
      ctx.strokeStyle = bucket === PLAIN ? "#5a6470" : bucket === FOCUS ? "#d7191c" : CLUSTER_COLORS[bucket];
      ctx.lineWidth = bucket === PLAIN ? base : bucket === FOCUS ? base + 1 : base + 0.5;
      ctx.stroke(paths[bucket]);
    });

    // The cut line: dashed, with a grip; it rests beyond the root when unused.
    const cut = this._cut[kind];
    if (cut !== null || !this._exporting) {
      const at = Math.round(frame.across(cut === null ? MAX_CUT : cut)) + 0.5;
      const active = cut !== null;
      const from = frame.point(kind === "row" ? rect.y : rect.x, at);
      const to = frame.point(kind === "row" ? rect.y + rect.h : rect.x + rect.w, at);
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = active ? "#111" : "#9aa3ad";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      if (!this._exporting) {
        const middle = kind === "row" ? rect.y + rect.h / 2 : rect.x + rect.w / 2;
        const grip = frame.point(middle - 11, at - 2.5);
        ctx.fillStyle = active ? "#111" : "#9aa3ad";
        if (kind === "row") ctx.fillRect(grip[0], grip[1], 5, 22);
        else ctx.fillRect(grip[0], grip[1], 22, 5);
      }
    }
    ctx.restore();
  }

  /** "row" / "col" when the pointer is on that tree's cut line, else null. */
  _cutHandleAt(region) {
    const kind = region.name === "rowTree" ? "row" : region.name === "colTree" ? "col" : null;
    const tree = kind && this._tree(kind);
    if (!tree || !tree.nodeCount) return null;
    const frame = this._treeFrame(kind);
    const cut = this._cut[kind];
    const at = frame.across(cut === null ? MAX_CUT : cut);
    return Math.abs(frame.coord(region.x, region.y) - at) <= 5 ? kind : null;
  }

  /** True when the pointer is on the cluster colour strip between a tree and the heatmap. */
  _onStrip(kind, region) {
    const frame = this._treeFrame(kind);
    const stripStart = kind === "row" ? frame.rect.x + frame.rect.w : frame.rect.y + frame.rect.h;
    return frame.coord(region.x, region.y) >= stripStart;
  }

  /** The tree node under the pointer; with a cut, anywhere in a cluster's band picks that cluster. */
  _nodeAt(kind, region) {
    const tree = this._tree(kind);
    const clusters = this._clusters[kind];
    const frame = this._treeFrame(kind);
    // The colour strip between tree and heatmap always picks the whole cluster.
    const onStrip = !!clusters && this._onStrip(kind, region);
    const node = onStrip ? -1 : this._treeNodeAt(tree, kind, region.x, region.y);
    if (node >= 0 || !clusters) return node;
    const leaf = frame.leafAt(region.x, region.y);
    if (leaf < 0 || leaf >= tree.leafCount) return -1;
    return clusters.list[clusters.leafCluster[leaf]].node;
  }

  /** Index of the tree node under the pointer, or -1. */
  _treeNodeAt(tree, kind, x, y) {
    if (!tree || !tree.nodeCount) return -1;
    const frame = this._treeFrame(kind);
    const along = kind === "row" ? y : x;
    const across = kind === "row" ? x : y;
    let best = -1;
    let bestDistance = HIT_PX;
    const segment = (p, a, b, q, fixed) => {
      // Distance from (p, q) to the axis-aligned segment [a, b] at `fixed`.
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const d = p < lo ? lo - p : p > hi ? p - hi : 0;
      return Math.hypot(d, q - fixed);
    };
    for (let i = 0; i < tree.nodeCount; i++) {
      if (tree.hi[i] < frame.first || tree.lo[i] > frame.last) continue;
      const a = frame.along(tree.aPos[i]);
      const b = frame.along(tree.bPos[i]);
      const h = frame.across(tree.h[i]);
      const d = Math.min(
        segment(along, a, b, across, h),
        segment(across, frame.across(tree.aH[i]), h, along, a),
        segment(across, frame.across(tree.bH[i]), h, along, b)
      );
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    return best;
  }

  /* ---------------------------------------------------------- interaction */

  _point(e) {
    const rect = this._root.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _regionAt(e) {
    const box = this._layoutBox;
    if (!box || !this._cam) return { name: "none" };
    const { x, y } = this._point(e);
    const view = this._viewRect();
    const inX = x >= view.x && x < view.x + view.w;
    const inY = y >= view.y && y < view.y + view.h;
    if (inX && inY) return { name: "heatmap", x, y };
    if (box.dendW && inY && x >= box.dendX && x < view.x) return { name: "rowTree", x, y };
    if (box.colDendH && inX && y >= box.colDendY && y < view.y) return { name: "colTree", x, y };
    // Labels (only where they are drawn): a click opens the gene.
    const cam = this._cam;
    if (box.trackW && inY && x >= view.x + view.w + 6 && x < view.x + view.w + 6 + this._tracks.rows.length * TRACK) {
      const index = Math.floor((y - view.y + cam.sy) / cam.ch);
      const track = Math.floor((x - view.x - view.w - 6) / TRACK);
      if (index >= 0 && index < this._nRows) return { name: "rowTrack", x, y, index, track };
    }
    if (box.trackH && inX && y >= view.y + view.h + 6 && y < view.y + view.h + 6 + this._tracks.cols.length * TRACK) {
      const index = Math.floor((x - view.x + cam.sx) / cam.cw);
      const track = Math.floor((y - view.y - view.h - 6) / TRACK);
      if (index >= 0 && index < this._nCols) return { name: "colTrack", x, y, index, track };
    }
    if (this.settings.draw_row_ids && cam.ch >= 8 && inY && x >= view.x + view.w + 6 + box.trackW && x <= view.x + view.w + box.trackW + box.rowLabelW) {
      const index = Math.floor((y - view.y + cam.sy) / cam.ch);
      if (index >= 0 && index < this._nRows) return { name: "rowLabel", x, y, index };
    }
    if (this.settings.heatmap_header && cam.cw >= 8 && inX && y >= view.y + view.h + 6 + box.trackH && y <= view.y + view.h + box.trackH + box.colLabelH) {
      const index = Math.floor((x - view.x + cam.sx) / cam.cw);
      if (index >= 0 && index < this._nCols) return { name: "colLabel", x, y, index };
    }
    const minimap = this._minimapRect();
    if (minimap && x >= minimap.x && x <= minimap.x + minimap.w && y >= minimap.y && y <= minimap.y + minimap.h) {
      return { name: "minimap", x, y };
    }
    if (this._stats) {
      const legend = this._legendFrame();
      if (
        x >= legend.x0 - 8 && x <= legend.x0 + legend.w + 8 &&
        y >= legend.top - 2 && y <= legend.barY + legend.barH + 6
      ) {
        return { name: "legend", x, y };
      }
    }
    return { name: "none", x, y };
  }

  _cellAt(x, y) {
    const cam = this._cam;
    const view = this._viewRect();
    const col = Math.floor((x - view.x + cam.sx) / cam.cw);
    const row = Math.floor((y - view.y + cam.sy) / cam.ch);
    if (row < 0 || col < 0 || row >= this._nRows || col >= this._nCols) return null;
    return { row, col };
  }

  _onPointerDown(e) {
    if (e.pointerType === "touch") {
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._pointers.size === 2) {
        // Second finger: the drag becomes a pinch.
        const [a, b] = Array.from(this._pointers.values());
        this._drag = null;
        this._boxZoom = null;
        this._setHover(null, e);
        this._pinch = {
          distance: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1),
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          cam: { ...this._cam },
        };
        return;
      }
    }
    if (e.button !== 0) return;
    this._restoredView = null;
    this._root.focus?.({ preventScroll: true });
    const region = this._regionAt(e);
    if (region.name === "minimap") this._panToMinimap(region.x, region.y);
    this._drag = {
      region: region.name,
      // Shift-drag on the heatmap draws a box to zoom to.
      box: e.shiftKey && region.name === "heatmap" ? { x0: region.x, y0: region.y, x1: region.x, y1: region.y } : null,
      cut: this._cutHandleAt(region),
      // Dragging an end of the legend's colour range; the axis is fixed for the drag.
      legend: region.name === "legend" ? this._legendHandleAt(region.x, region.y) : null,
      legendFrame: region.name === "legend" ? this._legendFrame() : null,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    };
    try {
      this._root.setPointerCapture?.(e.pointerId);
    } catch (error) {
      // The pointer is already gone (or was synthetic); the drag works without capture.
    }
  }

  _onPointerMove(e) {
    if (this._pointers.has(e.pointerId)) this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this._pinch) {
      if (this._pointers.size >= 2) this._applyPinch();
      return;
    }
    const drag = this._drag;
    if (drag && drag.region === "minimap") {
      const { x, y } = this._point(e);
      drag.moved = true;
      this._panToMinimap(x, y);
      return;
    }
    if (drag && drag.box) {
      const view = this._viewRect();
      const { x, y } = this._point(e);
      drag.box.x1 = clamp(x, view.x, view.x + view.w);
      drag.box.y1 = clamp(y, view.y, view.y + view.h);
      drag.moved = true;
      this._boxZoom = drag.box;
      this._setHover(null, e);
      this._requestRender();
      return;
    }
    if (drag && drag.legend) {
      const frame = drag.legendFrame;
      const value = frame.toValue(this._point(e).x);
      const gap = (frame.hi - frame.lo) * 0.02;
      const min = drag.legend === "min" ? Math.min(value, this._range.max - gap) : this._range.min;
      const max = drag.legend === "max" ? Math.max(value, this._range.min + gap) : this._range.max;
      drag.moved = true;
      this._setManualRange(min, max);
      return;
    }
    if (drag && drag.cut) {
      const { x, y } = this._point(e);
      const height = this._treeFrame(drag.cut).height(x, y);
      drag.moved = true;
      this._setHover(null, e);
      this._setCut(drag.cut, clamp(height, 0, MAX_CUT), false);
      return;
    }
    if (drag) {
      if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 3) {
        drag.moved = true;
        this._setHover(null, e);
        this._root.style.cursor = "grabbing";
      }
      if (drag.moved && drag.region !== "none") {
        if (drag.region !== "rowTree") this._cam.sx -= e.clientX - drag.lastX;
        if (drag.region !== "colTree") this._cam.sy -= e.clientY - drag.lastY;
        this._clampCamera();
        this._requestRender();
      }
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      return;
    }
    this._updateHover(e);
  }

  _updateHover(e) {
    const region = this._regionAt(e);
    let rowNode = -1;
    let colNode = -1;
    let cell = null;
    const handle = this._cutHandleAt(region);
    if (region.name === "heatmap") cell = this._cellAt(region.x, region.y);
    else if (handle) rowNode = -1;
    else if (region.name === "rowTree") rowNode = this._nodeAt("row", region);
    else if (region.name === "colTree") colNode = this._nodeAt("col", region);

    let cursor = "default";
    if (region.name === "legend" && this._legendHandleAt(region.x, region.y)) cursor = "ew-resize";
    else if (region.name === "rowLabel" || region.name === "colLabel") cursor = "pointer";
    else if (handle) cursor = handle === "row" ? "col-resize" : "row-resize";
    else if (cell) cursor = "crosshair";
    else if (rowNode >= 0 || colNode >= 0) cursor = "pointer";
    this._root.style.cursor = cursor;
    if (rowNode !== this._hoverNode.row || colNode !== this._hoverNode.col) {
      this._hoverNode = { row: rowNode, col: colNode };
      this._requestRender();
    }
    this._setHover(cell, e, region);
    if (region.name === "rowTrack" || region.name === "colTrack") {
      // What a track shows at this row / column.
      const rowTrack = region.name === "rowTrack";
      const track = (rowTrack ? this._tracks.rows : this._tracks.cols)[region.track];
      if (track) {
        const value = track.values[region.index];
        const label = rowTrack ? this._rowLabels[region.index] : this._colLabels[region.index];
        const shown = value === true ? "yes" : value === null || value === undefined || value === false ? "no" : String(value);
        this._showTooltip(`${track.name}: ${shown}\n${label}`, region);
      }
    }
  }

  _showTooltip(text, region) {
    const tip = this._tooltip;
    const box = this._layoutBox;
    tip.textContent = text;
    tip.style.display = "block";
    const left = region.x + 14 + tip.offsetWidth > box.width ? region.x - tip.offsetWidth - 10 : region.x + 14;
    const top = region.y + 16 + tip.offsetHeight > box.height ? region.y - tip.offsetHeight - 8 : region.y + 16;
    tip.style.left = `${Math.max(0, left)}px`;
    tip.style.top = `${Math.max(0, top)}px`;
  }

  _setHover(cell, e, region) {
    const previous = this._hover;
    if (!cell) {
      if (previous) {
        this._hover = null;
        this.events.row_onmouseout?.(e);
        this._requestRender();
      }
      if (this._tooltip) this._tooltip.style.display = "none";
      return;
    }
    if (!previous || previous.row !== cell.row || previous.col !== cell.col) {
      this._hover = cell;
      if (!previous || previous.row !== cell.row) {
        this.events.row_onmouseover?.(this._rowObjects[cell.row], e);
      }
      const value = this._values[cell.row * this._nCols + cell.col];
      const raw = this._rawValues ? this._rawValues[cell.row * this._nCols + cell.col] : value;
      const shown = value > 1e38 ? "n/a" : formatValue(raw);
      this._tooltip.textContent =
        `Row: ${this._rowLabels[cell.row]}\nColumn: ${this._colLabels[cell.col]}\n` +
        `Value: ${shown}` +
        (this._rawValues && value <= 1e38 ? `\nRow z-score: ${formatValue(value)}` : "");
      this._requestRender();
    }
    const tip = this._tooltip;
    tip.style.display = "block";
    const box = this._layoutBox;
    const left = region.x + 14 + tip.offsetWidth > box.width ? region.x - tip.offsetWidth - 10 : region.x + 14;
    const top = region.y + 16 + tip.offsetHeight > box.height ? region.y - tip.offsetHeight - 8 : region.y + 16;
    tip.style.left = `${Math.max(0, left)}px`;
    tip.style.top = `${Math.max(0, top)}px`;
  }

  _applyPinch() {
    const [a, b] = Array.from(this._pointers.values());
    const start = this._pinch;
    const cam = this._cam;
    const rect = this._root.getBoundingClientRect();
    const view = this._viewRect();
    const scale = Math.hypot(a.x - b.x, a.y - b.y) / start.distance;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    // The content under the fingers' midpoint at the start stays under it.
    Object.assign(cam, start.cam);
    this._zoomBy(scale, start.mid.x - rect.left - view.x, start.mid.y - rect.top - view.y);
    cam.sx -= mid.x - start.mid.x;
    cam.sy -= mid.y - start.mid.y;
    this._clampCamera();
    this._requestRender();
  }

  _onKeyDown(e) {
    const cam = this._cam;
    if (!cam || e.ctrlKey || e.metaKey || e.altKey) return;
    this._restoredView = null;
    const view = this._viewRect();
    const step = e.shiftKey ? 240 : 48;
    switch (e.key) {
      case "ArrowLeft": cam.sx -= step; break;
      case "ArrowRight": cam.sx += step; break;
      case "ArrowUp": cam.sy -= step; break;
      case "ArrowDown": cam.sy += step; break;
      case "+":
      case "=": this._zoomBy(1.25, view.w / 2, view.h / 2); break;
      case "-":
      case "_": this._zoomBy(0.8, view.w / 2, view.h / 2); break;
      case "0":
      case "Home": this.resetCamera(); break;
      default: return;
    }
    e.preventDefault();
    this._clampCamera();
    this._requestRender();
  }

  _onPointerUp(e) {
    this._pointers.delete(e.pointerId);
    if (this._pinch) {
      // A pinch ends when a finger lifts; the other finger does not start a drag.
      if (this._pointers.size < 2) this._pinch = null;
      this._drag = null;
      return;
    }
    const drag = this._drag;
    this._drag = null;
    if (!drag) return;
    try {
      this._root.releasePointerCapture?.(drag.pointerId);
    } catch (error) {
      // Nothing was captured.
    }
    if (drag.box) {
      this._boxZoom = null;
      const { x0, y0, x1, y1 } = drag.box;
      if (Math.abs(x1 - x0) > 4 && Math.abs(y1 - y0) > 4) {
        const cam = this._cam;
        const view = this._viewRect();
        const col = (x) => (x - view.x + cam.sx) / cam.cw;
        const row = (y) => (y - view.y + cam.sy) / cam.ch;
        this._zoomToCells(col(Math.min(x0, x1)), col(Math.max(x0, x1)), row(Math.min(y0, y1)), row(Math.max(y0, y1)));
      }
      this._requestRender();
      return;
    }
    if (drag.legend) {
      if (drag.moved) {
        this.events.range_onuserchange?.({ min: this._range.min, max: this._range.max, auto: false });
      }
      return;
    }
    if (drag.cut) {
      if (drag.moved) this.events.clusters_onchange?.(this.getClusters());
      this._updateHover(e);
      return;
    }
    if (drag.moved) {
      this._updateHover(e);
      return;
    }
    const region = this._regionAt(e);
    if (region.name === "heatmap") {
      const cell = this._cellAt(region.x, region.y);
      if (cell) this.events.row_onclick?.(this._rowObjects[cell.row].slice(), e);
    } else if (region.name === "rowTree") {
      const node = this._nodeAt("row", region);
      if (node >= 0) {
        this._selectNode("row", node, e);
      } else {
        this.events.empty_space_onclick?.(e);
      }
    } else if (region.name === "colTree") {
      const node = this._nodeAt("col", region);
      if (node >= 0) {
        this._selectNode("col", node, e);
      } else {
        this.events.empty_space_onclick?.(e);
      }
    } else if (region.name === "rowLabel") {
      this.events.label_onclick?.({
        axis: "row",
        label: this._rowLabels[region.index],
        objects: this._rowObjects[region.index].slice(),
      });
    } else if (region.name === "colLabel") {
      const label = this._colLabels[region.index];
      this.events.label_onclick?.({ axis: "column", label, objects: [label] });
    } else if (!["legend", "minimap", "rowTrack", "colTrack"].includes(region.name)) {
      this.events.empty_space_onclick?.(e);
    }
    this._updateHover(e);
    this._requestRender();
  }

  _onPointerLeave(e) {
    if (this._drag) return;
    this._hoverNode = { row: -1, col: -1 };
    this._setHover(null, e);
    this.events.heatmap_onmouseout?.(e);
    this._requestRender();
  }

  _onWheel(e) {
    const region = this._regionAt(e);
    if (!["heatmap", "rowTree", "colTree"].includes(region.name)) return;
    this._restoredView = null;
    const cam = this._cam;
    const view = this._viewRect();
    const box = this._layoutBox;
    const before = { ...cam };
    const pixels = e.deltaMode === 0;

    // A trackpad's two-finger scroll arrives as small pixel deltas, usually on
    // both axes: it pans. A mouse wheel (large steps) and a pinch (ctrl) zoom.
    const trackpadScroll = pixels && !e.ctrlKey && (e.deltaX !== 0 || Math.abs(e.deltaY) < 30);
    if (trackpadScroll) {
      if (region.name !== "rowTree") cam.sx += e.deltaX;
      if (region.name !== "colTree") cam.sy += e.deltaY;
      this._clampCamera();
    } else {
      const delta = pixels ? e.deltaY : e.deltaY * 16;
      const factor = Math.exp(-delta * (e.ctrlKey && pixels ? 0.01 : 0.0015));
      // Over a dendrogram only its own axis zooms; Shift/Alt do the same on the heatmap.
      const zoomX = region.name !== "rowTree" && !e.altKey;
      const zoomY = region.name !== "colTree" && !e.shiftKey;
      this._zoomBy(
        factor,
        clamp(region.x - view.x, 0, box.availW),
        clamp(region.y - view.y, 0, box.availH),
        zoomX,
        zoomY
      );
    }
    // At a limit nothing moves, and the wheel scrolls the page as usual.
    if (cam.cw === before.cw && cam.ch === before.ch && cam.sx === before.sx && cam.sy === before.sy) return;
    e.preventDefault();
    this._updateHover(e);
    this._requestRender();
  }
}

export { COLOR_SCALES, buildTree, cutTree };
export default ClusterHeatmap;
