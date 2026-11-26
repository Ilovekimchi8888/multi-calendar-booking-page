/**
 * Booking page: lets people request a meeting with you.
 * Put it in the Google account you are happy to give out (not your private one).
 *
 * People pick a free 20-minute slot. The slot is held in this calendar as
 * "Pending: <name>" and you get an email to accept or decline.
 * On accept, the person gets a Google Calendar invitation from this account.
 *
 * Busy times are checked in every calendar listed in CHECK_CALENDARS.
 * Those calendars only need to be shared to this account as "See only free/busy".
 *
 * Needs the advanced service "Google Calendar API" (Services > + > Google Calendar API).
 * Project Settings > Time zone: the same as TIMEZONE below.
 * Deploy as Web app: Execute as "Me", Who has access "Anyone".
 */

const BOOKING = {
  TITLE: 'Book a meeting with YOUR NAME',
  OWNER_NAME: 'YOUR NAME',          // used in emails and on the page
  TIMEZONE: 'Europe/London',        // your time zone, e.g. 'Europe/Zurich', 'America/New_York'
  TIMEZONE_LABEL: 'UK time',         // how the time zone is shown to people booking

  MEETING_MINUTES: 20,          // length of a meeting
  SLOT_STEP_MINUTES: 30,        // slots start every 30 minutes (:00 and :30); the whole half hour must be free
  DAY_START: '09:00',
  DAY_END: '17:00',
  BLOCKED: [['12:00', '13:30']], // always unavailable, even if the calendar is empty
  WEEKDAYS: [1, 2, 3, 4, 5],     // 1 = Monday ... 5 = Friday
  MIN_NOTICE_HOURS: 48,
  MAX_MONTHS_AHEAD: 3,

  MAX_PENDING_PER_EMAIL: 2,     // one email address can't hold more than this many requests at once
  MAX_PENDING_TOTAL: 30,        // safety limit on open requests overall
  ADD_MEET: true,               // accepted meetings get a Google Meet link

  // Calendars whose busy times block bookings. 'primary' = this account's own calendar.
  // Add the calendar ID of every other calendar that should block bookings
  // (each must be shared to this account, "See only free/busy" is enough).
  CHECK_CALENDARS: [
    'primary',
    'PRIVATE-CALENDAR-ID',
    'OTHER-CALENDAR-ID'
  ],

  // Where accept/decline emails go. Empty = this account.
  NOTIFY_EMAIL: ''
};

/* ---------------- Pages ---------------- */

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.a === 'decide') {
    const t = HtmlService.createTemplateFromFile('Decide');
    t.reqId = String(p.id || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
    t.reqToken = String(p.t || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 80);
    return t.evaluate().setTitle('Booking request')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createTemplateFromFile('Booking').evaluate()
    .setTitle(BOOKING.TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------------- Time helpers (all in BOOKING.TIMEZONE) ---------------- */

function bkPad_(n) { return (n < 10 ? '0' : '') + n; }

// "yyyy-MM-dd" for a calendar date held as a UTC midnight Date
function bkYmd_(d) { return d.getUTCFullYear() + '-' + bkPad_(d.getUTCMonth() + 1) + '-' + bkPad_(d.getUTCDate()); }

function bkParseYmd_(s) { const p = String(s).split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }

function bkAddDays_(d, n) { return new Date(d.getTime() + n * 86400000); }

// The real moment for a local wall-clock time on a calendar date
function bkAt_(day, hhmm) {
  const noon = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12));
  const offset = Utilities.formatDate(noon, BOOKING.TIMEZONE, 'XXX'); // e.g. +01:00 or +02:00
  return new Date(bkYmd_(day) + 'T' + hhmm + ':00' + (offset === 'Z' ? '+00:00' : offset));
}

function bkToday_() { return bkParseYmd_(Utilities.formatDate(new Date(), BOOKING.TIMEZONE, 'yyyy-MM-dd')); }

function bkWeekday_(day) { const w = day.getUTCDay(); return w === 0 ? 7 : w; } // 1 = Mon ... 7 = Sun

function bkLastDay_() {
  const t = bkToday_();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + BOOKING.MAX_MONTHS_AHEAD, t.getUTCDate()));
}

function bkEarliest_() { return new Date(Date.now() + BOOKING.MIN_NOTICE_HOURS * 3600000); }

function bkFormat_(ms, pattern) { return Utilities.formatDate(new Date(ms), BOOKING.TIMEZONE, pattern); }

function bkWhen_(ms) {
  return bkFormat_(ms, 'EEEE d MMMM yyyy, HH:mm') + '–' +
    bkFormat_(ms + BOOKING.MEETING_MINUTES * 60000, 'HH:mm') + ' (' + BOOKING.TIMEZONE_LABEL + ')';
}

