const router   = require('express').Router();
const fs       = require('fs');
const path     = require('path');
const { parse } = require('csv-parse/sync');
const XLSX     = require('xlsx');
const Lead     = require('../models/Lead');
const Activity = require('../models/Activity');
const csvUpload = require('../middleware/csvUpload');
const { protect } = require('../middleware/auth');

// ── Valid enum values ──────────────────────────────────────────
const VALID_SOURCES  = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Conference', 'Other'];
const VALID_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'No Response', 'Interested'];
const VALID_TYPES    = ['Client Project', 'Student Training'];

// ── Flexible column aliases (case-insensitive) ─────────────────
const HEADER_MAP = {
  name:         ['name', 'full name', 'fullname', 'lead name', 'contact name',
                 'contact person', 'contactperson', 'person'],
  email:        ['email', 'email address', 'e-mail', 'email id', 'emailid'],
  phone:        ['phone', 'phone number', 'mobile', 'contact', 'contact number',
                 'mobile number', 'contact no', 'phone no', 'mob', 'mob no',
                 'mob number', 'cell', 'cell no', 'telephone', 'tel', 'tel no',
                 'mobile no', 'ph', 'ph no', 'whatsapp', 'whatsapp no',
                 'contact details', 'phone/mobile', 'mobile/phone'],
  company:      ['company', 'company name', 'organisation', 'organization',
                 'hospital name', 'hospital', 'clinic name', 'clinic',
                 'institution', 'institution name', 'firm', 'firm name'],
  value:        ['value', 'deal value', 'budget', 'amount'],
  source:       ['source', 'lead source'],
  status:       ['status', 'lead status'],
  leadType:     ['leadtype', 'lead type', 'type'],
  assignedTo:   ['assignedto', 'assigned to', 'assigned', 'sales exec', 'sales executive'],
  followUpDate: ['followupdate', 'follow up date', 'follow-up date', 'followup date'],
  course:       ['course', 'course name'],
  branch:       ['branch'],
  college:      ['college', 'college name'],
  year:         ['year', 'year of study'],
  trainingType: ['trainingtype', 'training type', 'training mode', 'mode'],
  projectType:  ['projecttype', 'project type'],
  techStack:    ['techstack', 'tech stack', 'technology', 'stack'],
  timeline:     ['timeline', 'expected timeline', 'duration'],
  // Client-specific fields
  contactPerson: ['contactperson_secondary', 'secondary contact', 'alt contact', 'doctor name', 'dr name'],
  pinCode:       ['pincode', 'pin code', 'pin', 'zip', 'zipcode', 'zip code', 'postal code'],
  typeOfCare:    ['typeofcare', 'type of care', 'care type', 'service type', 'care'],
  hospitalZone:  ['hospitalzone', 'hospital zone', 'zone', 'region'],
  tpaName:       ['tpaname', 'tpa name', 'tpa', 'third party', 'insurance', 'insurer'],
  city:          ['city', 'town'],
  state:         ['state', 'province'],
  address:       ['address', 'full address', 'location'],
  area:          ['area', 'locality', 'suburb'],
  rohiniId:      ['rohini id', 'rohini', 'rohiniid'],
};

// ── Parse any supported file into Array<Array<string>> ────────
function parseFileToRows(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parse(content, { relax_quotes: true, skip_empty_lines: true });
  }

  // .xlsx / .xls
  const workbook  = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet     = workbook.Sheets[sheetName];
  const allRows   = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Auto-detect header row: scan first 8 rows, pick the one whose cells
  // match the most known column keywords (handles title rows, logos, etc.)
  const KNOWN_KEYWORDS = [
    'name', 'contact', 'phone', 'mobile', 'email', 'company',
    'pin', 'zone', 'tpa', 'care', 'source', 'status', 'type',
    'college', 'course', 'branch', 'year', 'value', 'assigned',
  ];

  let headerRowIdx = 0;
  let bestScore    = -1;

  for (let i = 0; i < Math.min(8, allRows.length); i++) {
    const row      = allRows[i];
    const nonEmpty = row.filter(c => String(c).trim() !== '').length;
    const matches  = row.filter(c =>
      KNOWN_KEYWORDS.some(kw => String(c).toLowerCase().includes(kw))
    ).length;
    const score = matches * 10 + nonEmpty;
    if (score > bestScore) { bestScore = score; headerRowIdx = i; }
  }

  if (headerRowIdx > 0) {
    console.log(`🔍 [Import] Header auto-detected at row ${headerRowIdx + 1}`);
  }

  return allRows.slice(headerRowIdx);
}

