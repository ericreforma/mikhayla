# The hidden game

There is a small running game inside the invitation. **Tap the floating balloon
twice** — the one that climbs the right-hand edge as you swipe through the
sections — and it opens at `/mikhayla/game`.

Nothing links to it and nothing mentions it. The route is `noindex`, so it will
not turn up in a search either. Finding it is the whole of the idea: the
children at the party will, and nobody else need ever know it is there.

---

## How it plays

A block-built runner, the shape of the dinosaur that appears when Chrome loses
its connection. Mikhayla's head runs to the right; you have one button.

| | |
|---|---|
| **The control** | The right-hand half of the screen. All of it, not just the round button — a thumb on a phone held in two hands lands where it lands. Space, ↑ or W on a keyboard. |
| **Tap** | A hop of 1.3 blocks. Clears an ordinary rock, in a window of about 96ms. |
| **Hold** | Up to 1.65 blocks, reached after 220ms. 204ms of window, and the only thing that clears a two-block rock. |
| **Rocks** | One block, sometimes two side by side from 300 points. Jump them. |
| **Birds** | Fly at head height. **Don't jump** — run underneath. Any jump at a bird is a hit. |
| **Lives** | Three. A hit costs one and buys 1.3 seconds of blinking immunity. |
| **Score** | Ten a second at the starting speed, and it counts distance — so a faster tier earns faster. |
| **Every 100 points** | The world speeds up, to a ceiling of twice the starting speed. |
| **Every 1000 points** | The sky turns: morning → afternoon → sunset → evening → dawn → morning. Nothing names them; the light does the telling. |

The hitboxes sit at the edge of the drawings, so a near miss is a hit. That is
the difficulty, and it is deliberately the tightest at the *start* — see
`PLAYER_INSET` in `tuning.ts`, which carries the measured windows and the
reason a faster run is easier to jump in, not harder.

It is **landscape only**, and turning the phone upright shows a card rather
than a cramped game. That is not fussiness: the field is seven blocks tall and
a player needs to see a dozen blocks of ground ahead to have any warning at
all. Portrait gives four.

Starting a run also asks for fullscreen and for the orientation to be locked.
Both are allowed to fail — an iPhone grants neither — and nothing depends on
having got them.

---

## The files

```
app/game/
  tuning.ts     every number, in blocks and seconds. Start here.
  engine.ts     the simulation. No DOM, no React, no pixels.
  render.ts     the canvas. The only file that knows what a pixel is.
  Game.tsx      canvas sizing, the loop, the HUD, the controls.
  Cards.tsx     the three panels: before, paused, after.
  scores.ts     posting to the sheet, and the personal best on the device.
  orientation.ts   landscape, and asking to stay that way.
  page.tsx      the route, and the turn-your-phone gate.
  entry.ts      the two constants the balloon and the game have to agree on.
```

The split between `engine.ts` and everything else is the one worth keeping. The
simulation is a pure function of its own state at a fixed 120Hz step, which is
why a 60Hz laptop and a 120Hz phone run the identical game — and why the
mechanics can be checked by running the engine in Node with no browser at all,
which is how every figure quoted in `tuning.ts` was arrived at.

---

## Changing it

**All the dials are in `app/game/tuning.ts`**, each with the arithmetic that
chose it written above it. The ones most likely to be wanted:

| Want | Change |
|---|---|
| Easier or harder | `PLAYER_INSET` / `ROCK_INSET`. They are the hitbox margins, and between them they set the window of correct jump timing — 96ms for a tap on an ordinary rock as it stands, 204ms for a hold. Raise them to forgive more. |
| Slower or faster | `SPEED_BASE`, `SPEED_STEP`, `SPEED_MAX`. |
| Points less briskly | `SCORE_RATE` (ten a second). |
| Speed up more or less often | `TIER_POINTS` (every hundred). |
| A longer or shorter day | `SKY_POINTS` (every thousand). |
| More or fewer lives | `LIVES`. |
| Different weather | `SKIES` — five flat lists of colours. Add a sixth and the cycle simply gets longer. |

