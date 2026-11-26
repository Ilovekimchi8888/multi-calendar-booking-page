# Setup guide

About **15–20 minutes**. No coding knowledge needed: you'll copy, paste and click.

## Before you start

Decide two things:

1. **The booking account.** This is the Google account people book with. Invitations and emails come from it, so use one you're happy to give out.
2. **Which calendars should block bookings.** List every calendar whose busy times should make you unavailable. They can be in other Google accounts.

**Calendar IDs.** For an account's main calendar, the ID is its email address. For an extra calendar created inside an account, it's a long code ending in `@group.calendar.google.com`. You can find any calendar's ID in Google Calendar → **Settings** → click the calendar → **Integrate calendar** → **Calendar ID**.

**Tip:** Apps Script gets confused when several Google accounts are signed in at once. Use a **private/incognito window** signed in only to the booking account.

---

## Step 1: Share your other calendars (Google Calendar on the web)

Do this for each **other** calendar that should block bookings:

1. Sign in to the account that owns it and open Google Calendar.
2. Go to **Settings** → click the calendar → **Share with specific people** → **Add people**.
3. Enter the **booking account's** email address and choose **See only free/busy (hide details)**.

The booking account's own calendar needs no sharing.

> **Workplace accounts:** some organisations only allow sharing outside the organisation as free/busy. That's fine here, because free/busy is all the booking page needs.

---

## Step 2: Create the project

1. Signed in as the **booking account**, go to [script.google.com](https://script.google.com) → **New project**.
2. Click "Untitled project" and name it, e.g. **Booking page**.
3. **Code:** click **Code.gs**, select all, delete, and paste in the whole of `src/Booking.gs`.
4. **Booking page:** click **+** next to *Files* → **HTML**, type `Booking` (exactly, without ".html"), and press Enter. Delete the starter code and paste in `src/Booking.html`.
5. **Accept/Decline page:** click **+** next to *Files* → **HTML**, type `Decide`, and paste in `src/Decide.html`.
6. Save with **Ctrl+S** (Cmd+S on a Mac).

> **Copying from GitHub:** open each file on GitHub and use the **Copy raw file** button (top right of the file view). Don't open `.html` files in your browser; it shows the page instead of the code.

---

## Step 3: Switch on the Calendar API and set the time zone

1. Click the **cog (Project Settings)** on the left → tick **"Show 'appsscript.json' manifest file in editor"**.
2. Back in the editor (the **< >** icon), open **appsscript.json**, replace everything with `src/appsscript.json`, and change `"timeZone"` to yours, e.g. `"Europe/Zurich"` or `"America/New_York"` ([list of time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)).
3. Save. **Calendar** now appears under *Services* on the left.

---

## Step 4: Fill in your settings

At the top of **Code.gs**, in the `BOOKING` section, change the text **between the quote marks**. Keep the quote marks and commas.

| Setting | What it means | Example |
|---|---|---|
| `TITLE` | Heading of the booking page | `'Book a meeting with Alex Smith'` |
| `OWNER_NAME` | Your name, used in emails | `'Alex Smith'` |
| `TIMEZONE` | Must match appsscript.json | `'Europe/Zurich'` |
| `TIMEZONE_LABEL` | How the time zone is shown to people | `'Zurich time'` |
| `MEETING_MINUTES` | Length of a meeting | `20` |
| `SLOT_STEP_MINUTES` | A slot starts this often; the whole window must be free | `30` |
| `DAY_START` / `DAY_END` | Bookable hours | `'09:00'` / `'17:00'` |
| `BLOCKED` | Times that are never bookable | `[['12:00', '13:30']]` |
| `WEEKDAYS` | 1 = Monday … 7 = Sunday | `[1, 2, 3, 4, 5]` |
| `MIN_NOTICE_HOURS` | Shortest notice allowed | `48` |
| `MAX_MONTHS_AHEAD` | How far ahead people can book | `3` |
| `MAX_PENDING_PER_EMAIL` | Open requests allowed per email address | `2` |
| `ADD_MEET` | Add a Google Meet link when accepted | `true` / `false` |
| `CHECK_CALENDARS` | Keep `'primary'` and add the calendar IDs from Step 1 | `['primary', 'me@gmail.com', 'me@myclub.org']` |
| `NOTIFY_EMAIL` | Where Accept/Decline emails go; empty = the booking account | `''` |

Delete the `'PRIVATE-CALENDAR-ID'` and `'OTHER-CALENDAR-ID'` placeholder lines you don't use. Save.

---

## Step 5: Run the setup check

1. Make sure **Code.gs** is open. The function list only shows functions from the open file.
2. In the toolbar, click the **▼** next to the function name, choose **testSetup**, and click **Run**.
3. Approve the permissions: **Review permissions** → choose the booking account → *Advanced* → *Go to Booking page (unsafe)* → tick **Select all** → **Continue**.
   - "Unsafe" only means Google hasn't reviewed the script; you're the developer.
   - The script needs **Calendar** access (to read busy times and hold slots) and **Send email** access (for the request, accept and decline emails).
4. Check the **Execution log**:
   - `Script time zone: … (good)`
   - an **OK** line for every calendar

   A **PROBLEM** line means that calendar isn't shared to the booking account yet (Step 1).

---

## Step 6: Publish it

1. **Deploy** → **New deployment** → cog next to *Select type* → **Web app**.
2. **Execute as: Me**. **Who has access: Anyone**. Click **Deploy**.
3. Copy the **Web app URL**. It starts with `https://script.google.com/macros/s/` and ends in **`/exec`**. Don't copy the *Deployment ID*. This URL is your **booking link**.

---

## Step 7: Test it

1. Open the booking link. You should see your free slots.
2. Request a slot using **another** email address of yours.
3. Check that:
   - "Pending: …" appears in the booking account's calendar
   - the "request received" email arrives at the other address
   - the Accept/Decline email arrives at the booking account
4. Click **Accept or decline** → **Accept**. The other address should receive a Google Calendar invitation.

You're live. Share the link by email, LinkedIn, your website or your email signature.

---

## Changing things later

- **Settings or code:** edit Code.gs, save, then go to **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The link stays the same. If you skip this, the link keeps running the old version.
- **Adding a calendar:** share it (Step 1), add its ID to `CHECK_CALENDARS`, then deploy a new version.
- **Seeing open requests:** run `testSetup` (the last log line), or look under **Project Settings → Script Properties**. Each `bk_…` entry is one open request.
