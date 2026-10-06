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
its connection. Mikhayla runs to the right; you have one button.

She has three animations, and they are the game's whole feedback channel:
**running**, **jumping**, and **crying** for the second and a bit she is
untouchable after a hit. Hurt beats jumping, so a hit taken mid-air still
shows — it is the clearest signal in the game that a life has gone.

She is drawn **1.3 blocks tall against a hitbox of one**, so her tiara reaches
into the second block. That overlap is deliberate: only the box is ever hit, so
the worst it can look is a near miss that was in fact a miss — and a one-block
princess is a face too small to read an expression off.

| | |
|---|---|
| **The control** | The right-hand half of the screen. All of it, not just the round button — a thumb on a phone held in two hands lands where it lands. Space, ↑ or W on a keyboard. |
| **Tap** | A hop of 1.3 blocks. Clears a plain rock, in a window of about 108ms. |
| **Hold** | Up to 1.65 blocks, reached after 220ms. 216ms of window, and the only thing that clears a wide rock. |
| **Lives** | Three. A hit costs one and buys 1.3 seconds of blinking immunity. |
| **Score** | Ten a second at the starting speed, and it counts distance — so a faster tier earns faster. |
| **Every 500 points** | The world speeds up, to a ceiling of 1.6× the starting speed, reached at three thousand. |
| **Every 1000 points** | The sky turns: morning → afternoon → sunset → evening → dawn → morning. Nothing names them; the light does the telling. |

### What is in the way

Four kinds, nine variations, each arriving in its own turn — one idea at a
time, so nothing argues with what the button has just taught.

| From | | |
|---|---|---|
| 0 | **Rock** | A one-block chunk of castle battlement. Jump it. |
| 150 | **Bird, flying** | The second block up, over a standing player's head. **Run under it** — any jump is a hit. |
| 150 | **Bird, grounded** | The first block, which is where a rock sits. **Jump it**, with exactly a rock's window. |
| 250 | **Rabbit** | Sitting at its burrow. Three quarters of a block, so the jump that clears it is a comfortable one — 232ms. |
| 400 | **Bird, diving** | Flying, then drops a block into your path. Run under, then jump. |
| 400 | **Bird, climbing** | Grounded, then climbs a block out of it. Jump, then don't. |
| 400 | **Rabbit, popping up** | An empty hole, until a rabbit comes out of it. |
| 400 | **Rabbit, burrowing** | A rabbit, until it drops out of sight. |
| 550 | **Rock, wide** | 1.7 blocks of the same wall. The one obstacle a tap will not clear. |
| 700 | **Boulder** | Rolls at you, and accelerates the whole way in. |

Everything that changes, changes at **the same seven tenths of a second ahead
of the player**, whatever tier the run has reached — a time, not a distance,
because what it buys is reaction and that is measured in time. At the starting
speed that is the middle of the screen.

**A bird is one rule inverted, not two rules.** Blocks are counted as bands off
the ground, so the first block is the one a standing player fills — the same
band a rock fills — and the second is the one directly over their head. Which
band a bird is in is the whole question it asks: in the air, run under it; on
the ground, jump it like a rock. Measured, at the starting speed:

| | run under | jump window, tap / hold |
|---|---|---|
| flying | safe | — |
| grounded | hit | 108 / 216 ms, identical to a rock |

The clearance under a flying bird is 0.18 of a block. Tight on purpose: it
should look like a near miss, because it is one.

Two of the four changes make a safe thing dangerous and two make a dangerous
thing safe. That is deliberate: if every change were a threat the answer would
just be "treat everything as a threat", and the reading would stop being worth
doing.

The burrow is the one standing tell: a dark slot in the grass with a pale lip
above it. A slot says *something may happen here* — it never says what, and it
is drawn narrower than a rabbit so that a rabbit sitting on one covers it. If it
showed around a rabbit's feet you could tell the three apart at a glance, and
the whole of a rabbit is that you cannot. It is a line rather than an opening
because this ground is seen from directly to the side, where a hole has no
mouth to show.

The boulder is the only thing on the field the world does not simply carry, and
it needs its own allowance in the spacing — it closes on whatever is ahead of
it, so it is put out with three and a half blocks more room in front. Note that
moving faster makes it *easier* to jump, not harder: a faster thing spends less
time overlapping the player. It is a reaction test, not a timing one — 324ms of
jump window against a plain rock's 108.

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
  Cards.tsx     the panels: before, paused, after, and the scoreboard.
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
| How big she looks | `PLAYER_DRAW_H` (1.3 blocks). Changes nothing about the hitbox. |
| Easier or harder | `PLAYER_INSET` / `ROCK_INSET`. They are the hitbox margins, and between them they set the window of correct jump timing — 108ms for a tap on a plain rock as it stands, 216ms for a hold. Raise them to forgive more. |
| Slower or faster | `SPEED_BASE`, `SPEED_STEP`, `SPEED_MAX`. |
| Points less briskly | `SCORE_RATE` (ten a second). |
| Speed up more or less often | `TIER_POINTS` (every five hundred). |
| When each obstacle starts | `BIRD_FROM`, `RABBIT_FROM`, `TRICKS_FROM`, `WIDE_ROCK_FROM`, `BOULDER_FROM`. |
| How much warning a change gives | `CHANGE_LEAD_S` (seven tenths of a second). |
| A longer or shorter day | `SKY_POINTS` (every thousand). |
| More or fewer lives | `LIVES`. |
| Different weather | `SKIES` — five flat lists of colours. Add a sixth and the cycle simply gets longer. |

