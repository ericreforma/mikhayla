# The hidden game

There is a small running game inside the invitation. **Tap the floating balloon
twice** — the one that climbs the right-hand edge as you swipe through the
sections — and it opens at `/mikhayla/escaped`.

Nothing links to it and nothing mentions it. The route is `noindex`, so it will
not turn up in a search either. Finding it is the whole of the idea: the
children at the party will, and nobody else need ever know it is there.

**The URL is `/escaped`, not `/game`**, and that is the only place the disguise
lives. A URL is the part of a hidden thing that gets read over somebody's
shoulder, pasted into a chat and guessed at — and `/game` is the first guess
anyone makes. In the codebase it is still a game and still filed under
`app/game/`; see **The files**.

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
| **Tap** | A hop of 1.3 blocks. Clears a plain bush, in a window of about 164ms. |
| **Hold** | Up to 1.65 blocks, reached after 220ms. 276ms of window, and the only thing that reliably clears a wide bush. |
| **Lives** | Three. A hit costs one and buys 1.3 seconds of blinking immunity. |
| **Score** | Ten a second at the starting speed, and it counts distance — so a faster tier earns faster. |
| **Every 500 points** | The world speeds up, to a ceiling of 1.6× the starting speed, reached at three thousand. |
| **Every 300 points** | The sky turns: morning → afternoon → sunset → evening → dawn → morning. Nothing names them; the light does the telling. |
| **Every full day** (1500 points) | The weather turns: clear → rain → snow → clear. |

### The weather

A slower wheel turning over the top of the day: **clear, then rain, then snow,
then clear again**, one turn per complete day. The first full round of the
clock is dry, it rains through the second, it snows through the third.

| | |
|---|---|
| rain | 1500 points, about two and a half minutes in |
| snow | 3000 points, about four |
| clear | 4500, and round again |

**Rain is a change to the palette, not a grey sheet over the finished frame** —
which is the whole difference between a scene under cloud and a scene behind a
dirty window. Every surface darkens by its own amount (the sky most, because
that is where the cloud is; the ground least, because the ground is lit by the
sky rather than being it) and they go toward one slate blue rather than toward
black, because an overcast day is blue-grey and a dimmed one is just dim. The
sun fades out with it, the stars go, there are twice as many clouds and they
are bigger, the drops are short ticks rather than streaks, and the ground turns
wet: a sheen along the grass line, dark puddles with a bright lip, and splashes
opening and fading where the rain lands.

**Snow does the opposite to the same palette, and to the obstacles as well.**
The ground, the bushes, the rabbits, the birds and the rolling stone all go
white; so do the sky and the clouds, and there are twice as many of them; and
there is still no sun. Two things deliberately do not go white. The **fruit on
the bushes** stays red, because it is the one thing on the field that survives
both weathers and is what a player actually tracks. And the **dark keyline**
every obstacle carries is never touched by any weather — on a white ground
under a white sky it is the only thing holding the shapes apart.

The whitening is *partial*, and per surface. The ground takes the most, because
snow lies on it; the sky takes less than it looks, because a white sky that has
lost its hour is a blank page. A snowy midnight is blue-white and a snowy
sunset is pink-white, and both stop being either if the mix goes to one.

Each weather takes eight seconds to arrive rather than switching on, because
weather that appears in a frame reads as a bug in the renderer. Both are stored as
eased 0-to-1 strengths rather than as an index with a crossfade beside it,
which is what makes the handover free: on the boundary the rain is still
falling off as the snow comes in, which is exactly what that boundary should
look like. Clear weather is both at zero and costs two comparisons.

Not a drop of it is stored. Every streak and every flake is a function of its
own index and the clock — the same trick the hills and the stars use — so a
storm that lasts four minutes allocates nothing.

`WEATHER_POINTS` is `SKY_POINTS` times the length of a day, so shortening the
clock shortens the weather with it — the two wheels stay in step by
construction rather than by being kept in step.

**To look at any of it without playing for four minutes**, pin it from the URL:

```
/mikhayla/escaped?weather=rain
/mikhayla/escaped?weather=snow&sky=3     snow at night
/mikhayla/escaped?sky=2                  sunset, clear
```

`sky` is 0 to 4 — morning, afternoon, sunset, evening, dawn. Both are read once
and applied to every run, restarts included, so a look at the snow does not end
the moment you die, and the weather is snapped on rather than eased in.

They change the light and nothing else: not the speed, not the spawns, not the
score. A run with the weather pinned is a real run and its score still counts,
which is deliberate — a debug switch that quietly invalidated the scoreboard
would be a worse bug than the one it was added to find.

### What is in the way

