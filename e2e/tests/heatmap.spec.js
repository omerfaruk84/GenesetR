// The cluster heatmap, run through the real page: an example gene set, a
// mocked correlation task (fixtures/corr_cluster.json), then the canvas.
const { test, expect } = require("@playwright/test");
const { mockApi, watchErrors } = require("./mockApi");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("genesetr.v2.releasePopup.dismissed.v1", "1");
    } catch (error) {
      // storage not available: the pages still work
    }
  });
});

/** Runs the correlation example and waits for the heatmap to be drawn. */
const openHeatmap = async (page) => {
  const api = await mockApi(page);
  await page.goto("/correlation");
  await page.getByText("K562 Whole Genome", { exact: true }).first().click();
  await page.locator('[data-tour="example"]').first().click();
  await page.getByRole("menuitem").first().click();
  await page.locator('[data-tour="run"] button').first().click();
  await expect(page.locator("[data-cluster-heatmap] canvas").first()).toBeVisible();
  return api;
};

/** Evaluates `fn(heatmap, arg)` in the page with the renderer instance. */
const withHeatmap = (page, fn, arg) =>
  page.evaluate(
    ([source, value]) => {
      const root = document.querySelector("[data-cluster-heatmap]");
      // eslint-disable-next-line no-new-func
      return new Function("hm", "arg", `return (${source})(hm, arg);`)(root.__heatmap, value);
    },
    [fn.toString(), arg]
  );

/**
 * Viewport position of a dendrogram node: the smallest one with at least
 * `minLeaves` leaves (and at most `maxLeaves`). axis is "row" or "col".
 */
const treeNodePoint = (page, axis, minLeaves, maxLeaves = Infinity) =>
  withHeatmap(
    page,
    (hm, [kind, min, max]) => {
      const tree = hm._tree(kind);
      const frame = hm._treeFrame(kind);
      const size = (i) => tree.hi[i] - tree.lo[i] + 1;
      let best = -1;
      for (let i = 0; i < tree.nodeCount; i++) {
        if (size(i) >= min && size(i) <= max && (best < 0 || size(i) < size(best))) best = i;
      }
      const rect = hm._root.getBoundingClientRect();
      const along = (frame.along(tree.aPos[best]) + frame.along(tree.bPos[best])) / 2;
      const across = frame.across(tree.h[best]);
      const [x, y] = frame.point(along, across);
      return { x: rect.left + x, y: rect.top + y, size: size(best) };
    },
    [axis, minLeaves, maxLeaves === Infinity ? 1e9 : maxLeaves]
  );

/** A sidebar checkbox by its label (the UI library renders input + text in a div). */
const sidebarCheckbox = (page, label) =>
  page.locator('div:has(> input[type="checkbox"])').filter({ hasText: label }).last().locator("input");

test("correlation result is drawn by the cluster heatmap", async ({ page }) => {
  const errors = watchErrors(page);
  const api = await openHeatmap(page);
  expect(api.requests).toContain("POST /getData");

  const info = await withHeatmap(page, (hm) => ({
    rows: hm._nRows,
    cols: hm._nCols,
    mode: hm._mode,
    rowNodes: hm._rowTree.nodeCount,
    colNodes: hm._colTree ? hm._colTree.nodeCount : 0,
  }));
  expect(info).toEqual({ rows: 60, cols: 60, mode: "gl", rowNodes: 59, colNodes: 59 });
  expect(await errors()).toEqual([]);
});

