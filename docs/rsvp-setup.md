# RSVP setup — Google Sheet + Apps Script

The invitation is a static site on GitHub Pages, which can't store anything.
This gives it somewhere to post to: a script that lives inside your own
spreadsheet, published at a URL, running under your Google account.

Nothing secret ends up in the page. The URL is public, but all it can do is
whatever `doPost` below says — append a row. Nobody can read the guest list,
change it, or reach anything else in your Drive with it.

**Until you finish this, the site still works.** With `RSVP_ENDPOINT` empty in
`app/config.ts`, the RSVP button opens an email instead of the form.

**One script does two jobs.** The invitation also hides a small game — two taps
on the balloon, see `docs/game.md` — and its scores go into the *same*
spreadsheet, on a tab of their own. The script below reads a `kind` field off
each post and files the row accordingly, so there is one deployment to keep
public and one URL to keep right, rather than two of each.

---

## 1. The sheet

Make a new Google Sheet. That's all — the script creates both of its tabs, with
their headers, the first time each is needed.

`RSVPs`, written when a guest replies:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | Name | Guest type | Message | Public | Approved |

The script fills A–E. **Column F is yours** — see "A public guestbook" at the
bottom.

`Game`, written when somebody finishes a run of the hidden game:

| A | B | C |
|---|---|---|
| Timestamp | Name | Score |

Nothing there is ranked or de-duplicated — every finished run is its own row,
several by the same person included. Sort by column C to read the leaderboard.

If you'd rather make either tab by hand, call it `RSVPs` and `Game` and the
script will use it as-is. Capitals and stray spaces don't matter — `GAME`,
`game` and `Game ` all resolve to the same tab, deliberately. See `getSheet`
below for the silent failure that saves you from.

One thing a tab you made by hand won't have is the header row: the script only
writes those for a tab it created itself, since it can't tell an empty sheet
from one whose first row is already yours. Either type `Timestamp`, `Name`,
`Score` into row 1 of `Game`, or delete the empty tab and let the first saved
score build it — headers, frozen row and all.

## 2. The script

**Extensions → Apps Script.** Delete whatever's in the editor, paste this in,
and save.

