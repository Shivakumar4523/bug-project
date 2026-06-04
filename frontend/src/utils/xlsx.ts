type CellValue = string | number | boolean | null | undefined;

type ZipRecord = {
  path: string;
  name: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
};

const encoder = new TextEncoder();

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(data: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of data) value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  return (value ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function localHeader(record: ZipRecord, modified: ReturnType<typeof dosDateTime>) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(10, modified.time, true);
  view.setUint16(12, modified.date, true);
  view.setUint32(14, record.crc, true);
  view.setUint32(18, record.data.length, true);
  view.setUint32(22, record.data.length, true);
  view.setUint16(26, record.name.length, true);
  return concat([header, record.name, record.data]);
}

function centralHeader(record: ZipRecord, modified: ReturnType<typeof dosDateTime>) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(12, modified.time, true);
  view.setUint16(14, modified.date, true);
  view.setUint32(16, record.crc, true);
  view.setUint32(20, record.data.length, true);
  view.setUint32(24, record.data.length, true);
  view.setUint16(28, record.name.length, true);
  view.setUint32(42, record.offset, true);
  return concat([header, record.name]);
}

function endOfCentralDirectory(recordCount: number, centralSize: number, centralOffset: number) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, recordCount, true);
  view.setUint16(10, recordCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return header;
}

function zip(files: { path: string; content: string }[]) {
  const modified = dosDateTime();
  let offset = 0;
  const localParts: Uint8Array[] = [];
  const records = files.map((file) => {
    const record: ZipRecord = {
      path: file.path,
      name: encoder.encode(file.path),
      data: encoder.encode(file.content),
      crc: 0,
      offset
    };
    record.crc = crc32(record.data);
    const localPart = localHeader(record, modified);
    localParts.push(localPart);
    offset += localPart.length;
    return record;
  });
  const centralOffset = offset;
  const central = concat(records.map((record) => centralHeader(record, modified)));
  return concat([...localParts, central, endOfCentralDirectory(records.length, central.length, centralOffset)]);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function cellXml(value: CellValue, rowIndex: number, columnIndex: number) {
  const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
  const text = escapeXml(String(value ?? ""));
  return `<c r="${reference}" t="inlineStr"><is><t>${text}</t></is></c>`;
}

function worksheetXml(rows: readonly (readonly CellValue[])[]) {
  const rowXml = rows
    .map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => cellXml(value, rowIndex, columnIndex)).join("")}</row>`)
    .join("");
  const columnCount = Math.max(...rows.map((row) => row.length), 1);
  const dimension = `A1:${columnName(columnCount - 1)}${Math.max(rows.length, 1)}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="24" customWidth="1"/>
    <col min="2" max="2" width="30" customWidth="1"/>
    <col min="3" max="6" width="18" customWidth="1"/>
  </cols>
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function safeSheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || "Sheet1";
}

export function createXlsx(sheetName: string, rows: readonly (readonly CellValue[])[]) {
  const name = escapeXml(safeSheetName(sheetName));
  return zip([
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      path: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
    },
    {
      path: "xl/worksheets/sheet1.xml",
      content: worksheetXml(rows)
    }
  ]);
}

export function downloadXlsx(filename: string, sheetName: string, rows: readonly (readonly CellValue[])[]) {
  const workbook = createXlsx(sheetName, rows);
  const blob = new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}