test("a clicked cluster is enriched against the heatmap's genes", async ({ page }) => {
  const errors = watchErrors(page);
  const api = await openHeatmap(page);

  const node = await treeNodePoint(page, "row", 8);
  await page.mouse.click(node.x, node.y);

  // The 60 rows are the background, sent to Enrichr's background API.
  await expect(page.getByText("Background: heatmap rows (60)")).toBeVisible();
  await expect(page.getByText("Ribosome").first()).toBeVisible();
  await expect(page.getByText("∞").first()).toBeVisible(); // infinite odds ratio survives parsing
  const background = api.enrichr.find((call) => call.path.endsWith("/addbackground"));
  expect(background).toBeTruthy();
  expect(background.body).toContain("PSMA1");
  expect(api.enrichr.some((call) => call.path.endsWith("/backgroundenrich"))).toBe(true);
  expect(api.enrichr.some((call) => call.path.endsWith("/Enrichr/enrich"))).toBe(false);

  // Switching the background off falls back to the genome-wide test.
  await page.getByText("Background: heatmap rows (60)").click();
  await expect.poll(() => api.enrichr.some((call) => call.path.endsWith("/Enrichr/enrich"))).toBe(true);
  expect(await errors()).toEqual([]);
});

test("a cluster too small for enrichment says so", async ({ page }) => {
  await openHeatmap(page);
  const node = await treeNodePoint(page, "row", 2, 2);
  expect(node.size).toBe(2);
  await page.mouse.click(node.x, node.y);
  await expect(page.getByText(/Enrichment is only run for lists of 3-400 genes/)).toBeVisible();
});

test("the cluster panel opens beside the heatmap and links terms to rows", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  const widthBefore = await withHeatmap(page, (hm) => hm._layoutBox.width);

  const node = await treeNodePoint(page, "row", 8);
  await page.mouse.click(node.x, node.y);
  const panel = page.getByTestId("cluster-panel");
  await expect(panel.getByText(`Row cluster · ${node.size} genes`)).toBeVisible();

  // Side by side: the heatmap gave up width and the panel starts right of it.
  await expect.poll(() => withHeatmap(page, (hm) => hm._layoutBox.width)).toBeLessThan(widthBefore - 200);
  const heatmapBox = await page.locator("[data-cluster-heatmap]").boundingBox();
  const panelBox = await panel.boundingBox();
  expect(panelBox.x).toBeGreaterThanOrEqual(heatmapBox.x + heatmapBox.width - 1);
  expect(Math.abs(panelBox.y - heatmapBox.y)).toBeLessThan(80);

  // Hovering a term marks its overlap genes (RPL3, RPL4, RPS3 in the fixture).
  await panel.getByText("Ribosome").first().hover();
  await expect.poll(() => withHeatmap(page, (hm) => hm._marks.rows.length)).toBe(3);
  expect(await withHeatmap(page, (hm) => hm._marks.rows.map((r) => hm._rowLabels[r]).sort())).toEqual([
    "RPL3",
    "RPL4",
    "RPS3",
  ]);

  await panel.getByRole("button", { name: "Close the cluster panel" }).click();
  await expect(panel.getByText(/Row cluster/)).toHaveCount(0);
  await expect.poll(() => withHeatmap(page, (hm) => hm._layoutBox.width)).toBe(widthBefore);
  expect(await withHeatmap(page, (hm) => hm._selected.row)).toBe(-1);
  expect(await errors()).toEqual([]);
});

test("every cluster of a cut can be enriched at once", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  await withHeatmap(page, (hm) => hm.setClusterCount("row", 4));
  const sizes = await withHeatmap(page, (hm) => hm.getClusters().rows.map((cluster) => cluster.size));
  expect(sizes.reduce((a, b) => a + b, 0)).toBe(60);

  await page.getByRole("button", { name: "Enrich clusters" }).click();
  const summary = page.getByTestId("cluster-summary");
  await expect(summary.getByText(`Cluster enrichment · ${sizes.length} clusters`)).toBeVisible();
  const enrichable = sizes.filter((size) => size >= 3).length;
  await expect(summary.getByText(/Ribosome/)).toHaveCount(enrichable);
  await expect(summary.getByText("Best term of each cluster", { exact: false })).toBeVisible();
  // The best terms are written onto the heatmap's cluster bands.
  expect(await withHeatmap(page, (hm) => Object.values(hm._clusterLabels.row))).toEqual(
    Array(enrichable).fill("Ribosome")
  );

  // A row of the summary opens that cluster; "All clusters" goes back.
  const first = sizes.findIndex((size) => size >= 3);
  await summary.getByText(`Row ${first + 1}`, { exact: true }).click();
  const panel = page.getByTestId("cluster-panel");
  await expect(panel.getByText(`Row cluster · ${sizes[first]} genes`)).toBeVisible();
  await panel.getByRole("button", { name: "All clusters" }).click();
  await expect(summary.getByText(/Cluster enrichment/)).toBeVisible();

  // Moving the cut discards the summary.
  await withHeatmap(page, (hm) => hm.setClusterCount("row", 3));
  await expect(page.getByTestId("cluster-summary")).toHaveCount(0);
  expect(await errors()).toEqual([]);
});

