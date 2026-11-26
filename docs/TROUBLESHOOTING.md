# Troubleshooting

| What you see | Why | Fix |
|---|---|---|
| The link shows code instead of the booking page | The `.gs` code was pasted into an `.html` file, or the other way round | `.html` files start with `<!doctype html>`, and Booking.gs starts with `/**`. Paste each into the right file, then deploy a new version. |
| Changes don't show up | The link still runs the version deployed earlier | Deploy → Manage deployments → pencil → *New version* → Deploy |
| Clicking **+** next to *Services* does nothing | A pop-up blocker or narrow window | Use the `appsscript.json` method (SETUP step 3) |
| `ReferenceError: Calendar is not defined` | The Google Calendar API isn't switched on | SETUP step 3 |
| The function list says *No functions* | The file isn't saved yet | Press Ctrl+S |
| You can't find `testSetup` | The list only shows functions from the open file | Open Code.gs first, then use the ▼ list |
| `Attempted to execute myFunction, but it was deleted` | The list still points to Google's starter function | Choose `testSetup` from the ▼ list |
| `This project requires access to your Google Account` | Permissions haven't been approved yet | Run again, then *Review permissions* → *Advanced* → *Go to … (unsafe)* → *Select all* → *Continue* |
| "Google hasn't verified this app" | Normal for your own scripts | Continue; you are the developer |
| `testSetup` shows `PROBLEM … notFound` | That calendar isn't shared to the booking account | Share it as *See only free/busy* (SETUP step 1) |
| `testSetup` shows `NOT SET` | A placeholder is still in `CHECK_CALENDARS` | Replace it with a real calendar ID, or delete that line |
| Script time zone isn't marked *(good)* | appsscript.json and `TIMEZONE` don't match | Make them the same, e.g. `Europe/Zurich` in both |
| No free times are shown | Everything is busy, inside the notice period, or outside your days and hours | Click *Later ›*, check `WEEKDAYS`, `DAY_START`/`DAY_END` and `MIN_NOTICE_HOURS` |
| A day off doesn't block bookings | All-day events count as *Free* | Open the event and set it to *Busy* |
| Times look an hour off | The time zone setting is wrong | Check `TIMEZONE`, appsscript.json and Project Settings → Time zone |
| No Accept/Decline email arrives | Email quota reached, or `NOTIFY_EMAIL` is wrong | Check `NOTIFY_EMAIL`; free Gmail accounts can send about 100 script emails a day |
| "You already have 2 requests waiting" | The per-email limit | Answer the open requests, or raise `MAX_PENDING_PER_EMAIL` |
| "Booking is paused for the moment" | `MAX_PENDING_TOTAL` reached | Answer open requests, or raise the limit |
| Clicking Accept says *already answered* | It was accepted or declined before, or its time has passed | Nothing to do |
| A Workspace account can't choose *Anyone* when deploying | The admin limits web apps to the organisation | Ask the admin to allow web apps to be shared outside the organisation |