Note which way speed runs: a **faster** world is *easier* to jump over things
in, because the airtime is fixed and a faster world spends less time crossing
the same rock. What makes a later tier hard is having less warning, not a
harder jump. Slowing the game down to make it kinder does the opposite.

---

## The artwork

**She is real artwork.** Three sheets arrive in `assets-src/game/` and
`scripts/build-player.py` turns them into the strips the game animates:

```
python scripts/build-player.py

  running-sprite-16f.png         ->  public/game/run.webp    (16 frames)
  running-sprite-16f-crying.png  ->  public/game/hurt.webp   (16 frames)
  jumping-sprite.png             ->  public/game/jump.webp    (5 frames)
```

The originals stay outside `public/` for the same reason the photographs do —
three megabytes of source art nobody requests is three megabytes in the deploy.

Three things are wrong with the artwork as supplied, and the script's job is
all three:

- **Transparency, or the lack of it.** The run sheet has a real alpha channel;
  the jump sheet is RGB with a checkerboard *painted into it* where the
  transparency should be. The script does whichever a sheet needs — and for the
  painted one the obvious test ("light and grey") eats the white frills of her
  dress, so the background is found by flooding inward from the border instead.
  Her dress is enclosed by its own outline, so the flood stops at it and the
  white inside is never reached.
- **Baked drop shadows.** The game draws its own, which shrinks and fades as
  she rises; a second one painted onto her feet would ride up into the air with
  her. The keying threshold is set low enough to take them.
- **Two different scales.** She is drawn about a third larger on the jump sheet.
  Left alone she would visibly grow the moment she left the ground, so both are
  normalised on the width of her head — the one measurement a change of pose
  does not alter.

Before a crying run was supplied, the hurt strip was built here by pasting her
crying head from `faces.png` over her happy one. It worked and always looked
like what it was — a front-facing head grafted onto a body in profile — so the
whole apparatus came out the moment real artwork arrived. `faces.png` is still
in `assets-src/` and is no longer read by anything.

Every frame of all three strips shares one cell, one ground line and one head
centre, so she neither drifts nor jitters. Every cell also carries a
transparent gutter: frames laid edge to edge bleed into each other, because
`drawImage` with smoothing on has to interpolate at the boundary of the source
rectangle and the texels it reaches for there belong to the frame alongside —
which shows up as a sliver of the next pose down one side of her. The cell is
measured outward from her head rather than from her widest frame, for the same
reason: she is *placed* by her head, so a cell sized to a bounding box left the
airborne jump frame hanging over its own edge. The script prints the two numbers
`PLAYER_CELL` in `tuning.ts` needs; re-run it if the artwork is ever
re-supplied and check them.

**The run cycle is driven by distance, not by a clock** — at a fixed frame rate
her legs would run at the same speed however fast the world moved. One stride
is 3.8 blocks, which is 559ms at the starting speed and quickens with every
tier. That number did not change when the artwork went from eight frames to
sixteen: the sheet holds one whole stride either way, so the same number keeps
the same cadence and spends the extra frames on smoothness. The jump's five frames read off her vertical speed for
the same reason — a jump cut short by a tap and one held to full height both
show the right frame at the right moment, with no timer to keep in step.

**The obstacles are still drawn in code** — grey castle masonry with staggered
courses and a crenellated top, a bird whose wings beat off the clock, a rabbit
at its burrow, a round stone that turns as it rolls. Those are placeholders and
are meant to be replaced.

To replace one, drop a file in `public/game/` and name it in `app/config.ts`:

```ts
export const GAME_ROCK_SPRITE = asset("/game/rock.webp");
```

PNG or WebP with transparency, 128px is plenty. One block square each, except
the rabbit, which is drawn into a box 0.8 of a block wide by 0.75 tall. There
are four — `GAME_ROCK_SPRITE`, `GAME_BIRD_SPRITE`, `GAME_RABBIT_SPRITE`,
`GAME_BOULDER_SPRITE` — and each is independent: fill one and the rest keep
their drawings.

Nothing else changes. A sprite that fails to load leaves its slot empty and the
drawing comes back, so a typo in a path is a cosmetic problem rather than a
broken game. Animation can arrive the same way later: the renderer already
gives a bird its wingbeat by squashing whatever it is handed and rolls the
boulder by turning it, so a single still frame arrives moving.

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

**Scoreboard** on the start and game-over cards reads the board back — `?board=game`
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