Four kinds, nine variations, each arriving in its own turn — one idea at a
time, so nothing argues with what the button has just taught.

| From | | |
|---|---|---|
| 0 | **Rock** | A one-block bush, fruit and all. Jump it — 164ms tap, 276ms hold. |
| 150 | **Bird, flying** | The second block up, over a standing player's head. **Run under it** — any jump is a hit. |
| 150 | **Bird, grounded** | The first block, which is where a rock sits. **Jump it**, with exactly a rock's window. |
| 250 | **Rabbit** | Sitting at its burrow. Three quarters of a block, so the jump that clears it is a comfortable one — 232ms. |
| 400 | **Bird, diving** | Flying, then drops a block into your path. Run under, then jump. |
| 400 | **Bird, climbing** | Grounded, then climbs a block out of it. Jump, then don't. |
| 400 | **Rabbit, popping up** | An empty hole, until a rabbit comes out of it. |
| 400 | **Rabbit, burrowing** | A rabbit, until it drops out of sight. |
| 550 | **Rock, wide** | 1.7 blocks of the same hedge. 88ms on a tap against 200 on a hold — the obstacle that teaches the button. |
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
app/escaped/      the route, and only the route
  page.tsx      the page, and the turn-your-phone gate.
  layout.tsx    the title, and the `noindex` that keeps it out of search.

app/game/         the game itself. No page.tsx, so not a route at all.
  tuning.ts     every number, in blocks and seconds. Start here.
  engine.ts     the simulation. No DOM, no React, no pixels.
  render.ts     the canvas. The only file that knows what a pixel is.
  Game.tsx      canvas sizing, the loop, the HUD, the controls.
  Cards.tsx     the panels: before, paused, after, and the scoreboard.
  scores.ts     posting to the sheet, and the personal best on the device.
  sfx.ts        the noises. Nothing else in the game knows it makes any.
  orientation.ts   landscape, and asking to stay that way.
  entry.ts      the two constants the balloon and the game have to agree on.
