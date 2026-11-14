/**
 * @jest-environment node
 */
import { parseDeText } from "./deTable";

describe("parseDeText", () => {
  test("DESeq2 CSV written by R (row names without a header cell)", () => {
    const text = [
      '"baseMean","log2FoldChange","lfcSE","stat","pvalue","padj"',
      '"ATF4",120.5,2.1,0.2,10.5,1e-20,1e-18',
      '"DDIT3",80,1.5,0.3,5,1e-6,0.001',
      '"XBP1",300,-0.4,0.2,-2,0.04,0.2',
      '"BAD",1,NA,NA,NA,NA,NA',
    ].join("\n");
    const all = parseDeText(text);
    expect(all.format).toBe("table");
    expect(all.valueColumn).toBe("stat"); // the statistic is preferred over the fold change
    expect(all.signature).toEqual([["ATF4", 10.5], ["DDIT3", 5], ["XBP1", -2]]);
    expect(all.skipped).toBe(1);

    const significant = parseDeText(text, { maxPadj: 0.05 });
    expect(significant.padjColumn).toBe("padj");
    expect(significant.signature.map((row) => row[0])).toEqual(["ATF4", "DDIT3"]);
  });

  test("edgeR / Seurat style TSV with a gene column", () => {
    const text = "gene\tlogFC\tFDR\natf4\t2.5\t0.001\nxbp1\t-1.25\t0.5\n";
    const parsed = parseDeText(text);
    expect(parsed.geneColumn).toBe("gene");
    expect(parsed.valueColumn).toBe("logfc");
    expect(parsed.signature).toEqual([["ATF4", 2.5], ["XBP1", -1.25]]);
  });

  test("two columns without a header", () => {
    expect(parseDeText("ATF4 2\nDDIT3 1.5\nXBP1 -1").signature).toEqual([["ATF4", 2], ["DDIT3", 1.5], ["XBP1", -1]]);
  });

  test("gene list and signature formula", () => {
    expect(parseDeText("ATF4\nDDIT3\n").signature).toEqual([["ATF4", 1], ["DDIT3", 1]]);
    const formula = parseDeText("ATF4+DDIT3-TUBB-PTMA");
    expect(formula.format).toBe("list");
    expect(formula.signature).toEqual([["ATF4", 1], ["DDIT3", 1], ["TUBB", -1], ["PTMA", -1]]);
  });

  test("clear errors", () => {
    expect(() => parseDeText("")).toThrow(/Nothing to read/);
    expect(() => parseDeText("gene,description\nATF4,a factor\n")).toThrow();
    expect(() => parseDeText("gene,weird\nATF4,1\n")).toThrow(/value column/);
  });
});