```js
const RSVP_SHEET = "RSVPs";
const GAME_SHEET = "Game";

const RSVP_HEADERS = ["Timestamp", "Name", "Guest type", "Message", "Public", "Approved"];
const GAME_HEADERS = ["Timestamp", "Name", "Score"];

// The form sends the key, not the wording, so the sheet stays readable even
// if the labels on the page are reworded later.
const GUEST_TYPES = {
  family: "Family / Relative",
  friends: "Friends / Godparents",
};

/**
 * One tab — found if you already made it, created with its headers if not.
 *
 * Looking a tab up by name and trusting it to exist is how you get
 * "Cannot read properties of null (reading 'appendRow')" from a tab that
 * was never renamed off Sheet1. Making the script responsible for its own
 * tabs removes that.
 *
 * The loose match removes the other half, which is worse because it fails
 * silently. `getSheetByName` is exact and case-sensitive: a tab you added by
 * hand as "Game" is not the "GAME" a script asks for, and the script would
 * cheerfully create a second tab of its own beside yours and write every row
 * into that one instead. Same for the trailing space you cannot see on a tab.
 * Case and stray spaces are ignored here, so whatever you called it wins.
 */
function getSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const wanted = String(name).trim().toLowerCase();
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === wanted) return sheets[i];
  }

  const sheet = ss.insertSheet(name);
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * Receives one post from the invitation — an RSVP, or a finished game — and
 * appends it to whichever tab it belongs in.
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

    // `kind` is how the two halves of the site are told apart. The RSVP form
    // doesn't send one — it predates the game — so anything without it is an
    // RSVP. That is also what lets an older build of the page keep working
    // against this script unchanged.
    return data.kind === "game" ? saveScore(data) : saveRsvp(data);
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function saveRsvp(data) {
  const name = String(data.name || "").trim();
  if (!name) return json({ ok: false, error: "Name is required" });

  const guestType = GUEST_TYPES[String(data.guestType || "")] || "";

  getSheet(RSVP_SHEET, RSVP_HEADERS).appendRow([
    new Date(),
    name.slice(0, 100),
    guestType,
    String(data.message || "").trim().slice(0, 1000),
    data.public ? "Yes" : "No",
    "", // Approved — left for you to tick
  ]);

  return json({ ok: true });
}

function saveScore(data) {
  const name = String(data.name || "").trim();
  if (!name) return json({ ok: false, error: "Name is required" });

  // Both forced here as well as in the page. The endpoint is public, so the
  // page's own validation is a convenience, not a guarantee.
  const score = Math.max(0, Math.floor(Number(data.score) || 0));

  getSheet(GAME_SHEET, GAME_HEADERS).appendRow([new Date(), name.slice(0, 100), score]);

  return json({ ok: true });
}

/**
 * The leaderboard the game's "Scoreboard" button reads.
 *
 * One row per *person*, not per run — their best. A leaderboard is a list of
 * who is good at this, and without the fold one determined ten-year-old fills
 * all ten places with the same name. Matched case-insensitively, since "Mika"
 * and "mika" are the same cousin.
 *
 * Only a name and a score go out. Not the timestamp: this URL is public, and
 * when somebody played is nobody's business.
 */
function topScores(limit) {
  const sheet = getSheet(GAME_SHEET, GAME_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];

  // Columns B and C — name and score — from row 2, skipping the header.
  const rows = sheet.getRange(2, 2, last - 1, 2).getValues();

  const best = {};
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][0] || "").trim();
    const score = Math.floor(Number(rows[i][1]));
    if (!name || !isFinite(score)) continue;

    const key = name.toLowerCase();
    if (!best[key] || score > best[key].score) {
      best[key] = { name: name.slice(0, 100), score: score };
    }
  }

  const out = [];
  for (const key in best) out.push(best[key]);
  out.sort(function (a, b) { return b.score - a.score; });
  return out.slice(0, limit);
}

/**
 * Read requests: the leaderboard, and a health check.
 *
 * `?board=game` returns the top ten. Anything else returns the health check —
 * visiting the /exec URL in an incognito window should print it. If you get a
 * Google sign-in page instead, the deployment is not public; see "403
 * Forbidden" below. The two flags confirm both tabs resolved; no counts are
 * reported, since this URL is public.
 */
function doGet(e) {
  const what = e && e.parameter ? String(e.parameter.board || "") : "";

  if (what === "game") {
    try {
      return json({ ok: true, top: topScores(10) });
    } catch (err) {
      return json({ ok: false, error: String(err) });
    }
  }

  let rsvpOk = false;
  let gameOk = false;
  try {
    rsvpOk = Boolean(getSheet(RSVP_SHEET, RSVP_HEADERS));
    gameOk = Boolean(getSheet(GAME_SHEET, GAME_HEADERS));
  } catch (err) {
    // Whichever threw stays false, which is the thing worth reporting.
  }
  return json({ ok: true, service: "rsvp", rsvpOk: rsvpOk, gameOk: gameOk });
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

`GAME_ENDPOINT`, a few lines below it, is set to this same constant — so the
game needs nothing else pasted anywhere.

Rebuild, submit a test RSVP, check the row lands, delete the test row. Then
play the game badly on purpose, save the score, and check that one lands in
`Game` rather than in `RSVPs`. If it lands in the wrong tab, see below.

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

An older `getSheetByName("RSVPs")` found no such tab and returned `null`. Note
what this error *doesn't* say — `getActiveSpreadsheet()` worked, so the script
is correctly bound to the spreadsheet. It's only the tab name.

Usually the tab is still called `Sheet1`, or differs in case, or has a
trailing space that's invisible on the tab itself.

Renaming the tab to `RSVPs` fixes it with no redeploy — the name is read on
every call. The version of the script above avoids the problem entirely by
creating the tab itself.

### Scores land in the RSVPs tab, with a name and nothing else

**This is the one everybody hits once, and it is always the same cause:** the
deployment being served is an older script that has never heard of `kind`, so
it files a game post as an RSVP — with no guest type and no message, which is
exactly how you spot the rows.

Redeploy and it stops: *Deploy → Manage deployments → ✏️ → Version: **New
version** → Deploy*. The URL doesn't change and the site needs no rebuild.
Pasting the script in and saving is **not** enough on its own — see "Things
that will bite you" below.

The rows already in the wrong place are only misfiled, not lost. They are the
ones with columns C, D and E empty: cut each row's B (name) into `Game`
alongside its A (timestamp), put the score in C, and delete the row from
`RSVPs`. If there are more than a handful, sort `RSVPs` by column C — every
real RSVP has a guest type there and every misfiled score does not, so they
gather in one block.

The reverse can't happen, deliberately: the RSVP form sends no `kind` at all,
so the script above files it as an RSVP. An invitation built before the game
existed works against the new script unchanged.

### Scores go to a tab called `GAME` instead of the `Game` you made

You are on a script whose `GAME_SHEET` doesn't match your tab's capitalisation,
and `getSheetByName` is exact — so it made its own tab rather than finding
yours. The `getSheet` above matches loosely and can't do this; take that
version, delete the tab the script created, and redeploy.

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
