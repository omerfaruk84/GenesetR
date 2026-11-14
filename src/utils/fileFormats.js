/**
 * Small writers for binary file formats, so the application can offer real
 * .xlsx and .pdf downloads without extra libraries.
 *
 *  - zipStore:   ZIP archive without compression
 *  - rowsToXlsx: one-sheet Excel workbook (numbers stay numbers)
 *  - jpegToPdf:  one-page PDF that holds a JPEG image at full page size
 *
 * Everything returns a Uint8Array.
 */

const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const concat = (parts) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
};

// fields: [value, byteCount] pairs, written little endian
const record = (fields) => {
  const out = new Uint8Array(fields.reduce((sum, [, size]) => sum + size, 0));
  const view = new DataView(out.buffer);
  let offset = 0;
  fields.forEach(([value, size]) => {
    if (size === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
    offset += size;
  });
  return out;
};

/** ZIP archive (stored, not compressed) of [{ name, data: string | Uint8Array }]. */
export const zipStore = (files) => {
  const local = [];
  const central = [];
  let offset = 0;
  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const data = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const crc = crc32(data);
    // flags: UTF-8 names; method 0 (stored); fixed date 1 Jan 2020
    const common = [[0x0800, 2], [0, 2], [0, 2], [0x5021, 2], [crc, 4], [data.length, 4], [data.length, 4], [name.length, 2], [0, 2]];
    const header = record([[0x04034b50, 4], [20, 2], ...common]);
    local.push(header, name, data);
    central.push(
      record([[0x02014b50, 4], [20, 2], [20, 2], ...common, [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]]),
      name
    );
    offset += header.length + name.length + data.length;
  });
  const directory = concat(central);
  const end = record([
    [0x06054b50, 4], [0, 2], [0, 2], [files.length, 2], [files.length, 2], [directory.length, 4], [offset, 4], [0, 2],
  ]);
  return concat([...local, directory, end]);
};

const XML_ESCAPES = { "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" };

const xmlText = (value) =>
  String(value)
    // Control characters are not allowed in XML 1.0
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/[<>&"]/g, (c) => XML_ESCAPES[c]);

const columnName = (index) => {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
};

const XML_HEAD = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>";
const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT = "application/vnd.openxmlformats-officedocument.spreadsheetml";

/**
 * Excel workbook with one sheet.
 *   header: array of column titles
 *   rows:   array of arrays; finite numbers become numeric cells, everything
 *           else text (null and undefined stay empty)
 */
export const rowsToXlsx = (header, rows, { sheetName = "GeneSetR" } = {}) => {
  const cell = (value, column, row, bold) => {
    const ref = `${columnName(column)}${row}`;
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
    if (typeof value === "boolean") return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
    // Excel refuses cells above 32767 characters
    const text = xmlText(String(value).slice(0, 32000));
    return `<c r="${ref}" t="inlineStr"${bold ? " s=\"1\"" : ""}><is><t xml:space="preserve">${text}</t></is></c>`;
  };
  const line = (values, row, bold) =>
    `<row r="${row}">${values.map((value, column) => cell(value, column, row, bold)).join("")}</row>`;
  const sheet =
    `${XML_HEAD}<worksheet xmlns="${NS_MAIN}">` +
    "<sheetViews><sheetView workbookViewId=\"0\">" +
    "<pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/>" +
    "</sheetView></sheetViews>" +
    `<sheetData>${line(header, 1, true)}${rows.map((values, index) => line(values, index + 2, false)).join("")}</sheetData>` +
    "</worksheet>";
  const safeSheetName = xmlText(String(sheetName).replace(/[\\/?*[\]:]/g, " ").slice(0, 31)) || "Sheet1";
  return zipStore([
    {
      name: "[Content_Types].xml",
      data:
        `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
        "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
        `<Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${CT}.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/>` +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      data:
        `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">` +
        `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
        "</Relationships>",
    },
    {
      name: "xl/workbook.xml",
      data:
        `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
        `<sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets>` +
        "</workbook>",
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data:
        `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">` +
        `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/>` +
        "</Relationships>",
    },
    {
      name: "xl/styles.xml",
      data:
        `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">` +
        "<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font>" +
        "<font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>" +
        "<fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill>" +
        "<fill><patternFill patternType=\"gray125\"/></fill></fills>" +
        "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>" +
        "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>" +
        "<cellXfs count=\"2\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>" +
        "<xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"/></cellXfs>" +
        "<cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles>" +
        "</styleSheet>",
    },
    { name: "xl/worksheets/sheet1.xml", data: sheet },
  ]);
};

/** Width, height and number of colour components of a JPEG, or null. */
export const jpegSize = (bytes) => {
  if (!bytes || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    // Start-of-frame markers, except DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
        components: bytes[offset + 9],
      };
    }
    offset += 2 + length;
  }
  return null;
};

/**
 * One-page PDF that shows a JPEG over the whole page.
 *   widthPt / heightPt: page size in points (1/72 inch)
 */
export const jpegToPdf = (jpeg, widthPt, heightPt) => {
  const size = jpegSize(jpeg);
  if (!size) throw new Error("Not a JPEG image");
  const w = Math.round(widthPt * 100) / 100;
  const h = Math.round(heightPt * 100) / 100;
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  const colorSpace = size.components === 1 ? "/DeviceGray" : size.components === 4 ? "/DeviceCMYK" : "/DeviceRGB";
  const objects = [
    encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"),
    encoder.encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    encoder.encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
    ),
    concat([
      encoder.encode(
        `<< /Type /XObject /Subtype /Image /Width ${size.width} /Height ${size.height} /ColorSpace ${colorSpace}` +
          ` /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
      ),
      jpeg,
      encoder.encode("\nendstream"),
    ]),
    encoder.encode(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
  ];
  // The second line marks the file as binary for transfer programs
  const parts = [concat([encoder.encode("%PDF-1.4\n%"), new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3, 0x0a])])];
  const offsets = [];
  let position = parts[0].length;
  objects.forEach((body, index) => {
    const head = encoder.encode(`${index + 1} 0 obj\n`);
    const tail = encoder.encode("\nendobj\n");
    offsets.push(position);
    parts.push(head, body, tail);
    position += head.length + body.length + tail.length;
  });
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`;
  parts.push(encoder.encode(xref));
  return concat(parts);
};
