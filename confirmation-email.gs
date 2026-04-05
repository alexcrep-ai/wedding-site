// ─────────────────────────────────────────────
//  SK + AC Wedding — Google Apps Script
//  Replace your entire script with this.
// ─────────────────────────────────────────────

var SPREADSHEET_ID = '1oyAJ_UZHmtK3QmVRj5AgZA0JSEzHpv4s7umcgRHGSk8';
var SHEET_NAME = 'RSVPs';

function doPost(e) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Create the tab if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Add headers if sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'First Name', 'Last Name',
      'Partner First Name', 'Partner Last Name', 'Email',
      'Welcome Aperitivo (Fri Nov 6)', 'Wedding Day (Sat Nov 7)',
      'Cannot Attend', 'Dietary Restrictions'
    ]);
  }

  var data = JSON.parse(e.postData.contents);

  // ── Save to sheet ──────────────────────────
  sheet.appendRow([
    new Date(),
    data.first_name,
    data.last_name,
    data.partner_first_name,
    data.partner_last_name,
    data.email,
    data.welcome_cocktail,
    data.wedding_day,
    data.cannot_attend,
    data.dietary
  ]);

  // ── Build attending summary ────────────────
  var events = [];
  if (data.welcome_cocktail === 'Yes') events.push('Welcome Aperitivo &mdash; Friday, November 6th');
  if (data.wedding_day      === 'Yes') events.push('Wedding Ceremony &amp; Reception &mdash; Saturday, November 7th');

  var attendingHtml = '';
  if (data.cannot_attend === 'Yes') {
    attendingHtml = '<p style="font-family: Georgia, serif; font-size: 15px; color: #8a7a7e; line-height: 1.8; margin: 0;">Unfortunately unable to attend.</p>';
  } else {
    attendingHtml = events.map(function(ev) {
      return '<p style="font-family: Georgia, serif; font-size: 15px; color: #2a2318; line-height: 1.8; margin: 0 0 6px 0;">&#10003;&nbsp;&nbsp;' + ev + '</p>';
    }).join('');
  }

  var dietaryHtml = data.dietary
    ? '<p style="font-family: Georgia, serif; font-size: 14px; color: #8a7a7e; line-height: 1.7; margin: 16px 0 0 0;"><strong style="color: #2a2318; font-weight: 600;">Dietary notes:</strong> ' + data.dietary + '</p>'
    : '';

  var guestName = data.first_name;

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

'                <tr><td align="center" style="padding-bottom: 28px;">' +
'                  <p style="font-family: \'Barlow Condensed\', Arial Narrow, sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #2E9166; margin: 0;">SK + AC</p>' +
'                </td></tr>' +

'                <tr><td align="center" style="padding-bottom: 28px;">' +
'                  <div style="width: 1px; height: 48px; background-color: #3DB87A; margin: 0 auto;"></div>' +
'                </td></tr>' +

'                <tr><td align="center" style="padding-bottom: 8px;">' +
'                  <h1 style="font-family: \'Playfair Display\', Georgia, serif; font-size: 36px; font-weight: 800; color: #2E9166; margin: 0; line-height: 1.1;">Susan <em>&amp;</em> Alexandre</h1>' +
'                </td></tr>' +

'                <tr><td align="center" style="padding-bottom: 28px;">' +
'                  <p style="font-family: \'Barlow Condensed\', Arial Narrow, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7a7e; margin: 0;">November 7, 2026 &nbsp;&middot;&nbsp; The Colony, Palm Beach, FL</p>' +
'                </td></tr>' +

'                <tr><td align="center" style="padding-bottom: 28px;">' +
'                  <div style="width: 60px; height: 1px; background-color: #3DB87A; margin: 0 auto;"></div>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 16px;">' +
'                  <p style="font-family: Georgia, serif; font-size: 16px; color: #2a2318; line-height: 1.8; margin: 0;">Hi ' + guestName + ',</p>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 28px;">' +
'                  <p style="font-family: Georgia, serif; font-size: 16px; color: #8a7a7e; line-height: 1.8; margin: 0;">We\'ve received your RSVP &mdash; thank you! Here\'s a summary of what you submitted:</p>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 28px;">' +
'                  <table width="100%" cellpadding="0" cellspacing="0">' +
'                    <tr><td style="padding: 20px 24px; background-color: #f5ede8; border-left: 2px solid #2E9166;">' +
'                      <p style="font-family: \'Barlow\', Arial, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #2E9166; margin: 0 0 14px 0;">Your selections</p>' +
                       attendingHtml +
                       dietaryHtml +
'                    </td></tr>' +
'                  </table>' +
'                </td></tr>' +

'                <tr><td style="padding-bottom: 12px;">' +
'                  <p style="font-family: Georgia, serif; font-size: 15px; color: #8a7a7e; line-height: 1.8; margin: 0;">If anything looks wrong or you need to make a change, just reply to this email and we\'ll sort it out.</p>' +
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
'                  <p style="font-family: \'Barlow\', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #c4b0b5; margin: 0;">The Colony Palm Beach &nbsp;&middot;&nbsp; 155 Hammon Avenue, Palm Beach, FL 33480</p>' +
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

  // ── Send confirmation email ────────────────
  MailApp.sendEmail({
    to:       data.email,
    subject:  'Your RSVP — Susan & Alexandre, November 7th',
    htmlBody: html
  });

  // ── Return success ─────────────────────────
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