test("colour range: automatic by default, manual from the sidebar, row z-scores", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);

  // Diverging scale + correlations of both signs: centred on zero, and the
  // diagonal (1.0) does not set the range.
  const auto = await withHeatmap(page, (hm) => ({ ...hm._range, mode: hm._rangeMode, dataMax: hm._stats.max }));
  expect(auto.mode).toBe("auto");
  expect(auto.mid).toBe(0);
  expect(auto.min).toBeCloseTo(-auto.max, 10);
  expect(auto.max).toBeLessThan(auto.dataMax);

  // A sequential scale uses the percentile range as it is.
  const viridis = await withHeatmap(page, (hm) => {
    hm.updateCellColors("Viridis");
    return { first: Array.from(hm._lut.slice(0, 3)), min: hm._range.min, max: hm._range.max };
  });
  expect(viridis.first).toEqual([68, 1, 84]);
  expect(viridis.min).toBeLessThan(0);
  expect(viridis.max).not.toBeCloseTo(-viridis.min, 6);
  await withHeatmap(page, (hm) => hm.updateCellColors("BuWhRd"));

  // Switching the automatic range off applies the stored manual range (-1..1).
  await page.getByText("Automatic range", { exact: true }).click();
  await expect.poll(() => withHeatmap(page, (hm) => hm._rangeMode)).toBe("manual");
  expect(await withHeatmap(page, (hm) => [hm._range.min, hm._range.max])).toEqual([-1, 1]);
  await page.getByText("Automatic range", { exact: true }).click();
  await expect.poll(() => withHeatmap(page, (hm) => hm._rangeMode)).toBe("auto");

  // Row z-scores: every row is centred, the tooltip keeps the original value.
  await page.getByText("Row z-scores", { exact: true }).click();
  await expect.poll(() => withHeatmap(page, (hm) => !!hm._rawValues)).toBe(true);
  const rowMean = await withHeatmap(page, (hm) => {
    let sum = 0;
    for (let c = 0; c < hm._nCols; c++) sum += hm._values[5 * hm._nCols + c];
    return sum / hm._nCols;
  });
  expect(Math.abs(rowMean)).toBeLessThan(1e-4);
  expect(await errors()).toEqual([]);
});