```

Two folders because the App Router makes a folder name a URL segment, and the
URL is in disguise while the source should not be. `app/game/` has no
`page.tsx`, which is all it takes to stop being a route — Next only makes one
where it finds a page.

**The artwork and the sounds stay at `/game/…`**, in `public/game/`. Those are
asset paths rather than routes: `/mikhayla/game` itself is a 404, and nothing
reaches the files under it without first having found the game.

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
| Easier or harder | `PLAYER_INSET` / `ROCK_INSET`. They are the hitbox margins, and between them they set the window of correct jump timing — 164ms for a tap on a plain bush as it stands, 276ms for a hold. Raise them to forgive more; past about `ROCK_INSET` 0.18 the wide bush stops being a hold gate. |
| Slower or faster | `SPEED_BASE`, `SPEED_STEP`, `SPEED_MAX`. |
| Points less briskly | `SCORE_RATE` (ten a second). |
| Speed up more or less often | `TIER_POINTS` (every five hundred). |
| When each obstacle starts | `BIRD_FROM`, `RABBIT_FROM`, `TRICKS_FROM`, `WIDE_ROCK_FROM`, `BOULDER_FROM`. |
| How much warning a change gives | `CHANGE_LEAD_S` (seven tenths of a second). |
| A longer or shorter day | `SKY_POINTS` (every three hundred). |
| How often the weather turns | `WEATHER_POINTS` — a full day of sky, so clear, then rain, then snow. |
| Footsteps out of step with her legs | `STEP_PHASE`, measured off the sheet. Only if the artwork changes. |
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
is 2.8 blocks, which is 412ms at the starting speed — five steps a second, a
child's run — and quickens with every tier.

That number went *up* to 3.8 when the artwork had eight frames and the legs
were a strobe, and most of the way back down once it had sixteen: eight poses
in a third of a second is unreadable, sixteen is smooth. The frame count was
the problem, not the pace. The jump's five frames read off her vertical speed for
the same reason — a jump cut short by a tap and one held to full height both
show the right frame at the right moment, with no timer to keep in step.

**The obstacles are still drawn in code** — a fruiting bush built column by
column out of three overlapping mounds, a bird whose wings beat off the clock,
a rabbit at its burrow, a round stone that turns as it rolls. Those are
placeholders and are meant to be replaced.

**The bush's hitbox is 0.70 x 0.85 of a block, not the whole block**, and that
is the box agreeing with the picture rather than a difficulty dial turned down.
A bush is three overlapping mounds: its corners are empty and its crown reaches
about 0.84 of the way up the block, so a full-block box collected hits from a
player who had cleared the leaves by a visible margin. The top of the box now
sits at 0.85, which is where the foliage actually stops.

A green obstacle on green ground is the other real legibility problem here, and
it is solved three ways at once rather than by hoping: the foliage is darker
and far more saturated than either the grass or the hazed hills, every bush
carries the same dark keyline as everything else that can hit you, and the
fruit is **red** — the one hue nothing else on the field shares. The fruit is
doing the most work. A player reads "red dots" long before they read "bush".

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

## Sound

Twelve sounds, built by `scripts/build-audio.py` out of `assets-src/game/sfx/`
— **15.4MB** of 256kbps stereo in, **959KB** of mono AAC out:

```
python scripts/build-audio.py
```

| Sound | When |
|---|---|
| `button` | any button in the game, anywhere |
| `main-menu` | looping while a menu card is up, stopping when it closes |
| `jump` | a jump that actually leaves the ground |
| `step-grass` / `step-rain` / `step-snow` | each footfall, by the weather |
| `hurt` | a heart lost with hearts still left |
| `gameover` | the last heart, with nothing to celebrate |
| `winner-self` | the last heart, having beaten your own best |
| `winner-all` | the last heart, having beaten the board |
| `raining` / `snowing` | under everything, at whatever level the sky is at |

The last three are **one sound, not three**: topping the board swallows topping
yourself, and either of them replaces the game over rather than playing over
it. The run ended, but that is not the news.

### The menu loop follows the card

It starts when the menu card appears and stops when it closes — the name card
and the title-and-instructions card are both "the menu", and the status never
returns to `ready`, so it plays once, at the door.

**It does not wait for anybody to touch anything**, and that was a real fix
rather than a preference. The way in is two taps on a balloon followed by
`router.push`, which keeps the same document — so by the time the card exists
the page has already been interacted with and the browser will allow sound.
Waiting for a *fresh* gesture inside the game left the title card sitting in
silence until the player prodded something, which is the one moment the music
is for. A guest who lands on `/mikhayla/escaped` cold instead — a bookmark, a
reload, a shared link — has no such gesture, `play()` is refused, and the
rejection arms a one-shot listener so the music starts on their first touch.

**Stopping it needs a timer as well as the fade**, which looks redundant and is
not. `fadeAudio` ramps on `requestAnimationFrame`, and a browser stops
delivering those to a tab that is not on screen — so the callback that pauses
can simply never arrive. Leaving the game is a navigation, and a navigation is
exactly when rAF stops, so without the timer the menu music follows the guest
back out to the invitation and plays over its own.

### The weather beds, and why they wait

`raining` and `snowing` arrived as 2:05 and 5:01 — **13.6MB of the 15.4MB
source**, for two sounds that play under a game nobody is listening to
closely. They are cut to a 30-second loop each, which is 95% and 98% off.

Trimming them was not only about bytes. The rain **decays**: it opens as a
downpour and tapers to a drizzle, so looping the file whole would have snapped
back to the downpour every two minutes under a sky that never changed. Both
windows were chosen by measuring the level envelope — steadiest stretch, ends
that already agree, no transient inside to become a metronome, and above the
file's own average so the bed is weather rather than hiss.

The loop is made by folding the tail back over the head with a **quarter-sine**
crossfade, and that curve is not a detail. Rain crossfaded against rain is two
*uncorrelated* noise sources, which sum by power rather than amplitude — a
linear fade dips about 3dB through the middle, a hole in the rain every thirty
seconds. Measured, against a deliberately-linear control: linear sagged
**−31.7% (−3.31 dB)** at exactly the crossfade midpoint; quarter-sine holds to
−4.5%, inside the wind's own variation.

**Neither is downloaded until the weather turns.** They are 424KB between
them — nearly half the game's audio — and the weather does not arrive until
1500 points, which is two and a half minutes of running without losing three
lives. Most guests will never hear either. The elements are created and
unlocked on the first gesture (on `SILENCE`, the same trick the invitation's
players use, because iOS gates the first `play()` per element) but point at
nothing until `rain` or `snow` goes above zero — at which moment there is an
eight-second ramp to arrive over.

Verified against a logging server on the real export: holding clear weather
fetches **no** bed and all nine effects; raising rain and snow fetches both.

### Two players, on purpose

The short effects are decoded once into Web Audio buffers and fired from
memory, because a footstep lands five times a second and an `<audio>` element
can only be in one place at a time. The three long loops — the menu and the two
weather beds — stay elements: the menu is 42 seconds and 386KB, and Web Audio
would need all of it decoded, 7MB of float samples, before it could play a
note, where an element starts on the first buffer. That is not theoretical; the
decode check written to verify this never finished decoding it inside a minute.

Two warnings for anyone testing this:

- **`performance.getEntriesByType("resource")` does not report `<audio>`
  element loads in Chrome**, so an in-page probe will tell you a file was never
  fetched when the server has plainly just served it. Check the server's log,
  not the page's.
- **Volume fades do not advance under headless Chrome's virtual time**, so
  every element reads `volume 0.00` there however long you wait. That says
  nothing about the fade; to check whether something is *sounding*, read
  `paused`, not `volume`.

### Every sound is an edge, found in the loop

Nothing in `engine.ts` makes a noise, and nothing calls into `sfx.ts` from the
place that caused the sound. The frame loop in `Game.tsx` watches the
simulation for the transitions instead — `grounded` going false is a jump,
`lives` going down is a hurt, `status` going `over` is an ending.

That is what keeps the engine runnable in Node with no browser, which is how
every figure in `tuning.ts` was measured. It also means there is exactly one
place a jump can be announced from, however many ways there are to ask for one.

The footsteps are counted off **distance**, not time, for the same reason the
animation is: tie them to a clock and the sound drifts out of her legs as the
tiers speed up. They land on `STEP_PHASE` — frames 6 and 14 of the sixteen,
found by measuring where the silhouette is widest near the ground, which is
where a foot is planted. Measured: 4.85 steps a second at the base speed
against 4.86 predicted, rising to 5.45 by the third tier.

### It can always fail

Every entry point in `sfx.ts` returns `void`, nothing awaits anything, and no
state in it is read from outside. A browser that refuses to make a sound, a
file that 404s and a guest with the ringer off all produce the same outcome: a
game that plays perfectly and says nothing.

**The invitation's own music switch silences it too** — `sfx.ts` reads the same
`mikhayla:music` preference the deck writes. There is no separate control in
the game, so turning the sound off is done on the invitation before coming in.

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

### The flow

**The menu comes first; the question comes second.** The game opens on its own
title card — the name, the three rules, and the three ways on. Only when a
player presses **▶** without a name on file does it ask "Who is playing?", with
one instruction: *your full name, please, there will be more than one Mika at
this party*. They answer and the run begins in the same breath; there is no
second stop at the menu.

That order matters. A guest who has just found a hidden game should see what
they have found before being asked to fill anything in — a form as the very
first thing on screen reads like a sign-up, and a sign-up is what people close.

The name is still asked **once** and kept on the device exactly as the RSVP
keeps its own, so every visit after that opens on "Welcome back, …" and goes
straight from **▶** into a run. That one move is what makes everything after it
quiet: **a finished run uploads itself**, with no form at the end and nobody
asked to type while they are still looking at the number they just got.

The RSVP name **fills the box but never answers for them**, and the code keeps
the two apart on purpose — `name` is what they told *this game* and is empty
until they do; `suggestion` is what they RSVP'd as and only ever prefills the
box. Folding them together would let an RSVP walk somebody straight past the
door, which is the one thing the door is there to stop: a card is signed "Mika"
and a scoreboard needs the name on a register.

The menu carries **Change name** (or **Set your name**, before there is one to
change), and it is not a nicety. A party is one phone passed between six
children; without it every one of their scores goes up under whoever typed
first. Backing out of that card returns to the menu rather than off the site —
the menu is always what it was opened from.

**A score only goes up if it beats what the board already holds for them**, and
that is measured against what was actually *sent*, not against their best. The
two come apart the moment a send fails — and deciding from the best would mean
a run of 500 that never left the phone locks out every later run under 500,
leaving the board empty for that player forever.

Both the menu card and the game-over card end on the same three ways on, in the
same order:

> **Invitation** · **▶** · **Scoreboard**

The middle one is deliberately giant rather than one of three equals. A player
sitting in front of either card is going to press play, and making them pick it
out of a row of look-alikes is a tax on the thing they came to do.

The game-over card adds a fourth, **Back to main menu**, on its own row
*beneath* the play button — never on the menu card, where you are already
standing on it. Underneath rather than alongside because it is not a way on at
all, it is a way back: three equals and a giant play button is a row that has
been designed, four equals and a giant one is a row that has had something
added to it. Pressing it builds a fresh world rather than reusing the spent
one, so the menu is painted over an untouched field and the next run starts as
clean as the first. Fullscreen and the orientation lock are left alone —
somebody going back to the menu is usually on their way to another run.

It is one component (`WaysOn`), not two rows that happen to match — the two
cards get edited at different times for different reasons, and a row that is
the same by coincidence stops being the same on the first of those edits.

On the game-over card none of them is drawn while the save is still in flight:
two of them throw the card away, and a save waiting on a round trip to Google
would go with it.

**Scoreboard** reads the board back- Setting `GAME_ENDPOINT` to `""` turns all of it off. The game still plays and
  still keeps the personal best.
