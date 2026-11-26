# Booking Page for Google Calendar

A free, self-hosted booking page, like a mini Calendly, that runs on **Google Apps Script** inside your own Google account.

People pick a free slot and request a meeting. **You approve every request** from an email. When you accept, they get a proper Google Calendar invitation, with a Google Meet link if you want one.

The big difference from the free tiers of most booking tools: it checks **all your calendars** for busy times (private, work, clubs), even calendars in other Google accounts. Those calendars only need to share *free/busy*, so no meeting details are ever exposed.

No server, no subscription, and no third party sees your calendar.

---

## What people see

1. A clean page with your free slots for the week. They can move between weeks, and times are shown in your time zone, with their own local time alongside if it's different.
2. They pick a slot and enter their name, email and an optional note.
3. They get a "request received" email straight away, and a Google Calendar invitation once you accept.

## What you get

- An email for every request, with an **Accept / Decline** button.
- While it waits for your answer, the slot is held in your calendar as **"Pending: name"**, so nobody else can take it.
- If you decline, you can add a personal message, e.g. *"Could we try next week?"*. They get a polite email with a link to pick another time.
- Requests nobody answered are cleared automatically once their time has passed.

## Rules you control

| Setting | Example |
|---|---|
| Meeting length | 20 minutes |
| Slot spacing | every 30 minutes, so 10 minutes free between meetings |
| Days | Monday–Friday |
| Hours | 09:00–17:00 |
| Always-blocked times | lunch 12:00–13:30 |
| Minimum notice | 48 hours |
| How far ahead | 3 months |
| Calendars that block bookings | any number, from any Google account |
| Google Meet link | on or off |

A slot is only offered if the **whole** spacing window is free in **every** calendar you list. That way your buffer between meetings is never booked over.

## Spam protection

- A hidden robot trap on the form.
- Each email address can have at most 2 requests waiting at once (you can change this).
- An overall cap on open requests.
- Nothing reaches your calendar as a real meeting until you accept it.

---

## Get started

👉 **[docs/SETUP.md](docs/SETUP.md)**: step by step, no coding knowledge needed, about 15–20 minutes.
👉 **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**: common snags and fixes.

### Files

All files in `src/` go into **one** Apps Script project in the Google account you want people to book with.

| File | What it is |
|---|---|
| `src/Booking.gs` | The engine. All settings are at the top. |
| `src/Booking.html` | The page people book on |
| `src/Decide.html` | The page behind your Accept / Decline button |
| `src/appsscript.json` | Switches on the Google Calendar API and sets the time zone |

---

## Tips

- **Use an account you're happy to give out.** Invitations and emails come from the account the booking page runs in. If you keep a private Gmail, run the booking page in a separate, public-facing account, and share your private calendar to it as *free/busy*.
- **All-day events** count as *Free* in Google unless you set them to *Busy*. Mark days off as *Busy* to block them.
- **Email limit:** free Gmail accounts can send about 100 emails a day from scripts. Each booking uses 2–3, so that's plenty for personal use.
- **Changing a confirmed meeting:** do it in Google Calendar as usual, and the guest gets the update.

## Privacy

| What | Who sees it |
|---|---|
| Your free slots | Anyone with the link |
| Your other calendars | Only busy/free times, never titles or details |
| Requests | Only you (by email, and stored in your own script) |

## Contributing

Ideas and improvements are welcome: open an issue or pull request. Please don't include real email addresses or calendar IDs in examples.

## Licence

MIT. See [LICENSE](LICENSE).