test("the legend's ends set the colour range; double-click restores the automatic one", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  const start = await withHeatmap(page, (hm) => {
    const frame = hm._legendFrame();
    const rect = hm._root.getBoundingClientRect();
    return {
      x: rect.left + frame.toX(hm._range.max),
      y: rect.top + frame.barY + 4,
      to: rect.left + frame.toX(0.3),
      max: hm._range.max,
    };
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move((start.x + start.to) / 2, start.y, { steps: 3 });
  await page.mouse.move(start.to, start.y, { steps: 3 });
  await page.mouse.up();

  const manual = await withHeatmap(page, (hm) => ({ ...hm._range, mode: hm._rangeMode }));
  expect(manual.mode).toBe("manual");
  expect(manual.max).toBeCloseTo(0.3, 1);
  expect(manual.max).toBeLessThan(start.max);
  expect(manual.mid).toBe(0); // the diverging scale keeps white on zero
  // The sidebar follows: its "Automatic range" box is now unticked.
  await expect(sidebarCheckbox(page, "Automatic range")).not.toBeChecked();

  await page.mouse.dblclick(start.to - 20, start.y);
  await expect.poll(() => withHeatmap(page, (hm) => hm._rangeMode)).toBe("auto");
  await expect(sidebarCheckbox(page, "Automatic range")).toBeChecked();
  expect(await errors()).toEqual([]);
});

test("zoomed out, cells that share a pixel are averaged", async ({ page }) => {
  await openHeatmap(page);
  // A 1200 x 1200 checkerboard of -1 / +1 in a 400 px wide box: every pixel
  // covers several cells whose mean is near zero, so it must come out pale,
  // not as the saturated colour of one cell.
  const pixel = await withHeatmap(page, (hm) => {
    const size = 1200;
    const nodes = {};
    for (let i = 0; i < size; i++) {
      const features = new Array(size);
      for (let j = 0; j < size; j++) features[j] = (i + j) % 2 ? 1 : -1;
      nodes[i] = { count: 1, distance: 0, objects: [`G${i}`], features };
    }
    const box = document.createElement("div");
    box.id = "average-test";
    box.style.cssText = "position:fixed;left:0;top:0;width:400px;z-index:99999;background:#fff";
    document.body.appendChild(box);
    const test = new hm.constructor({ target: "average-test" });
    test.read_data({ data: { nodes, feature_names: Array.from({ length: size }, (_, j) => `P${j}`) } });
    test.draw();
    const canvas = test.stage.getContent().getElementsByTagName("canvas")[0];
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext("2d");
    ctx.drawImage(canvas, 0, 0);
    const view = test._viewRect();
    const data = ctx.getImageData(Math.round(view.x + view.w / 2), Math.round(view.y + view.h / 2), 1, 1).data;
    const result = { rgb: [data[0], data[1], data[2]], cell: test._cam.cw, mode: test._mode };
    test.cleanup();
    box.remove();
    return result;
  });
  expect(pixel.mode).toBe("gl");
  expect(pixel.cell).toBeLessThan(0.5);
  expect(Math.min(...pixel.rgb)).toBeGreaterThan(150);
});

/** Viewport position of the middle of the heatmap's visible part. */
const heatmapCentre = (page) =>
  withHeatmap(page, (hm) => {
    const rect = hm._root.getBoundingClientRect();
    const view = hm._viewRect();
    return { x: rect.left + view.x + view.w / 2, y: rect.top + view.y + view.h / 2, left: rect.left + view.x, top: rect.top + view.y };
  });
const camera = (page) => withHeatmap(page, (hm) => ({ ...hm._cam, fitCw: hm._layoutBox.fitCw, fitCh: hm._layoutBox.fitCh }));

test("navigation: wheel zooms, trackpad scroll pans, pinch zooms, keys work", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  const centre = await heatmapCentre(page);
  const fit = await camera(page);
  await page.mouse.move(centre.x, centre.y);

  // Mouse wheel (large steps): zoom in around the pointer.
  await page.mouse.wheel(0, -400);
  const zoomed = await camera(page);
  expect(zoomed.cw).toBeGreaterThan(fit.cw * 1.5);
  expect(zoomed.ch).toBeGreaterThan(fit.ch * 1.5);

  // Trackpad two-finger scroll (small deltas on both axes): pan, no zoom.
  await page.mouse.wheel(-12, -9);
  const panned = await camera(page);
  expect(panned.cw).toBe(zoomed.cw);
  expect(panned.sx).toBeCloseTo(zoomed.sx - 12, 3);
  expect(panned.sy).toBeCloseTo(zoomed.sy - 9, 3);

  // Pinch on a trackpad arrives as ctrl + small wheel deltas: zoom.
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -20);
  await page.keyboard.up("Control");
  expect((await camera(page)).cw).toBeGreaterThan(panned.cw);

  // Keyboard: 0 fits, + zooms, arrows pan.
  await page.locator("[data-cluster-heatmap]").focus();
  await page.keyboard.press("0");
  expect((await camera(page)).cw).toBe(fit.cw);
  await page.keyboard.press("+");
  await page.keyboard.press("+");
  const keyed = await camera(page);
  expect(keyed.cw).toBeGreaterThan(fit.cw);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  const moved = await camera(page);
  expect(moved.sx).toBeGreaterThan(keyed.sx);
  expect(moved.sy).toBeGreaterThan(keyed.sy);
  expect(await errors()).toEqual([]);
});

