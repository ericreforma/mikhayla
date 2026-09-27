# RSVP setup — Google Sheet + Apps Script

The invitation is a static site on GitHub Pages, which can't store anything.
This gives it somewhere to post to: a script that lives inside your own
spreadsheet, published at a URL, running under your Google account.

Nothing secret ends up in the page. The URL is public, but all it can do is
whatever `doPost` below says — append a row. Nobody can read the guest list,
change it, or reach anything else in your Drive with it.

**Until you finish this, the site still works.** With `RSVP_ENDPOINT` empty in
`app/config.ts`, the RSVP button opens an email instead of the form.

---

## 1. The sheet

Make a new Google Sheet. That's all — the script creates its own `RSVPs`
tab, with these headers, the first time an RSVP arrives:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | Name | Guest type | Message | Public | Approved |

The script fills A–E. **Column F is yours** — see "A public guestbook" at the
bottom.

(If you'd rather set it up by hand, name the tab exactly `RSVPs` — no
trailing space — and the script will use it as-is.)

## 2. The script

**Extensions → Apps Script.** Delete whatever's in the editor, paste this in,
and save.

```js
const SHEET_NAME = "RSVPs";
const HEADERS = ["Timestamp", "Name", "Guest type", "Message", "Public", "Approved"];

// The form sends the key, not the wording, so the sheet stays readable even
// if the labels on the page are reworded later.
const GUEST_TYPES = {
  family: "Family / Relative",
  friends: "Friends / Godparents",
};

/**
 * The RSVPs tab — created, with its headers, the first time it's needed.
 *
 * Looking it up by name and trusting it to exist is how you get
 * "Cannot read properties of null (reading 'appendRow')" from a tab that
 * was never renamed off Sheet1, or renamed with a trailing space. Making
 * the script responsible for its own tab removes the whole class of error.
 */
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Receives one RSVP from the invitation and appends it to the sheet.
 *
 * Runs as the sheet's owner, so the page never holds a credential.
 */
function doPost(e) {
  // Apps Script can run several executions at once, so two guests who submit
  // in the same second would otherwise race for the same row.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const data = JSON.parse(e.postData.contents);

    // Honeypot: a field hidden from real users. Bots fill in everything they
    // find, so anything arriving with this set is discarded — and told it
    // succeeded, because a bot that sees a failure tries again.
    if (data.website) return json({ ok: true });

    const name = String(data.name || "").trim();
    if (!name) return json({ ok: false, error: "Name is required" });

    const guestType = GUEST_TYPES[String(data.guestType || "")] || "";

    getSheet().appendRow([
      new Date(),
      name.slice(0, 100),
      guestType,
      String(data.message || "").trim().slice(0, 1000),
      data.public ? "Yes" : "No",
      "", // Approved — left for you to tick
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * A health check you can open in a browser.
 *
 * Visiting the /exec URL in an incognito window should print this JSON. If
 * you get a Google sign-in page instead, the deployment is not public — see
 * "403 Forbidden" below. `sheetOk` confirms the tab resolved; no counts are
 * reported, since this URL is public.
 */
function doGet() {
  let sheetOk = false;
  try {
    sheetOk = Boolean(getSheet());
  } catch (err) {
    sheetOk = false;
  }
  return json({ ok: true, service: "rsvp", sheetOk: sheetOk });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Publish it

**Deploy → New deployment → Web app**, then:

- **Execute as:** `Me`
- **Who has access:** `Anyone`

Authorise it. Google will warn you it's an unverified app — it's your own
script, so continue through *Advanced → Go to (project name)*.

Copy the URL it gives you. It looks like:

```
https://script.google.com/macros/s/AKfycb…/exec
```

## 4. Wire it up

Paste that URL into `app/config.ts`:

```ts
export const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycb…/exec";
```

Rebuild, submit a test RSVP, check the row lands, delete the test row.

---

## Troubleshooting

### `403 (Forbidden)` / `net::ERR_FAILED`

The deployment isn't public. The pair of errors is the giveaway: Google
returns a 403 sign-in page, and that page carries no CORS headers, so the
browser reports a network failure on top of it.

**Check it:** open the `/exec` URL in an incognito window.

| What you see | What it means |
|---|---|
| `{"ok":true,"service":"rsvp",…}` | Public and working — the problem is elsewhere |
| A Google sign-in page | Access is restricted — fix below |
| "Sorry, unable to open the file at this time" | Same: restricted, or wrong account |

**Fix:** *Deploy → Manage deployments → ✏️ → **Who has access: `Anyone`*** →
*Version: New version* → *Deploy*. The URL doesn't change.

It must be `Anyone`, not `Anyone with Google account`. The latter redirects
guests to a login page that `fetch` cannot follow cross-origin, which
produces this same error.

**If it already says `Anyone` and you still get 403,** the deployment being
served isn't the one you edited. Two causes, both common:

- *You have more than one deployment.* Each has its own `AKfyc…` id and its
  own URL. Open *Manage deployments* — if there's more than one entry, the
  site is probably pointing at an older one. Archive the strays.
- *The change was never committed.* The pencil dialog has a **Version**
  dropdown that must be switched to `New version` before *Deploy* does
  anything. Left on the existing version, the button looks like it worked
  and nothing was republished.

Rather than work out which is which, make a clean one: *Deploy → New
deployment → Web app → Execute as `Me`, Who has access `Anyone`*, and use
the new URL. Then archive the old deployments.

**If `Anyone` isn't in the list,** the account owning the sheet is a
Workspace (work or school) account whose admin has restricted publishing web
apps outside the organisation — you'll only be offered "Anyone within
*[org]*". Redeploying won't help. Recreate the sheet under a personal
`@gmail.com` account and deploy from there; the site doesn't care which
account it is.

### `TypeError: Cannot read properties of null (reading 'appendRow')`

`getSheetByName("RSVPs")` found no such tab and returned `null`. Note what
this error *doesn't* say — `getActiveSpreadsheet()` worked, so the script is
correctly bound to the spreadsheet. It's only the tab name.

Usually the tab is still called `Sheet1`, or differs in case, or has a
trailing space that's invisible on the tab itself.

Renaming the tab to `RSVPs` fixes it with no redeploy — the name is read on
every call. The version of the script above avoids the problem entirely by
creating the tab itself.

### The form posts but no row appears

You edited the script without redeploying — see below.

## Things that will bite you

**Editing the script doesn't change what's live.** After any edit you must go
to *Deploy → Manage deployments → ✏️ (pencil) → Version: **New version** →
Deploy*. If you click *New deployment* instead you get a **different URL**,
and the site keeps hitting the old code. This catches everyone exactly once.

**The `text/plain` content type in the page is deliberate.** `application/json`
would make the browser send a CORS preflight `OPTIONS` request first, and
Apps Script web apps have no way to answer one — so the real POST never
happens, and the console blames CORS rather than the header. The body is
still JSON; `JSON.parse` on the other side doesn't care what the header said.

**Quotas** are generous — thousands of executions a day on a free account,
30 at once. A birthday invitation is nowhere near.

**The endpoint is public.** The honeypot stops bots. Nothing stops a
determined person adding junk rows, which at this scale is fine — you'll be
reading the list by eye anyway.

---

## A public guestbook

Guests can tick "share my message" on the form, which lands as `Yes` in
column E. **Right now nothing displays those** — the flag is recorded and
that's all.

Showing them on the site needs a second piece: a `doGet` that returns only
the rows where you've ticked column F, and a section on the page that fetches
it. The `Approved` column matters — it means nothing a guest types appears on
your daughter's invitation until you've read it.

Ask and I'll build both.
