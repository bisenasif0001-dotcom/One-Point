// ═══════════════════════════════════════════════════════════
//  OnePoint Digital Services — Google Sheets Integration
//
//  Setup karne ke steps:
//  1. sheets.google.com pe nayi Sheet banao, naam rakho "Orders"
//  2. Extensions → Apps Script
//  3. Yeh poora code paste karo (purana hata do)
//  4. Ek baar "setupSheet" function run karo (header banane ke liye)
//  5. Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone
//  6. URL copy karo aur app.js mein OPDS_SHEET_URL mein paste karo
// ═══════════════════════════════════════════════════════════

const SHEET_NAME = "Orders";

// ── Headers columns ka order
const COLS = {
  ORDER_ID:    1,
  NAME:        2,
  MOBILE:      3,
  EMAIL:       4,
  SERVICE:     5,
  STATUS:      6,
  STEP:        7,
  ADDRESS:     8,
  PINCODE:     9,
  DISTRICT:    10,
  STATE:       11,
  NOTES:       12,
  DRIVE_LINK:  13,
  CREATED_AT:  14,
  UPDATED_AT:  15
};

function doPost(e) {
  try {
    const sheet = getOrderSheet();
    const data  = e.parameter;
    const now   = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy HH:mm:ss");
    const oid   = (data.orderId || "").trim();

    if (!oid) {
      return reply("error: no orderId");
    }

    // ── Existing row dhundo (Order ID se)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const orderIds = sheet.getRange(2, COLS.ORDER_ID, lastRow - 1, 1).getValues().flat();
      const rowIndex = orderIds.indexOf(oid);
      if (rowIndex !== -1) {
        const rowNum = rowIndex + 2;
        // Sirf wahi cells update karo jo bheje gaye hain
        updateCell(sheet, rowNum, COLS.UPDATED_AT, now);
        if (data.status)    updateCell(sheet, rowNum, COLS.STATUS,    data.status);
        if (data.step)      updateCell(sheet, rowNum, COLS.STEP,      data.step);
        if (data.address)   updateCell(sheet, rowNum, COLS.ADDRESS,   data.address);
        if (data.pincode)   updateCell(sheet, rowNum, COLS.PINCODE,   data.pincode);
        if (data.district)  updateCell(sheet, rowNum, COLS.DISTRICT,  data.district);
        if (data.state)     updateCell(sheet, rowNum, COLS.STATE,     data.state);
        if (data.notes)     updateCell(sheet, rowNum, COLS.NOTES,     data.notes);
        if (data.driveLink) updateCell(sheet, rowNum, COLS.DRIVE_LINK,data.driveLink);
        // Status ke hisaab se row ka color change karo
        colorRow(sheet, rowNum, data.status || "");
        return reply("updated:" + oid);
      }
    }

    // ── Nayi row append karo
    const newRow = new Array(15).fill("");
    newRow[COLS.ORDER_ID   - 1] = oid;
    newRow[COLS.NAME       - 1] = data.name     || "";
    newRow[COLS.MOBILE     - 1] = data.mobile   || "";
    newRow[COLS.EMAIL      - 1] = data.email    || "";
    newRow[COLS.SERVICE    - 1] = data.service  || "";
    newRow[COLS.STATUS     - 1] = data.status   || "New Lead";
    newRow[COLS.STEP       - 1] = data.step     || "lead";
    newRow[COLS.ADDRESS    - 1] = data.address  || "";
    newRow[COLS.PINCODE    - 1] = data.pincode  || "";
    newRow[COLS.DISTRICT   - 1] = data.district || "";
    newRow[COLS.STATE      - 1] = data.state    || "";
    newRow[COLS.NOTES      - 1] = data.notes    || "";
    newRow[COLS.DRIVE_LINK - 1] = data.driveLink|| "";
    newRow[COLS.CREATED_AT - 1] = now;
    newRow[COLS.UPDATED_AT - 1] = now;

    sheet.appendRow(newRow);
    const addedRow = sheet.getLastRow();
    colorRow(sheet, addedRow, data.status || "New Lead");
    return reply("created:" + oid);

  } catch (err) {
    return reply("error:" + err.message);
  }
}

// ── Helpers
function getOrderSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
}

function updateCell(sheet, row, col, value) {
  sheet.getRange(row, col).setValue(value);
}

function reply(msg) {
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}

function colorRow(sheet, rowNum, status) {
  const colors = {
    "New Lead":       "#fff9e6",   // Light yellow
    "Form Submitted": "#e8f4fd",   // Light blue
    "Under Review":   "#fff3cd",   // Amber
    "Payment Done":   "#d4edda",   // Green
    "Completed":      "#c3e6cb",   // Dark green
    "Cancelled":      "#f8d7da"    // Red
  };
  const bg = colors[status] || "#ffffff";
  sheet.getRange(rowNum, 1, 1, 15).setBackground(bg);
}

// ── Pehli baar run karo: headers + formatting set karo
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const headers = [
    "Order ID", "Name", "Mobile", "Email", "Service",
    "Status", "Step", "Address", "PIN Code", "District",
    "State", "Notes", "Drive Link", "Created At", "Updated At"
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight("bold")
             .setBackground("#0c2d54")
             .setFontColor("#ffffff")
             .setFontSize(11);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);   // Order ID
  sheet.setColumnWidth(2, 140);   // Name
  sheet.setColumnWidth(3, 120);   // Mobile
  sheet.setColumnWidth(4, 170);   // Email
  sheet.setColumnWidth(5, 160);   // Service
  sheet.setColumnWidth(6, 130);   // Status
  sheet.setColumnWidth(7, 100);   // Step
  sheet.setColumnWidth(8, 200);   // Address
  sheet.setColumnWidth(9, 90);    // PIN
  sheet.setColumnWidth(10, 120);  // District
  sheet.setColumnWidth(11, 130);  // State
  sheet.setColumnWidth(12, 200);  // Notes
  sheet.setColumnWidth(13, 200);  // Drive Link
  sheet.setColumnWidth(14, 150);  // Created At
  sheet.setColumnWidth(15, 150);  // Updated At

  SpreadsheetApp.getUi().alert("✅ Sheet setup complete!\n\nAb Deploy karke URL copy karo.");
}