/* ---------------- Availability ---------------- */

// Busy periods [{s, e}] (ms) across all CHECK_CALENDARS between two moments
function bkBusy_(from, to) {
  const busy = [];
  let start = from;
  while (start < to) {
    const end = new Date(Math.min(to.getTime(), start.getTime() + 30 * 86400000)); // query in 30-day pieces
    const res = Calendar.Freebusy.query({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: BOOKING.TIMEZONE,
      items: BOOKING.CHECK_CALENDARS.filter(bkIsRealId_).map(function (id) { return { id: id }; })
    });
    Object.keys(res.calendars || {}).forEach(function (id) {
      (res.calendars[id].busy || []).forEach(function (b) {
        busy.push({ s: new Date(b.start).getTime(), e: new Date(b.end).getTime() });
      });
    });
    start = end;
  }
  return busy;
}

function bkIsRealId_(id) { return id && id.indexOf('CALENDAR-ID') === -1; } // skips unfilled placeholders

// Every possible slot start on a day, before checking calendars
function bkDaySlots_(day) {
  if (BOOKING.WEEKDAYS.indexOf(bkWeekday_(day)) === -1) return [];
  const step = BOOKING.SLOT_STEP_MINUTES * 60000;
  const dayStart = bkAt_(day, BOOKING.DAY_START).getTime();
  const dayEnd = bkAt_(day, BOOKING.DAY_END).getTime();
  const blocked = BOOKING.BLOCKED.map(function (b) {
    return { s: bkAt_(day, b[0]).getTime(), e: bkAt_(day, b[1]).getTime() };
  });
  const out = [];
  for (let s = dayStart; s + step <= dayEnd; s += step) {
    if (!bkOverlaps_(s, s + step, blocked)) out.push(s);
  }
  return out;
}

function bkOverlaps_(s, e, periods) {
  for (let i = 0; i < periods.length; i++) if (periods[i].s < e && periods[i].e > s) return true;
  return false;
}

function bkSlotAllowed_(s) {
  const day = bkParseYmd_(bkFormat_(s, 'yyyy-MM-dd'));
  if (day > bkLastDay_()) return false;
  if (s < bkEarliest_().getTime()) return false;
  return bkDaySlots_(day).indexOf(s) !== -1;
}

/** Called by the page: free slots for the Mon–Fri week containing `ymd` (or the first bookable week). */
function getWeek(ymd) {
  const earliest = bkEarliest_();
  const firstDay = bkParseYmd_(bkFormat_(earliest.getTime(), 'yyyy-MM-dd'));
  const lastDay = bkLastDay_();

  let target = ymd ? bkParseYmd_(ymd) : firstDay;
  if (target < firstDay) target = firstDay;
  if (target > lastDay) target = lastDay;
  const monday = bkAddDays_(target, 1 - bkWeekday_(target));
  const sunday = bkAddDays_(monday, 6);

  const step = BOOKING.SLOT_STEP_MINUTES * 60000;
  const busy = bkBusy_(bkAt_(monday, '00:00'), bkAt_(bkAddDays_(monday, 7), '00:00'));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = bkAddDays_(monday, i);
    if (BOOKING.WEEKDAYS.indexOf(bkWeekday_(day)) === -1) continue;
    const slots = (day < firstDay || day > lastDay) ? [] : bkDaySlots_(day).filter(function (s) {
      return s >= earliest.getTime() && !bkOverlaps_(s, s + step, busy);
    });
    days.push({
      ymd: bkYmd_(day),
      label: Utilities.formatDate(bkAt_(day, '12:00'), BOOKING.TIMEZONE, 'EEE d MMM'),
      slots: slots.map(function (s) { return { start: s, label: bkFormat_(s, 'HH:mm') }; })
    });
  }

  return {
    title: BOOKING.TITLE,
    owner: BOOKING.OWNER_NAME,
    minutes: BOOKING.MEETING_MINUTES,
    timezone: BOOKING.TIMEZONE,
    timezoneLabel: BOOKING.TIMEZONE_LABEL,
    weekLabel: Utilities.formatDate(bkAt_(monday, '12:00'), BOOKING.TIMEZONE, 'd MMM') + ' – ' +
      Utilities.formatDate(bkAt_(bkAddDays_(monday, 4), '12:00'), BOOKING.TIMEZONE, 'd MMM yyyy'),
    prev: monday > firstDay ? bkYmd_(bkAddDays_(monday, -7)) : null,
    next: bkAddDays_(monday, 7) <= lastDay ? bkYmd_(bkAddDays_(monday, 7)) : null,
    days: days
  };
}

/* ---------------- Requests ---------------- */

