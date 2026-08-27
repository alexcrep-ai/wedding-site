// ─────────────────────────────────────────────
//  SK + AC Wedding — Google Apps Script
//  Replace your entire script with this.
// ─────────────────────────────────────────────

var SPREADSHEET_ID = '1ZxCp6AwzImanv1MuKSbrOHYUEUczwnkuxIJDi4KT6oI';
var SHEET_NAME = 'RSVPs';

var HEADERS = [
  'Timestamp', 'Household ID', 'Title', 'First Name', 'Last Name', 'Email',
  'Welcome Aperitivo (Fri Nov 6)', 'Wedding Day (Sat Nov 7)', 'Cannot Attend', 'Self Meal',
  'Guest 2 Title', 'Guest 2 First Name', 'Guest 2 Last Name', 'Guest 2 Email', 'Guest 2 Meal',
  'Guest 3 Title', 'Guest 3 First Name', 'Guest 3 Last Name', 'Guest 3 Email', 'Guest 3 Meal',
  'Guest 4 Title', 'Guest 4 First Name', 'Guest 4 Last Name', 'Guest 4 Email', 'Guest 4 Meal',
  'Dietary Restrictions'
];

// Maps sheet header -> key used in the JSON sent to/read by the website.
var FIELD_MAP = {
  'Household ID': 'household_id',
  'Title': 'title',
  'First Name': 'first_name',
  'Last Name': 'last_name',
  'Email': 'email',
  'Welcome Aperitivo (Fri Nov 6)': 'welcome_cocktail',
  'Wedding Day (Sat Nov 7)': 'wedding_day',
  'Cannot Attend': 'cannot_attend',
  'Self Meal': 'meal_self',
  'Guest 2 Title': 'g2_title', 'Guest 2 First Name': 'g2_first', 'Guest 2 Last Name': 'g2_last', 'Guest 2 Email': 'g2_email', 'Guest 2 Meal': 'meal_g2',
  'Guest 3 Title': 'g3_title', 'Guest 3 First Name': 'g3_first', 'Guest 3 Last Name': 'g3_last', 'Guest 3 Email': 'g3_email', 'Guest 3 Meal': 'meal_g3',
  'Guest 4 Title': 'g4_title', 'Guest 4 First Name': 'g4_first', 'Guest 4 Last Name': 'g4_last', 'Guest 4 Email': 'g4_email', 'Guest 4 Meal': 'meal_g4',
  'Dietary Restrictions': 'dietary'
};

function getSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function findRowByHouseholdId_(sheet, householdId) {
  var data = sheet.getDataRange().getValues();
  var hhCol = HEADERS.indexOf('Household ID');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][hhCol]) === String(householdId)) {
      return { rowNum: i + 1, values: data[i] };
    }
  }
  return null;
}