test("navigation: box zoom, zoom to a cluster, square cells, touch pinch", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  const centre = await heatmapCentre(page);
  const fit = await camera(page);

  // Shift-drag draws a box; the view zooms to it.
  await page.keyboard.down("Shift");
  await page.mouse.move(centre.left + 40, centre.top + 40);
  await page.mouse.down();
  await page.mouse.move(centre.left + 140, centre.top + 100, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  const boxed = await camera(page);
  expect(boxed.cw).toBeGreaterThan(fit.cw * 2);
  expect(boxed.sx).toBeCloseTo((40 / fit.cw) * boxed.cw, 0);
  // No cluster was selected by the drag.
  await expect(page.getByTestId("cluster-panel").getByText(/cluster ·/)).toHaveCount(0);

  // Double-click on a cluster's colour strip zooms to that cluster.
  await withHeatmap(page, (hm) => {
    hm.resetCamera();
    hm.setClusterCount("row", 4);
  });
  const strip = await withHeatmap(page, (hm) => {
    const rect = hm._root.getBoundingClientRect();
    const view = hm._viewRect();
    const cluster = hm._clusters.row.list.find((c) => c.node >= 0 && c.hi - c.lo + 1 < hm._nRows / 2);
    return {
      x: rect.left + view.x - 3,
      y: rect.top + view.y + ((cluster.lo + cluster.hi + 1) / 2) * hm._cam.ch,
      lo: cluster.lo,
      rows: cluster.hi - cluster.lo + 1,
    };
  });
  await page.mouse.dblclick(strip.x, strip.y);
  await expect
    .poll(() => withHeatmap(page, (hm) => Math.round(hm._viewRect().h / hm._cam.ch)))
    .toBeLessThanOrEqual(Math.max(strip.rows, Math.ceil((await withHeatmap(page, (hm) => hm._layoutBox.availH)) / 64)));
  expect(await withHeatmap(page, (hm) => Math.round(hm._cam.sy / hm._cam.ch))).toBe(strip.lo);

  // Square cells: one size for both axes.
  await page.getByTestId("cluster-panel").getByRole("button", { name: "Close the cluster panel" }).click();
  await page.getByText("Square cells", { exact: true }).click();
  await expect.poll(() => withHeatmap(page, (hm) => hm._cam.cw === hm._cam.ch)).toBe(true);
  await page.getByText("Square cells", { exact: true }).click();

  // Two fingers moving apart zoom in.
  const before = await withHeatmap(page, (hm) => {
    hm.resetCamera();
    return hm._cam.cw;
  });
  await withHeatmap(
    page,
    (hm, [x, y]) => {
      const fire = (type, id, px) =>
        hm._root.dispatchEvent(
          new PointerEvent(type, { pointerId: id, pointerType: "touch", clientX: px, clientY: y, button: 0, bubbles: true })
        );
      fire("pointerdown", 11, x - 30);
      fire("pointerdown", 12, x + 30);
      fire("pointermove", 11, x - 90);
      fire("pointermove", 12, x + 90);
      fire("pointerup", 11, x - 90);
      fire("pointerup", 12, x + 90);
    },
    [centre.x, centre.y]
  );
  expect(await withHeatmap(page, (hm) => hm._cam.cw)).toBeGreaterThan(before * 2);
  expect(await errors()).toEqual([]);
});

