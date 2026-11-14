/**
 * @jest-environment node
 */
import { crc32, jpegSize, jpegToPdf, rowsToXlsx, zipStore } from "./fileFormats";

const text = (bytes) => Buffer.from(bytes).toString("latin1");

describe("zipStore", () => {
  test("crc32 matches the reference value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  test("archive lists every file with its size", () => {
    const zip = zipStore([
      { name: "a.txt", data: "hello" },
      { name: "dir/b.bin", data: new Uint8Array([1, 2, 3]) },
    ]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    // End of central directory: 22 bytes from the end
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const directoryOffset = view.getUint32(end + 16, true);
    expect(view.getUint32(directoryOffset, true)).toBe(0x02014b50);
    // First local header: sizes at 18 and 22, name length at 26, data follows the name
    expect(view.getUint32(18, true)).toBe(5);
    expect(view.getUint16(26, true)).toBe(5);
    expect(text(zip.slice(30, 35))).toBe("a.txt");
    expect(text(zip.slice(35, 40))).toBe("hello");
  });
});

describe("rowsToXlsx", () => {
  const workbook = text(
    rowsToXlsx(["Gene", "Score", "Note"], [
      ["ATF4", 1.5, "a < b & c"],
      ["DDIT3", null, true],
    ])
  );

  test("holds the parts Excel needs", () => {
    ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/styles.xml"].forEach((part) =>
      expect(workbook).toContain(part)
    );
  });

  test("numbers are numeric cells, text is escaped, empty cells are left out", () => {
    expect(workbook).toContain("<c r=\"B2\"><v>1.5</v></c>");
    expect(workbook).toContain("a &lt; b &amp; c");
    expect(workbook).toContain("<c r=\"A3\" t=\"inlineStr\"><is><t xml:space=\"preserve\">DDIT3</t></is></c>");
    expect(workbook).not.toContain("r=\"B3\"");
    expect(workbook).toContain("<c r=\"C3\" t=\"b\"><v>1</v></c>");
  });
});

describe("jpegToPdf", () => {
  // Smallest useful JPEG skeleton: SOI, APP0, SOF0 (3 x 2 pixels, 3 components)
  const jpeg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x03, 0x03, 0x01, 0x11,
    0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
  ]);

  test("reads the image size", () => {
    expect(jpegSize(jpeg)).toEqual({ width: 3, height: 2, components: 3 });
    expect(jpegSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  test("writes a page of the requested size with correct object offsets", () => {
    const pdf = text(jpegToPdf(jpeg, 300, 200));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("/MediaBox [0 0 300 200]");
    expect(pdf).toContain("/Width 3 /Height 2 /ColorSpace /DeviceRGB");
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(/startxref\n(\d+)/.exec(pdf)[1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
    const offsets = [...pdf.matchAll(/(\d{10}) 00000 n /g)].map((match) => Number(match[1]));
    expect(offsets).toHaveLength(5);
    offsets.forEach((offset, index) => expect(pdf.slice(offset, offset + 7)).toBe(`${index + 1} 0 obj`));
  });

  test("rejects other data", () => {
    expect(() => jpegToPdf(new Uint8Array([0, 1, 2]), 10, 10)).toThrow("Not a JPEG");
  });
});
