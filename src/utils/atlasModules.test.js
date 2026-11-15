/**
 * @jest-environment node
 */
import { CONTEXT_EXPORT_COLUMNS, PREDICTION_EXPORT_COLUMNS, STABLE_FROM, moduleContexts, specificText, stabilityText } from "./atlas";

describe("stability of a module", () => {
  it("is said in words with the number", () => {
    expect(stabilityText(0.93)).toBe("stable (0.93)");
    expect(stabilityText(0.5)).toBe("stable (0.50)");
    expect(stabilityText(0.32)).toBe("depends on the settings (0.32)");
    expect(stabilityText(0)).toBe("depends on the settings (0.00)");
    expect(STABLE_FROM).toBe(0.5);
  });

  it("is left out when the module carries none", () => {
    expect(stabilityText(undefined)).toBe("");
    expect(stabilityText(null)).toBe("");
    expect(stabilityText(NaN)).toBe("");
  });
});

describe("cell contexts of a knock-down module", () => {
  const MODULE = {
    specificTo: "CD4 T",
    contexts: [
      { context: "Calu-3", measured: 0.02, active: 1.0 },
      { context: "CD4 T", measured: 1.0, active: 0.92 },
      { context: "Jurkat", measured: 0.1, active: 0.5 },
      { context: "K562", measured: 0.94, active: 0.05 },
      { context: "iPSC", measured: 0.73, active: 0.0 },
    ],
  };

  it("names the context a module is specific to", () => {
    expect(specificText(MODULE)).toBe("specific to CD4 T");
    expect(specificText({ specificTo: null })).toBe("");
    expect(specificText(undefined)).toBe("");
  });

  it("lists the contexts that perturbed at least half of the members first", () => {
    const rows = moduleContexts(MODULE);
    expect(rows.map((row) => row.context)).toEqual(["CD4 T", "K562", "iPSC", "Calu-3", "Jurkat"]);
    expect(rows.map((row) => row.covered)).toEqual([true, true, true, false, false]);
    expect(rows.filter((row) => row.specific).map((row) => row.context)).toEqual(["CD4 T"]);
    CONTEXT_EXPORT_COLUMNS.forEach((column) => expect(rows[0]).toHaveProperty(column.accessorKey));
  });

  it("gives nothing for a programme of co-regulated genes", () => {
    expect(moduleContexts({ contexts: [], specificTo: null })).toEqual([]);
    expect(moduleContexts(undefined)).toEqual([]);
  });
});

describe("neighbour wording", () => {
  it("names the promoter distance, not the chromosome band", () => {
    const header = PREDICTION_EXPORT_COLUMNS.find((column) => column.accessorKey === "neighbours").header;
    expect(header).toBe("Partners with a promoter within 5 kb");
  });
});