test("find a gene: the view jumps to it; the minimap shows and moves the view", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  expect(await withHeatmap(page, (hm) => hm._minimapRect())).toBeNull(); // everything is in view

  const search = page.getByTestId("heatmap-gene-search");
  await search.fill("psma1");
  await search.press("Enter");
  const found = await withHeatmap(page, (hm) => {
    const view = hm._viewRect();
    const row = hm._marks.rows[0];
    const y = row * hm._cam.ch - hm._cam.sy;
    return {
      rows: hm._marks.rows.map((r) => hm._rowLabels[r]),
      cols: hm._marks.cols.map((c) => hm._colLabels[c]),
      cell: hm._cam.ch,
      visible: y >= 0 && y + hm._cam.ch <= view.h + 0.5,
    };
  });
  expect(found.rows).toEqual(["PSMA1"]);
  expect(found.cols).toEqual(["PSMA1"]);
  expect(found.cell).toBeGreaterThanOrEqual(12);
  expect(found.visible).toBe(true);

  // Zoomed in now: the minimap appears; a click on its corner goes there.
  const minimap = await withHeatmap(page, (hm) => {
    const rect = hm._minimapRect();
    const root = hm._root.getBoundingClientRect();
    return rect && { x: root.left + rect.x, y: root.top + rect.y, w: rect.w, h: rect.h };
  });
  expect(minimap).not.toBeNull();
  await page.mouse.click(minimap.x + 1, minimap.y + 1);
  expect(await withHeatmap(page, (hm) => [hm._cam.sx, hm._cam.sy])).toEqual([0, 0]);
  await page.mouse.click(minimap.x + minimap.w - 1, minimap.y + minimap.h - 1);
  expect(await withHeatmap(page, (hm) => hm._cam.sy)).toBeGreaterThan(0);

  // An unknown symbol is flagged; clearing the box removes the marks.
  await search.fill("NOSUCHGENE");
  await search.press("Enter");
  await expect(search).toHaveAttribute("title", "Not in this heatmap");
  await search.fill("");
  expect(await withHeatmap(page, (hm) => hm._marks.rows.length + hm._marks.cols.length)).toBe(0);
  expect(await errors()).toEqual([]);
});

test("a label opens the gene page; cluster counts can be typed", async ({ page, context }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);

  // Labels are clickable once they are drawn (cells of 8 px or more).
  await withHeatmap(page, (hm) => hm.focusGene("PSMA1"));
  const label = await withHeatmap(page, (hm) => {
    const rect = hm._root.getBoundingClientRect();
    const view = hm._viewRect();
    const row = hm._marks.rows[0];
    return { x: rect.left + view.x + view.w + 20, y: rect.top + view.y + (row + 0.5) * hm._cam.ch - hm._cam.sy };
  });
  const [genePage] = await Promise.all([context.waitForEvent("page"), page.mouse.click(label.x, label.y)]);
  expect(genePage.url()).toContain("/gene?symbol=PSMA1");
  await genePage.close();

  // Typing a number of clusters cuts the dendrogram.
  await page.getByTestId("cluster-count-rows").fill("5");
  await expect.poll(() => withHeatmap(page, (hm) => hm.getClusters().rows.length)).toBe(5);
  await expect(page.getByRole("button", { name: "Export clusters" })).toBeVisible();
  await page.getByTestId("cluster-count-rows").fill("1");
  await expect.poll(() => withHeatmap(page, (hm) => hm.getClusters().rows.length)).toBe(0);
  expect(await errors()).toEqual([]);
});

test("zoom, position and cuts come back when the same result is drawn again", async ({ page }) => {
  await openHeatmap(page);
  await withHeatmap(page, (hm) => {
    hm.setClusterCount("column", 3);
    hm._zoomBy(3, 300, 200);
    hm._cam.sx += 80;
    hm._clampCamera();
    hm._renderNow();
  });
  // The view is stored with a delay; by then the toolbar (which gained the
  // cluster buttons) has settled too.
  await page.waitForTimeout(900);
  const saved = await withHeatmap(page, (hm) => hm.getViewState());
  expect(saved.zoomX).toBeGreaterThan(2);

  // Run the same analysis again: a new heatmap instance is created.
  await withHeatmap(page, (hm) => {
    hm._root.setAttribute("data-old", "1");
  });
  await page.locator('[data-tour="run"] button').first().click();
  await expect(page.locator("[data-cluster-heatmap]:not([data-old]) canvas").first()).toBeVisible();
  await expect
    .poll(() => withHeatmap(page, (hm) => hm.getViewState()))
    .toMatchObject({ zoomX: saved.zoomX, zoomY: saved.zoomY, colCut: saved.colCut, rowCut: null });
  const restored = await withHeatmap(page, (hm) => hm.getViewState());
  expect(restored.centerX).toBeCloseTo(saved.centerX, 2);
  expect(await withHeatmap(page, (hm) => hm.getClusters().columns.length)).toBe(3);
});

