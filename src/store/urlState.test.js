/**
 * @jest-environment node
 */
import { ROUTES } from "../common/routes";
import { settingsReducer } from "./settings";
import { applySnapshot, queryToSnapshot, snapshotToQuery, takeSnapshot } from "./urlState";

// The settings slices import the API client, which needs a browser
jest.mock("./api", () => ({ fetchDatasets: jest.fn() }));

const defaults = () => settingsReducer(undefined, { type: "@@test/init" });

// Minimal store: enough for the applySnapshot thunk
const makeStore = () => {
  let settings = defaults();
  const getState = () => ({ settings });
  const dispatch = (action) => {
    if (typeof action === "function") return action(dispatch, getState);
    settings = settingsReducer(settings, action);
    return action;
  };
  return { dispatch, getState };
};

const withDatasets = (store) =>
  store.dispatch({
    type: "core/coreSettingsChanged",
    payload: {
      settingName: "datasetList",
      newValue: [
        { id: "K562gwps", name: "K562 Whole Genome" },
        { id: "HCT116gwps", name: "HCT116 Whole Genome" },
      ],
    },
  });

describe("urlState", () => {
  test("default settings give only the dataset", () => {
    const query = snapshotToQuery(takeSnapshot(defaults(), ROUTES.GENE_REGULATION));
    expect(query).toBe("ds=K562gwps");
  });

  test("settings survive a round trip through the address", () => {
    const first = makeStore();
    withDatasets(first);
    first.dispatch({ type: "core/coreSettingsChanged", payload: { settingName: "peturbationList", newValue: "ATF4\nDDIT3\nXBP1" } });
    first.dispatch({ type: "correlation/correlationSettingsChanged", payload: { settingName: "corrType", newValue: "pearson" } });
    first.dispatch({ type: "correlation/correlationSettingsChanged", payload: { settingName: "selectedDatasets", newValue: ["K562gwps", "HCT116gwps"] } });
    first.dispatch({ type: "correlation/correlationSettingsChanged", payload: { settingName: "trimThreshold", newValue: 0.25 } });

    const query = snapshotToQuery(takeSnapshot(first.getState().settings, ROUTES.CORRELATION));
    expect(query).toContain("genes=ATF4%2CDDIT3%2CXBP1");

    const second = makeStore();
    withDatasets(second);
    second.dispatch(applySnapshot(queryToSnapshot(`?${query}`, ROUTES.CORRELATION)));
    const { core, correlation } = second.getState().settings;
    expect(core.peturbationList).toBe("ATF4\nDDIT3\nXBP1");
    expect(correlation.corrType).toBe("pearson");
    expect(correlation.selectedDatasets).toEqual(["K562gwps", "HCT116gwps"]);
    expect(correlation.trimThreshold).toBe(0.25);
  });

  test("the dataset is selected by id from the loaded list", () => {
    const store = makeStore();
    withDatasets(store);
    store.dispatch(applySnapshot(queryToSnapshot("?ds=hct116gwps", ROUTES.HEATMAP)));
    expect(store.getState().settings.core.cellLine.name).toBe("HCT116 Whole Genome");
  });

  test("a signature formula keeps its signs", () => {
    const store = makeStore();
    store.dispatch(applySnapshot(queryToSnapshot("?targets=ATF4%2BDDIT3-XBP1", ROUTES.GENESIGNATURE)));
    expect(store.getState().settings.core.targetGeneList).toBe("ATF4+DDIT3-XBP1");
  });

  test("unknown slices and settings in an address are ignored", () => {
    const store = makeStore();
    const before = JSON.stringify(store.getState().settings);
    const snapshot = queryToSnapshot("?correlation.notASetting=1&pathfinder.depth=3&evil.x=1", ROUTES.CORRELATION);
    expect(snapshot).toBeNull();
    store.dispatch(applySnapshot({ core: {}, slices: { evil: { x: 1 }, core: { sessionId: "x" }, correlation: { notASetting: 1 } } }));
    expect(JSON.stringify(store.getState().settings)).toBe(before);
  });

  test("very long gene lists are left out of the address but kept in full snapshots", () => {
    const store = makeStore();
    const genes = Array.from({ length: 800 }, (_, i) => `GENE${i}`).join("\n");
    store.dispatch({ type: "core/coreSettingsChanged", payload: { settingName: "peturbationList", newValue: genes } });
    const settings = store.getState().settings;
    expect(snapshotToQuery(takeSnapshot(settings, ROUTES.HEATMAP))).not.toContain("genes=");
    expect(takeSnapshot(settings, ROUTES.HEATMAP, { full: true }).core.peturbationList).toBe(genes);
  });

  describe("drug datasets", () => {
    const drugDataset = { id: "TahoeAll", name: "Tahoe-100M, all doses", perturbationKind: "drug", drugTable: "dose" };
    const drugs = "5-FLUOROURACIL\nR-VERAPAMIL-HYDROCHLORIDE-0.5UM\nBORTEZOMIB-0.05UM";
    const drugStore = () => {
      const store = makeStore();
      store.dispatch({
        type: "core/coreSettingsChanged",
        payload: { settingName: "datasetList", newValue: [{ id: "K562gwps", name: "K562 Whole Genome" }, drugDataset] },
      });
      return store;
    };
    const set = (store, settingName, newValue) =>
      store.dispatch({ type: "core/coreSettingsChanged", payload: { settingName, newValue } });

    test("drug ids in the first list keep their hyphens", () => {
      const first = drugStore();
      set(first, "cellLine", drugDataset);
      set(first, "peturbationList", drugs);
      const query = snapshotToQuery(takeSnapshot(first.getState().settings, ROUTES.CORRELATION));
      expect(new URLSearchParams(query).get("genes")).toBe(
        "5-FLUOROURACIL,R-VERAPAMIL-HYDROCHLORIDE-0.5UM,BORTEZOMIB-0.05UM"
      );

      const second = drugStore();
      second.dispatch(applySnapshot(queryToSnapshot(`?${query}`, ROUTES.CORRELATION)));
      const { core } = second.getState().settings;
      expect(core.cellLine.id).toBe("TahoeAll");
      expect(core.peturbationList).toBe(drugs);
    });

    test("a drug list in the second list is not read as a signature formula", () => {
      const first = drugStore();
      set(first, "cellLine", drugDataset);
      set(first, "dataType", "genes");
      set(first, "targetGeneList", drugs);
      const query = snapshotToQuery(takeSnapshot(first.getState().settings, ROUTES.CORRELATION));
      const params = new URLSearchParams(query);
      expect(params.get("targets")).toBe("5-FLUOROURACIL,R-VERAPAMIL-HYDROCHLORIDE-0.5UM,BORTEZOMIB-0.05UM");
      expect(params.get("tk")).toBe("drug");

      const second = drugStore();
      second.dispatch(applySnapshot(queryToSnapshot(`?${query}`, ROUTES.CORRELATION)));
      expect(second.getState().settings.core.targetGeneList).toBe(drugs);
      // and the address written from the restored settings is the same one
      expect(snapshotToQuery(takeSnapshot(second.getState().settings, ROUTES.CORRELATION))).toBe(query);
    });

    test("a signature formula on a drug dataset still keeps its signs", () => {
      const store = drugStore();
      set(store, "cellLine", drugDataset);
      set(store, "targetGeneList", "ATF4+DDIT3-XBP1");
      const query = snapshotToQuery(takeSnapshot(store.getState().settings, ROUTES.GENESIGNATURE));
      expect(new URLSearchParams(query).get("targets")).toBe("ATF4+DDIT3-XBP1");
      expect(new URLSearchParams(query).has("tk")).toBe(false);
    });

    test("genetic datasets are unchanged: a hyphenated second list stays as it was", () => {
      const store = makeStore();
      set(store, "targetGeneList", "HLA-A\nMT-CO1");
      const query = snapshotToQuery(takeSnapshot(store.getState().settings, ROUTES.HEATMAP));
      expect(new URLSearchParams(query).has("tk")).toBe(false);
    });
  });

  test("key order does not make equal settings look different", () => {
    const store = makeStore();
    const scale = store.getState().settings.inchlib.color_scale;
    if (scale && typeof scale === "object") {
      const reordered = Object.keys(scale).reverse().reduce((o, k) => ({ ...o, [k]: scale[k] }), {});
      store.dispatch({ type: "inchlib/inchlibSettingsChanged", payload: { settingName: "color_scale", newValue: reordered } });
      expect(takeSnapshot(store.getState().settings, ROUTES.CORRELATION).slices.inchlib?.color_scale).toBeUndefined();
    }
  });
});
