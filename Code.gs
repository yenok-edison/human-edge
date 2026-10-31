/**
 * THE HUMAN EDGE – Google Apps Script backend
 * Saves form data to a Google Sheet and uploaded files to a Google Drive folder.
 *
 * SETUP (5 minutes)
 * 1. Create a Google Sheet (e.g. "Human Edge Submissions"). Copy its ID from the URL:
 *    docs.google.com/spreadsheets/d/<SHEET_ID>/edit
 * 2. Create a Google Drive folder (e.g. "Human Edge Uploads"). Copy its ID from the URL:
 *    drive.google.com/drive/folders/<FOLDER_ID>
 * 3. In the Sheet: Extensions > Apps Script. Paste this whole file, fill the two IDs below.
 * 4. Deploy > New deployment > type "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 *    Authorise when asked, then copy the Web app URL.
 * 5. Paste that URL into CONFIG.SCRIPT_URL in index.html.
 * NOTE: After any later edit to this script, use Deploy > Manage deployments > Edit > New version.
 */

const SHEET_ID  = "1-LLrOFokiWNmdYd8LEGj0ftSFLHX4wsBgqyl8BiML0w";
const FOLDER_ID = "17h56tO4-0rAM-HOdD7SWR05KTRTAG59T";
const SHEET_TAB = "Submissions";
const NOTIFY_EMAIL = "yenok@iktaraa.com";   // optional: your email to get an alert for each submission

const HEADERS = ["Reference","Timestamp","Name","Email","Phone","Designation","Organisation",
                 "City","Paper Title","Theme","Format","File Name","File Link"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const d = JSON.parse(e.postData.contents);

    // Server-side validation
    ["name","email","phone","designation","organisation","city","title","theme","format","fileName","fileData"]
      .forEach(k => { if (!d[k] || !String(d[k]).trim()) throw new Error("Missing field: " + k); });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new Error("Invalid email");
    const ext = d.fileName.split(".").pop().toLowerCase();
    if (["pdf","doc","docx","jpg","jpeg","png"].indexOf(ext) < 0) throw new Error("File type not allowed");

    // Reference ID
    const ref = "HE26-" + Utilities.formatDate(new Date(), "Asia/Kolkata", "MMdd") + "-" +
                Math.random().toString(36).substring(2, 7).toUpperCase();

    // Save file to Drive, organised by format and renamed with the reference
    const root = DriveApp.getFolderById(FOLDER_ID);
    const sub = getOrCreate_(root, d.format);
    const safeName = ref + "_" + d.name.replace(/[^\w\- ]/g, "").trim().replace(/\s+/g, "_") + "." + ext;
    const blob = Utilities.newBlob(Utilities.base64Decode(d.fileData), d.mimeType, safeName);
    const saved = sub.createFile(blob);
    saved.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);  // remove this line to keep files private
    const link = saved.getUrl();

    // Save row to Sheet
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName(SHEET_TAB) || ss.insertSheet(SHEET_TAB);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#50144a").setFontColor("#ffffff");
      sh.setFrozenRows(1);
    }
    sh.appendRow([ref, new Date(), d.name, d.email, "'" + d.phone, d.designation, d.organisation,
                  d.city, d.title, d.theme, d.format, safeName, link]);

    // Optional emails
    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, "New Human Edge submission: " + ref,
        d.name + " (" + d.organisation + ")\n" + d.format + " | " + d.theme + "\n" + d.title + "\n" + link);
    }
    MailApp.sendEmail(d.email, "We received your submission – The Human Edge",
      "Dear " + d.name + ",\n\nThank you for submitting \"" + d.title + "\" to The Human Edge, " +
      "a national conference by Trinity College London.\nYour reference number is " + ref + ".\n\n" +
      "We will be in touch after the review.\n\nThe Human Edge Team");

    return json_({ ok: true, ref: ref });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() { return json_({ ok: true, status: "Human Edge endpoint is live" }); }

function getOrCreate_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