test("annotation tracks mark genes beside rows and below columns", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  const before = await withHeatmap(page, (hm) => ({ availW: hm._layoutBox.availW, availH: hm._layoutBox.availH }));

  const tracks = await withHeatmap(page, (hm) => {
    const ribosome = { name: "Ribosome", values: { RPL3: true, RPL4: true, RPS3: true } };
    const family = { name: "Family", values: { PSMA1: "proteasome", RPL3: "ribosome", NDUFA2: "complex I" } };
    hm.setAnnotations({ rows: [ribosome, family], columns: [ribosome] });
    hm._renderNow();
    const row = hm._rowLabels.indexOf("RPL3");
    const other = hm._rowLabels.indexOf("PSMA1");
    return {
      rows: hm._tracks.rows.map((track) => track.name),
      cols: hm._tracks.cols.map((track) => track.name),
      member: hm._tracks.rows[0].colors[row],
      nonMember: hm._tracks.rows[0].colors[other],
      categories: new Set(hm._tracks.rows[1].colors.filter(Boolean)).size,
      box: hm._layoutBox,
    };
  });
  expect(tracks.rows).toEqual(["Ribosome", "Family"]);
  expect(tracks.cols).toEqual(["Ribosome"]);
  expect(tracks.member).toBe("#111111");
  expect(tracks.nonMember).not.toBe("#111111");
  expect(tracks.categories).toBe(3);
  // The tracks take their room from the heatmap, not from the labels.
  expect(tracks.box.trackW).toBeGreaterThan(0);
  expect(tracks.box.availW).toBeLessThan(before.availW);
  expect(tracks.box.availH).toBeLessThan(before.availH);

  // The menu lists saved gene lists; without any it says how to get one.
  await page.getByRole("button", { name: "Annotate" }).click();
  await expect(page.getByTestId("annotate-menu")).toContainText("No saved gene lists yet");
  expect(await errors()).toEqual([]);
});

test("export: the whole matrix as a 2x image and as SVG", async ({ page }) => {
  const errors = watchErrors(page);
  await openHeatmap(page);
  // Zoom in first: the export must still show everything.
  const result = await withHeatmap(page, (hm) => {
    hm._zoomBy(3, 100, 100);
    hm._renderNow();
    const cam = { ...hm._cam };
    const size = [hm._base.width, hm._base.height];
    const canvas = hm.exportCanvas({ cell: 14, scale: 2 });
    const ctx = canvas.getContext("2d");
    const box = hm._layoutBox;
    // A cell in the bottom-right corner of the matrix, far outside the zoomed view.
    const x = Math.round((box.hmX + 59.5 * 14) * 2);
    const y = Math.round((box.hmY + 59.5 * 14) * 2);
    const pixel = Array.from(ctx.getImageData(x, y, 1, 1).data);
    const corner = Array.from(ctx.getImageData(2, canvas.height - 3, 1, 1).data);
    const svg = hm.exportSvg({ cell: 14 });
    return {
      width: canvas.width,
      height: canvas.height,
      pixel,
      corner,
      sameView: hm._cam.cw === cam.cw && hm._cam.sx === cam.sx,
      sameSize: hm._base.width === size[0] && hm._base.height === size[1],
      svgStart: svg.slice(0, 4),
      svgLabels: (svg.match(/<text /g) || []).length,
      svgHasImage: svg.includes("<image ") && svg.includes("data:image/png;base64,"),
      svgHasTrees: (svg.match(/<path /g) || []).length,
      svgHasGene: svg.includes(">PSMA1</text>"),
    };
  });
  expect(result.width).toBeGreaterThan(60 * 14 * 2);
  expect(result.height).toBeGreaterThan(60 * 14 * 2);
  expect(result.pixel[3]).toBe(255);
  expect(result.pixel.slice(0, 3)).not.toEqual([255, 255, 255]); // a coloured cell
  expect(result.corner).toEqual([255, 255, 255, 255]); // white background
  expect(result.sameView).toBe(true);
  expect(result.sameSize).toBe(true);
  expect(result.svgStart).toBe("<svg");
  expect(result.svgLabels).toBeGreaterThanOrEqual(122); // 60 row + 60 column labels + legend
  expect(result.svgHasImage).toBe(true);
  expect(result.svgHasTrees).toBe(2);
  expect(result.svgHasGene).toBe(true);

  // The buttons download files.
  const [png] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export PNG" }).click()]);
  expect(png.suggestedFilename()).toMatch(/^heatmap-.*\.png$/);
  const [svgFile] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export SVG" }).click()]);
  expect(svgFile.suggestedFilename()).toMatch(/^heatmap-.*\.svg$/);
  expect(await errors()).toEqual([]);
});