// ── GET: JSONP lookup — "has this household already submitted?" ──
function doGet(e) {
  var householdId = e.parameter.householdId;
  var callback = e.parameter.callback || 'callback';
  var result = null;

  if (householdId) {
    var sheet = getSheet_();
    var existing = findRowByHouseholdId_(sheet, householdId);
    if (existing) {
      result = {};
      HEADERS.forEach(function(h, idx) {
        var key = FIELD_MAP[h];
        if (key) result[key] = existing.values[idx];
      });
    }
  }

  var body = callback + '(' + JSON.stringify(result) + ');';
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ── POST: create or update (upsert) a household's RSVP ──
function doPost(e) {
  var sheet = getSheet_();
  var data = JSON.parse(e.postData.contents);

  var newRow = HEADERS.map(function(h) {
    if (h === 'Timestamp') return new Date();
    var key = FIELD_MAP[h];
    return key && data[key] != null ? data[key] : '';
  });

  var existing = findRowByHouseholdId_(sheet, data.household_id);
  if (existing) {
    sheet.getRange(existing.rowNum, 1, 1, newRow.length).setValues([newRow]);
  } else {
    sheet.appendRow(newRow);
  }

  sendConfirmationEmail_(data);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function guestList_(data) {
  var people = [];
  people.push({ title: data.title, first: data.first_name, last: data.last_name, meal: data.meal_self });
  ['2', '3', '4'].forEach(function(n) {
    var first = data['g' + n + '_first'];
    var last = data['g' + n + '_last'];
    if (first || last) {
      people.push({ title: data['g' + n + '_title'], first: first, last: last, meal: data['meal_g' + n] });
    }
  });
  return people;
}

function fullName_(p) {
  return [p.title, p.first, p.last].filter(function(x) { return x; }).join(' ');
}

function sendConfirmationEmail_(data) {
  var people = guestList_(data);
  var attending = data.wedding_day === 'Yes' || data.welcome_cocktail === 'Yes';

  // ── Attending events summary ──
  var events = [];
  if (data.welcome_cocktail === 'Yes') events.push('Welcome Aperitivo &mdash; Friday, November 6th');
  if (data.wedding_day === 'Yes') events.push('Wedding Ceremony &amp; Reception &mdash; Saturday, November 7th');

  var attendingHtml;
  if (data.cannot_attend === 'Yes' && !attending) {
    attendingHtml = '<p style="font-family: Georgia, serif; font-size: 15px; color: #8a7a7e; line-height: 1.8; margin: 0;">Unfortunately unable to attend.</p>';
  } else {
    attendingHtml = events.map(function(ev) {
      return '<p style="font-family: Georgia, serif; font-size: 15px; color: #2a2318; line-height: 1.8; margin: 0 0 6px 0;">&#10003;&nbsp;&nbsp;' + ev + '</p>';
    }).join('');
  }

  // ── Party roster ──
  var partyHtml = '';
  if (people.length > 1) {
    partyHtml = '<p style="font-family: Georgia, serif; font-size: 14px; color: #8a7a7e; line-height: 1.7; margin: 16px 0 0 0;"><strong style="color: #2a2318; font-weight: 600;">Attending with:</strong> ' +
      people.slice(1).map(fullName_).join(', ') + '</p>';
  }

  // ── Meal choices (only relevant if attending Saturday) ──
  var mealHtml = '';
  if (data.wedding_day === 'Yes') {
    var mealLines = people
      .filter(function(p) { return p.meal; })
      .map(function(p) {
        return '<p style="font-family: Georgia, serif; font-size: 14px; color: #8a7a7e; line-height: 1.6; margin: 0 0 4px 0;">' + fullName_(p) + ' &mdash; <strong style="color:#2a2318; font-weight:600;">' + p.meal + '</strong></p>';
      }).join('');
    if (mealLines) {
      mealHtml = '<p style="font-family: Georgia, serif; font-size: 14px; color: #8a7a7e; line-height: 1.7; margin: 16px 0 6px 0;"><strong style="color: #2a2318; font-weight: 600;">Saturday night dinner:</strong></p>' + mealLines;
    }
  }

  var dietaryHtml = data.dietary
    ? '<p style="font-family: Georgia, serif; font-size: 14px; color: #8a7a7e; line-height: 1.7; margin: 16px 0 0 0;"><strong style="color: #2a2318; font-weight: 600;">Dietary notes:</strong> ' + data.dietary + '</p>'
    : '';

  var salutation = 'Dear ' + [data.title, data.last_name].filter(function(x) { return x; }).join(' ') + ',';

  // ── HTML email ─────────────────────────────
  var html = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;600;700&display=swap" rel="stylesheet">' +
'</head>' +
'<body style="margin: 0; padding: 0; background-color: #FBE8EB;">' +
'  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FBE8EB; padding: 40px 20px;">' +
'    <tr><td align="center">' +
'      <table width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; border: 2px solid #2E9166; background-color: #FBE8EB;">' +
'        <tr><td style="padding: 9px;">' +
'          <table width="100%" cellpadding="0" cellspacing="0" style="border: 2px solid #2E9166;">' +
'            <tr><td style="padding: 48px 48px 40px;">' +
'              <table width="100%" cellpadding="0" cellspacing="0">' +

'                <tr><td align="center" style="padding-bottom: 8px;">' +
'                  <h1 style="font-family: \'Playfair Display\', Georgia, serif; font-size: 36px; font-weight: 800; color: #2E9166; margin: 0; line-height: 1.1;">Susan <em>&amp;</em> Alexandre\'s Wedding</h1>' +
'                </td></tr>' +

'                <tr><td align="center" style="padding-bottom: 28px;">' +
'                  <p style="font-family: \'Barlow Condensed\', Arial Narrow, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7a7e; margin: 0;">November 7, 2026 &nbsp;&middot;&nbsp; The Colony, Palm Beach, FL</p>' +
'                </td></tr>' +

'                <tr><td align="center" style="padding-bottom: 28px;">' +
'                  <div style="width: 60px; height: 1px; background-color: #3DB87A; margin: 0 auto;"></div>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 16px;">' +
'                  <p style="font-family: Georgia, serif; font-size: 16px; color: #2a2318; line-height: 1.8; margin: 0;">' + salutation + '</p>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 28px;">' +
'                  <p style="font-family: Georgia, serif; font-size: 16px; color: #8a7a7e; line-height: 1.8; margin: 0;">We\'ve received your RSVP &mdash; thank you! Here\'s a summary of what you submitted:</p>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 28px;">' +
'                  <table width="100%" cellpadding="0" cellspacing="0">' +
'                    <tr><td style="padding: 20px 24px; background-color: #f5ede8; border-left: 2px solid #2E9166;">' +
'                      <p style="font-family: \'Barlow\', Arial, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #2E9166; margin: 0 0 14px 0;">Your selections</p>' +
                       attendingHtml +
                       partyHtml +
                       mealHtml +
                       dietaryHtml +
'                    </td></tr>' +
'                  </table>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 12px;">' +
'                  <p style="font-family: Georgia, serif; font-size: 15px; color: #8a7a7e; line-height: 1.8; margin: 0;">If anything looks wrong or you need to make a change, just reply to this email, or visit the site again and re-submit &mdash; it\'ll update your existing RSVP.</p>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 28px;">' +
'                  <p style="font-family: Georgia, serif; font-size: 15px; color: #8a7a7e; line-height: 1.8; margin: 0;">We can\'t wait to celebrate with you in Palm Beach!</p>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 32px;">' +
'                  <p style="font-family: \'Playfair Display\', Georgia, serif; font-size: 18px; font-weight: 700; color: #2E9166; margin: 0; font-style: italic;">Susan &amp; Alexandre</p>' +
'                </td></tr>' +

'                <tr><td align="center" style="padding-bottom: 20px;">' +
'                  <div style="width: 60px; height: 1px; background-color: #3DB87A; margin: 0 auto;"></div>' +
'                </td></tr>' +

'                <tr><td align="center">' +
'                  <p style="font-family: \'Barlow\', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #c4b0b5; margin: 0;">Full details at &nbsp;<a href="https://knowles-crepault.com" style="color: #2E9166; text-decoration: none;">knowles-crepault.com</a></p>' +
'                </td></tr>' +

'              </table>' +
'            </td></tr>' +
'          </table>' +
'        </td></tr>' +
'      </table>' +
'    </td></tr>' +
'  </table>' +
'</body>' +
'</html>';

  MailApp.sendEmail({
    to: data.email,
    subject: 'Your RSVP — Susan & Alexandre, November 7th',
    htmlBody: html
  });
}