// ── Build header map — also track ALL column indices per field (for multi-column TPA etc.) ──
function mapHeaders(rawHeaders) {
  const map    = {};   // field → first matched column index
  const multi  = {};   // field → all matched column indices
  rawHeaders.forEach((h, idx) => {
    const norm = String(h).trim().toLowerCase().replace(/\s+/g, ' ');
    for (const [field, aliases] of Object.entries(HEADER_MAP)) {
      if (aliases.includes(norm)) {
        if (map[field] === undefined) map[field] = idx;   // first occurrence
        multi[field] = [...(multi[field] || []), idx];    // all occurrences
        break;
      }
    }
  });
  return { map, multi };
}

// ── Helper to filter out placeholder values like "-", "NA", "nil", "none" ──────
function cleanValue(val) {
  if (!val) return '';
  const cleaned = String(val).trim();
  if (['na', 'n/a', 'nil', 'none', '-', '—', 'null', 'undefined'].includes(cleaned.toLowerCase())) {
    return '';
  }
  return cleaned;
}

// ── Extract mobile number from complex strings like "STD:(020) Tel:0 Fax:0 Mob:9822490044" ──
function extractPhone(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  // Excel numeric type — e.g. 9822490044 stored as number
  if (/^\d{7,15}$/.test(str)) return str.slice(0, 15);
  // Try to find Mob: / Mobile: number first
  const mobMatch = str.match(/[Mm]ob(?:ile)?\s*:?\s*(\d[\d\s-]{6,14})/);
  if (mobMatch) return mobMatch[1].replace(/[\s-]/g, '').slice(0, 15);
  // Tel: or Ph: pattern
  const telMatch = str.match(/(?:[Tt]el|[Pp]h(?:one)?)\s*:?\s*(\d[\d\s-]{6,14})/);
  if (telMatch) return telMatch[1].replace(/[\s-]/g, '').slice(0, 15);
  // Extract first digit sequence of 7+ digits
  const digits = str.replace(/[^\d]/g, '');
  return digits.length >= 7 ? digits.slice(0, 15) : str;
}

function parseRow(row, headerMap, multiMap) {
  const getRaw = (field) => {
    const idx = headerMap[field];
    return idx !== undefined ? String(row[idx] ?? '').trim() : '';
  };

  const get = (field) => cleanValue(getRaw(field));

  // Merge all TPA Name columns into one comma-separated value
  const tpaIndices = multiMap['tpaName'] || [];
  const tpaValue = tpaIndices
    .map(idx => cleanValue(row[idx]))
    .filter(Boolean)
    .join(', ');

  const source   = get('source');
  const status   = get('status');
  const leadType = get('leadType');

  const address = get('address');
  const area = get('area');
  const city = get('city');
  const state = get('state');
  const rohiniId = get('rohiniId');

  const extraNotes = [];
  if (rohiniId) extraNotes.push(`Rohini ID: ${rohiniId}`);
  if (address) extraNotes.push(`Address: ${address}`);
  if (area) extraNotes.push(`Area: ${area}`);
  if (city) extraNotes.push(`City: ${city}`);
  if (state) extraNotes.push(`State: ${state}`);

  const notesText = extraNotes.join('\n');
  const notes = notesText ? [{ text: notesText, time: new Date().toLocaleString() }] : [];

  const company = get('company');
  let name = get('name');
  if (!name && company) {
    name = company;
  }

  const phone = cleanValue(extractPhone(getRaw('phone')));
  const email = get('email').toLowerCase();

  return {
    name,
    email,
    phone,
    company,
    value:         get('value'),
    source:        VALID_SOURCES.includes(source)  ? source   : 'Other',
    status:        VALID_STATUSES.includes(status) ? status   : 'New',
    leadType:      VALID_TYPES.includes(leadType)  ? leadType : 'Client Project',
    assignedTo:    get('assignedTo'),
    followUpDate:  get('followUpDate'),
    // Student Training
    course:        get('course'),
    branch:        get('branch'),
    college:       get('college'),
    year:          get('year'),
    trainingType:  get('trainingType'),
    // Client Project
    projectType:   get('projectType'),
    techStack:     get('techStack'),
    timeline:      get('timeline'),
    // Client-specific
    contactPerson: name,
    pinCode:       get('pinCode'),
    typeOfCare:    get('typeOfCare'),
    hospitalZone:  get('hospitalZone'),
    tpaName:       tpaValue,
    notes,
  };
}