test("the addresses of the retired renderers lead to the correlation page", async ({ page }) => {
  await mockApi(page);
  for (const old of ["/correlation-fast", "/correlation-webgl"]) {
    await page.goto(old);
    await expect(page).toHaveURL(/\/correlation(\?|$)/);
    await expect(page.locator('[data-tour="run"]').first()).toBeVisible();
  }
});

test("the Heatmap page draws with the cluster heatmap too", async ({ page }) => {
  const errors = watchErrors(page);
  await mockApi(page);
  await page.goto("/heatmap");
  // Fill every list of the page from its example, then run.
  const examples = page.locator('[data-tour="example"]');
  const count = await examples.count();
  for (let i = 0; i < count; i++) {
    await examples.nth(i).click();
    await page.getByRole("menuitem").first().click();
  }
  await page.locator('[data-tour="run"] button').first().click();
  await expect(page.locator("[data-cluster-heatmap] canvas").first()).toBeVisible();
  // fixtures/task_heatMap.json: expression of the example genes under the example perturbations
  const drawn = await withHeatmap(page, (hm) => ({ rows: hm._nRows, cols: hm._nCols, mode: hm._mode, range: hm._range }));
  expect(drawn.rows).toBeGreaterThan(5);
  expect(drawn.cols).toBeGreaterThan(5);
  expect(drawn.mode).toBe("gl");
  expect(drawn.range.mid).toBe(0); // z-scores of both signs: centred on zero
  expect(await errors()).toEqual([]);
});

test("result table: gene links, export of the rows as filtered", async ({ page }) => {
  const fs = require("fs");
  const errors = watchErrors(page);
  await openHeatmap(page);
  await page.getByText("Table", { exact: true }).first().click();

  // Gene symbols open the gene page.
  const link = page.locator('a[href*="/gene?symbol="]').first();
  await expect(link).toBeVisible();
  expect(await link.getAttribute("target")).toBe("_blank");

  // The export is real CSV and holds only the rows that pass the filter.
  const symbol = (await link.textContent()).trim();
  await page.getByPlaceholder("Symbol").first().fill(symbol);
  await page.waitForTimeout(600);
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "CSV" }).first().click(),
  ]);
  expect(file.suggestedFilename()).toMatch(/^genesetr_table-.*\.csv$/);
  const lines = fs.readFileSync(await file.path(), "utf-8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  expect(lines[0]).toBe("Gene 1,Gene 2,Score");
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.length).toBeLessThan(200); // far fewer than all 60 x 59 pairs
  // (the column filter is a fuzzy match, so near-identical symbols may pass too)
  expect(lines.slice(1).some((line) => line.split(",")[0] === symbol)).toBe(true);
  expect(await errors()).toEqual([]);
});

module.exports = { openHeatmap, withHeatmap, treeNodePoint };