function bkAll_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(props).filter(function (k) { return k.indexOf('bk_') === 0; })
    .map(function (k) { try { return JSON.parse(props[k]); } catch (e) { return null; } })
    .filter(Boolean);
}

function bkSave_(rec) { PropertiesService.getScriptProperties().setProperty('bk_' + rec.id, JSON.stringify(rec)); }

function bkGet_(id) {
  const raw = PropertiesService.getScriptProperties().getProperty('bk_' + id);
  return raw ? JSON.parse(raw) : null;
}

function bkDrop_(id) { PropertiesService.getScriptProperties().deleteProperty('bk_' + id); }

function bkRemoveHold_(rec) {
  try { Calendar.Events.remove('primary', rec.eventId, { sendUpdates: 'none' }); } catch (e) { /* already gone */ }
}

// Requests whose time has passed without an answer are cleared away
function bkCleanup_() {
  const now = Date.now();
  bkAll_().forEach(function (rec) {
    if (rec.start < now) { bkRemoveHold_(rec); bkDrop_(rec.id); }
  });
}

/** Called by the page when someone requests a slot. */
function requestBooking(form) {
  form = form || {};
  if (form.website) return { ok: true }; // hidden field only robots fill in

  const name = String(form.name || '').trim().slice(0, 100);
  const email = String(form.email || '').trim().toLowerCase().slice(0, 200);
  const note = String(form.note || '').trim().slice(0, 1000);
  const start = Number(form.start);
  if (!name) throw new Error('Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
  if (!start || !bkSlotAllowed_(start)) throw new Error('SLOT_GONE');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    bkCleanup_();
    const open = bkAll_();
    if (open.filter(function (r) { return r.email === email; }).length >= BOOKING.MAX_PENDING_PER_EMAIL) {
      throw new Error('You already have ' + BOOKING.MAX_PENDING_PER_EMAIL + ' requests waiting for confirmation. Please wait until they are answered.');
    }
    if (open.length >= BOOKING.MAX_PENDING_TOTAL) {
      throw new Error('Booking is paused for the moment. Please try again later.');
    }

    const step = BOOKING.SLOT_STEP_MINUTES * 60000;
    if (bkOverlaps_(start, start + step, bkBusy_(new Date(start), new Date(start + step)))) throw new Error('SLOT_GONE');

    const end = start + BOOKING.MEETING_MINUTES * 60000;
    const hold = Calendar.Events.insert({
      summary: 'Pending: ' + name,
      description: 'Booking request, waiting for your answer.\n\nName: ' + name + '\nEmail: ' + email +
        (note ? '\n\nNote:\n' + note : '') + '\n\nAccept or decline from the email you received.',
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() },
      extendedProperties: { shared: { bookingHold: '1' } } // marks the hold, so other tools can recognise it
    }, 'primary', { sendUpdates: 'none' });

    const rec = {
      id: Utilities.getUuid().replace(/-/g, '').slice(0, 16),
      token: Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''),
      name: name, email: email, note: note, start: start, eventId: hold.id, created: Date.now()
    };
    bkSave_(rec);

    bkMailOwner_(rec);
    bkMailGuest_(email, 'Request received: ' + bkFormat_(start, 'EEE d MMM, HH:mm'),
      '<p>Hello ' + bkEsc_(name) + ',</p>' +
      '<p>Thank you, your request for a meeting with ' + bkEsc_(BOOKING.OWNER_NAME) + ' has been received:</p>' +
      '<p><b>' + bkEsc_(bkWhen_(start)) + '</b></p>' +
      '<p>The time is held for you. Once it is confirmed, you will receive a Google Calendar invitation' +
      (BOOKING.ADD_MEET ? ' with a Google Meet link' : '') + '.</p>' +
      '<p>Kind regards,<br>' + bkEsc_(BOOKING.OWNER_NAME) + '</p>');

    return { ok: true, when: bkWhen_(start) };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Accept / decline ---------------- */

/** Called by the Decide page to show the request. */
function getRequest(id, token) {
  const rec = bkGet_(id);
  if (!rec || rec.token !== String(token)) return { found: false };
  return { found: true, name: rec.name, email: rec.email, note: rec.note, when: bkWhen_(rec.start), past: rec.start < Date.now() };
}