// ── POST /api/leads/import/preview ────────────────────────────
// Parse file, return first 10 rows for user confirmation (no DB write)
router.post('/preview', protect, csvUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file was uploaded. Please select a file and try again.' });

  const filePath = req.file.path;
  try {
    const rows = parseFileToRows(filePath);

    if (rows.length < 2) {
      return res.status(400).json({ message: 'File must have at least a header row and one data row.' });
    }

    // ── DEBUG: Log exact headers & first data row ──────────────
    console.log('\n🔍 [Import Debug] File:', req.file.originalname);
    console.log('🔍 [Import Debug] Total rows (incl header):', rows.length);
    console.log('🔍 [Import Debug] Header row (raw):',   JSON.stringify(rows[0]));
    console.log('🔍 [Import Debug] First data row (raw):', JSON.stringify(rows[1]));
    // ──────────────────────────────────────────────────────────

    // Filter out completely empty rows (Excel often has trailing blank rows)
    const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ''));

    const { map: headerMap, multi: multiMap } = mapHeaders(rows[0]);
    console.log('🔍 [Import Debug] Mapped fields:', JSON.stringify(headerMap));

    // If no 'name' column detected, show what columns were found
    if (headerMap.name === undefined) {
      const detected = rows[0].map(h => String(h).trim()).filter(Boolean);
      return res.status(400).json({
        message: `No "Name" column found. Your file has these columns: [${detected.join(', ')}]. ` +
                 `Please rename one column to "Name", "Full Name", or "Contact Person".`,
        detectedHeaders: detected,
      });
    }

    const previewRows = dataRows.slice(0, 10).map((row, i) => ({
      rowIndex: i + 2,
      ...parseRow(row, headerMap, multiMap),
    }));

    const fileType = path.extname(req.file.originalname).replace('.', '').toUpperCase();

    res.json({
      totalRows:       dataRows.length,
      previewRows,
      detectedColumns: Object.keys(headerMap),
      filePath:        req.file.filename, // temp filename — needed for confirm
      fileType,
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to parse file: ' + err.message });
  }
  // Do NOT delete file yet — confirm step needs it
});

// ── POST /api/leads/import/confirm ────────────────────────────
// Bulk insert all valid rows from the previously uploaded temp file
router.post('/confirm', protect, async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ message: 'Filename is required to complete the import.' });

  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, '../../uploads/temp', safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Temporary file not found. Please upload the file again.' });
  }

  try {
    const rows      = parseFileToRows(filePath);
    const dataRows  = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ''));
    const { map: headerMap, multi: multiMap } = mapHeaders(rows[0]);

    const leadsToInsert = dataRows
      .map(row => parseRow(row, headerMap, multiMap))
      .filter(l => l.name) // skip rows with no name
      .map(l => ({ ...l, createdBy: req.user._id }));

    if (!leadsToInsert.length) {
      return res.status(400).json({ message: 'No valid leads found. Make sure the "Name" column has values.' });
    }

    const batchSize = 500;
    let imported = 0;

    for (let i = 0; i < leadsToInsert.length; i += batchSize) {
      const batch = leadsToInsert.slice(i, i + batchSize);

      try {
        const inserted = await Lead.insertMany(batch, { ordered: false });
        imported += inserted.length;
      } catch (err) {
        if (err.insertedDocs) {
          imported += err.insertedDocs.length;
        } else {
          throw err;
        }
      }
    }

    const ext = path.extname(safeFilename).replace('.', '').toUpperCase();
    await Activity.create({
      user:   req.user.name,
      action: `Imported ${imported} lead(s) via ${ext}`,
      lead:   'Bulk Import',
      type:   'add',
      time:   new Date().toLocaleTimeString(),
    });

    res.json({
      imported,
      skipped: dataRows.length - imported,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  } finally {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
});

module.exports = router;