Note which way speed runs: a **faster** world is *easier* to jump over things
in, because the airtime is fixed and a faster world spends less time crossing
the same rock. What makes a later tier hard is having less warning, not a
harder jump. Slowing the game down to make it kinder does the opposite.

---

## The artwork

The player, the rocks and the birds are all drawn in code at the moment — a
crowned pixel head, a stone boulder, a bird whose wings beat off the clock.
They are placeholders and are meant to be replaced.

To replace one, drop a file in `public/images/game/` and name it in
`app/config.ts`:

```ts
export const GAME_PLAYER_SPRITE = asset("/images/game/player.png");
```

One block square, PNG or WebP with transparency, 128px is plenty. There are
three slots — `GAME_PLAYER_SPRITE`, `GAME_ROCK_SPRITE`, `GAME_BIRD_SPRITE` —
and each is independent: fill one and the other two keep their drawings.

Nothing else changes. A sprite that fails to load leaves its slot empty and the
drawing comes back, so a typo in a path is a cosmetic problem rather than a
broken game. Animation can arrive the same way later: the renderer already
gives a bird its wingbeat by squashing whatever it is handed, so a single still
frame arrives moving.

---

## The scoreboard

When a run ends, the player is asked for a name and the score is posted to the
**same Google Sheet the RSVPs go to**, on a tab called `Game` — timestamp, name,
score. One Apps Script deployment serves both; it tells them apart by a `kind`
field on the post, and nothing in this repo names the spreadsheet, because the
script is *bound* to it rather than pointed at it.

**Set it up — and redeploy it — through `docs/rsvp-setup.md`.** An older
deployment that predates the game files scores into `RSVPs` instead, which is
the one failure anybody actually meets; that document says how to spot the
misfiled rows and move them.

**Top 10** on the start and game-over cards reads the board back — `?board=game`
on the same URL, answered by `topScores` in the script. Ten numbered rows and a
**Refresh**. It is one row per *person*, their best, not one per run: without
that fold one determined ten-year-old fills all ten places. Names are matched
case-insensitively, and only a name and a score go out — never the timestamp,
because the URL is public and when somebody played is nobody's business.

**The board is fetched in the background**, not when the panel opens. The game
asks for it as it mounts and again at the start of every run (which is also
what refreshes it after a score has just been saved), and the answer is kept in
a module-level cache in `scores.ts`. Two things come of that: the panel opens
on a list rather than a spinner, and the HUD can put **the current leader under
the live score** — name and all — so there is a number on screen to chase. It
goes gold the moment the run passes it.

Nothing waits on any of that and nothing reports it failing. If the board never
arrives, the line under the score falls back to this device's own best.

A few more things the game does on its own:

- **The name box is prefilled** from whatever the guest RSVP'd as, if they did.
  It is very often the only time anyone will have typed their name on this
  site, and a prefilled box is the difference between a board of names and a
  board of blanks. It takes 100 characters, capped in three places — the input,
  the page, and the script — because only the last of those is a guarantee.
- **A personal best is kept on the device**, in `localStorage`, so there is
  something to beat before the board has loaded, or at all.
- **While a save is in flight, the other buttons are gone.** "Run again" and
  "Back to the invitation" both throw the card away, and a save still waiting on
  a round trip to Google would go with it. They are not drawn rather than
  disabled: a greyed button still reads as something to wait out.
- **Everything about the sheet fails softly**, and one case is subtler than it
  looks. An Apps Script web app appends the row and *then* answers through a
  redirect, so a failure on screen often sits on top of a score that saved
  perfectly. The card distinguishes "the scoreboard said no" from "we never
  heard back" and only offers a retry for the first — see `submitScore`.
- Setting `GAME_ENDPOINT` to `""` turns all of it off. The game still plays and
  still keeps the personal best.