/** Called by the Decide page when you click Accept or Decline. */
function decide(id, token, action, message) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const rec = bkGet_(id);
    if (!rec || rec.token !== String(token)) return { ok: false, text: 'This request has already been answered or no longer exists.' };

    if (rec.start < Date.now()) {
      bkRemoveHold_(rec); bkDrop_(rec.id);
      return { ok: false, text: 'This time has already passed, so the request was cleared.' };
    }

    if (action === 'accept') {
      const patch = {
        summary: BOOKING.OWNER_NAME + ' / ' + rec.name,
        description: (rec.note ? rec.note + '\n\n' : '') + 'Booked via the booking page.',
        attendees: [{ email: rec.email, displayName: rec.name }],
        extendedProperties: { shared: { bookingHold: '0' } } // now a normal meeting
      };
      if (BOOKING.ADD_MEET) {
        patch.conferenceData = { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
      }
      try {
        Calendar.Events.patch(patch, 'primary', rec.eventId, { conferenceDataVersion: 1, sendUpdates: 'all' });
      } catch (e) {
        // The hold was deleted by hand: create the meeting afresh.
        const end = rec.start + BOOKING.MEETING_MINUTES * 60000;
        patch.start = { dateTime: new Date(rec.start).toISOString() };
        patch.end = { dateTime: new Date(end).toISOString() };
        Calendar.Events.insert(patch, 'primary', { conferenceDataVersion: 1, sendUpdates: 'all' });
      }
      bkDrop_(rec.id);
      return { ok: true, text: 'Accepted. ' + rec.name + ' has been sent a Google Calendar invitation.' };
    }

    if (action === 'decline') {
      bkRemoveHold_(rec);
      bkDrop_(rec.id);
      const msg = String(message || '').trim().slice(0, 1000);
      bkMailGuest_(rec.email, 'About your meeting request: ' + bkFormat_(rec.start, 'EEE d MMM, HH:mm'),
        '<p>Hello ' + bkEsc_(rec.name) + ',</p>' +
        '<p>Unfortunately ' + bkEsc_(BOOKING.OWNER_NAME) + ' is not able to meet at ' + bkEsc_(bkWhen_(rec.start)) + '.</p>' +
        (msg ? '<p>' + bkEsc_(msg).replace(/\n/g, '<br>') + '</p>' : '') +
        '<p>You are welcome to choose another time: <a href="' + ScriptApp.getService().getUrl() + '">booking page</a>.</p>' +
        '<p>Kind regards,<br>' + bkEsc_(BOOKING.OWNER_NAME) + '</p>');
      return { ok: true, text: 'Declined. The time is free again and ' + rec.name + ' has been told.' };
    }

    return { ok: false, text: 'Unknown action.' };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Emails ---------------- */

function bkEsc_(s) {
  return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

function bkMailGuest_(to, subject, html) {
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: BOOKING.OWNER_NAME });
}

function bkMailOwner_(rec) {
  const to = BOOKING.NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  const link = ScriptApp.getService().getUrl() + '?a=decide&id=' + rec.id + '&t=' + rec.token;
  MailApp.sendEmail({
    to: to,
    subject: 'Booking request: ' + rec.name + ', ' + bkFormat_(rec.start, 'EEE d MMM, HH:mm'),
    name: 'Booking page',
    htmlBody:
      '<p><b>' + bkEsc_(rec.name) + '</b> (' + bkEsc_(rec.email) + ') would like to meet:</p>' +
      '<p><b>' + bkEsc_(bkWhen_(rec.start)) + '</b></p>' +
      (rec.note ? '<p>Note:<br>' + bkEsc_(rec.note).replace(/\n/g, '<br>') + '</p>' : '') +
      '<p>The time is held in your calendar as "Pending: ' + bkEsc_(rec.name) + '".</p>' +
      '<p><a href="' + link + '" style="display:inline-block;background:#2f5f8f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Accept or decline</a></p>'
  });
}

/* ---------------- Setup check ---------------- */

/** Run once from the editor (select "testSetup", click Run): approves permissions and checks calendar access. */
function testSetup() {
  Logger.log('Script time zone: ' + Session.getScriptTimeZone() + (Session.getScriptTimeZone() === BOOKING.TIMEZONE ? ' (good)' : '  <-- set Project Settings > Time zone to match TIMEZONE'));
  const now = new Date();
  const res = Calendar.Freebusy.query({
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + 7 * 86400000).toISOString(),
    items: BOOKING.CHECK_CALENDARS.filter(bkIsRealId_).map(function (id) { return { id: id }; })
  });
  BOOKING.CHECK_CALENDARS.forEach(function (id) {
    if (!bkIsRealId_(id)) { Logger.log('NOT SET: replace ' + id + ' with the real calendar ID'); return; }
    const c = (res.calendars || {})[id];
    if (!c) Logger.log('? ' + id + ': no answer');
    else if (c.errors && c.errors.length) Logger.log('PROBLEM ' + id + ': ' + c.errors[0].reason + '  <-- share it to this account ("See only free/busy")');
    else Logger.log('OK ' + id + ': ' + (c.busy || []).length + ' busy period(s) in the next 7 days');
  });
  Logger.log('Open requests: ' + bkAll_().length);
}
