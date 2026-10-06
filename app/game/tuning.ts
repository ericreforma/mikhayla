/**
 * Every number the game is made of, in one place.
 *
 * ---------------------------------------------------------------------------
 * One unit: the block
 * ---------------------------------------------------------------------------
 * The world is built out of cubes, so nothing below is written in pixels. A
 * block is the unit of length, a second is the unit of time, and the renderer
 * is the only thing that ever multiplies by a pixel size — which is how the
 * same run plays identically on a 1600px laptop and on a 720px phone held
 * sideways. Change the screen and the picture grows; the game does not.
 *
 * The player is one block tall and one block wide. A rock is one block. A full
 * jump is a block and a half. Those three facts are the whole of the design,
 * and the arithmetic over each constant below is how they stay true to each
 * other.
 */

/* ---------------------------------------------------------------
   The field
   --------------------------------------------------------------- */

/**
 * How many blocks tall the visible world is.
 *
 * It sets the scale of everything: a block is the screen's height divided by
 * this, so a shorter window gets smaller blocks rather than less world. Seven
 * leaves room for the player (1), a full jump (1.5), the bird band (to 2.15)
 * and still the better part of three blocks of sky above the highest thing in
 * the game.
 */
export const VIEW_ROWS = 7;

/** How much of that is dirt below the grass line. */
export const GROUND_ROWS = 1.25;

/**
 * And how much world is allowed across the screen.
 *
 * The block size falls out of the height, which on a very wide window would
 * show twenty-five blocks of ground and hand the player every obstacle four
 * seconds before it arrives — easy to the point of dull. So the block grows or
 * shrinks until the column count is inside this range, and the game plays much
 * the same on both.
 *
 * The floor is the one that gets hit in practice, and not by a phone. A phone
 * held sideways is about 2.1:1 and sees fifteen columns at seven rows. A
 * maximised desktop browser is nearer 1.7:1 and would see twelve — big blocks,
 * and a rock arriving a quarter of a second sooner than the speed was tuned
 * against. Thirteen holds the warning distance roughly level across both,
 * which costs a desktop nothing but a little more sky.
 */
export const MIN_COLS = 13;
export const MAX_COLS = 19;

/** Where the player runs, in blocks from the left edge. */
export const PLAYER_X = 2.6;

/* ---------------------------------------------------------------
   How big she is drawn
   ---------------------------------------------------------------
   Taller than she is solid, deliberately. The hitbox is the one block it has
   always been — every timing window in this file is measured against it — and
   the drawing is a third again as tall, so her tiara reaches up into the
   second block.

   That overlap is allowed and is not a bug: a flying bird is only ever hit by
   the box, so the worst it can look is a near miss that was in fact a miss.
   The alternative was drawing a one-block princess, which at forty pixels is a
   face too small to read an expression off — and her expression is the whole
   of the game's feedback.
   --------------------------------------------------------------- */

/** How many blocks tall her *running* pose is drawn. */
export const PLAYER_DRAW_H = 1.3;

/**
 * The shape of one cell of the sprite strips, printed by
 * `scripts/build-player.py`. Re-run it if the artwork is re-supplied and all
 * three of these will be printed again.
 *
 * A cell is bigger than the pose inside it, twice over:
 *
 *   `runFill` — the jump's airborne frame reaches higher than she stands, so
 *   the cell has to hold the tallest pose of the three. `PLAYER_DRAW_H` is
 *   about *her*, not about the cell, so the renderer divides by this to get
 *   back to the cell it actually draws.
 *
 *   `foot` — every cell carries a transparent gutter all the way round, which
 *   is what stops one frame bleeding into the next when the browser filters it
 *   (see `PAD` in the script). That gutter means the bottom of the cell is not
 *   the ground: her feet are this far down it, and the renderer stands *that*
 *   line on the grass rather than the cell's edge.
 */
export const PLAYER_CELL = { aspect: 0.6667, runFill: 0.8816, foot: 0.963 };

/** Frames in each strip. */
export const RUN_FRAMES = 16;
export const JUMP_FRAMES = 5;

/**
 * How far she travels in one full stride — both steps, all sixteen frames.
 *
 * Tied to distance rather than to time, which is the only way the cadence
 * stays honest: at a fixed frame rate her legs would run at the same speed
 * however fast the world moved. (Her feet are drawn running in place rather
 * than planting and sliding back, so this is a matter of how it reads rather
 * than of literal foot contact — but the principle holds, and she still
 * quickens with every tier.)
 *
 * Longer stride, slower legs, which is why this number going *up* is the way
 * to calm the animation down:
 *
 *   2.2 blocks   324ms a stride    (sprinting; the legs were a blur)
 *   3.8 blocks   559ms a stride    <- this
 *
 * Unchanged when the artwork went from eight frames to sixteen, deliberately.
 * The sheet holds one whole stride either way — two leg-passes, measured off
 * the frames rather than assumed — so the same number keeps the same cadence
 * and spends the extra frames on smoothness, which is the only thing more
 * frames are good for.
 */
export const RUN_CYCLE_BLOCKS = 3.8;

/* ---------------------------------------------------------------
   The jump
   ---------------------------------------------------------------
   Held longer, it goes higher: the only control the game has, so it carries
   the only decision the player ever makes.

   The two apexes are chosen against the obstacles rather than by feel, and the
   comments on the obstacles below are the other half of each sum:

     a tap  reaches 1.30 blocks — over a one-block rock, and no higher than it
                                  has to be
     a hold reaches 1.65 blocks — the same rock with room to spare, and a
                                  longer flight, which is what gets a player
                                  over a two-block one

   Both are far above the flying lane, whose floor is one block. A standing
   player's head stops 0.18 of a block short of a flying bird, and the smaller
   of the two jumps is seven times that gap — so *any* jump at a bird in the air
   is a hit, and the way past one is to keep running. That is the second rule of
   the game, and the lane a bird is in is how you tell which rule applies. See
   the block over `BIRD_FLY`.
   --------------------------------------------------------------- */

/** Blocks per second per second. Tuned so a full jump lasts about 0.64s. */
export const GRAVITY = 32;

/** Apex of a tap, in blocks. */
export const JUMP_MIN = 1.3;

/**
 * Apex of a jump held for `JUMP_HOLD_MS` or longer.
 *
 * It was a block and a half, which is what the game was designed around, and
 * it went up when the hitboxes came in to the edge of the sprites — see the
 * insets below. The reason is pure geometry and worth writing down, because
 * "a block and a half clears a one-block rock" stops being true the moment the
 * boxes are honest:
 *
 * A player is a block wide and a rock is a block wide, so the two overlap over
 * two blocks of travel — and at the starting speed that is 0.27 of a second
 * during which the player's feet must stay above one block. A 1.5-block jump
 * is above one block for only 0.35s, so the whole margin for error was 80
 * milliseconds. At 1.65 it is 0.47s, and the margin is 200.
 *
 * The alternative was a weaker gravity, which buys the same airtime at the
 * same height — and makes every jump float. This is the cheaper of the two.
 */
export const JUMP_MAX = 1.65;

/**
 * How long the button has to be held to buy the whole 1.5 blocks.
 *
 * Short, because a running game gives nobody time to think: by the time a
 * player has decided that this rock needs a big jump, a fifth of a second is
 * already most of what they had. Anything between a tap and this is
 * interpolated, so there is no step to feel for.
 */
export const JUMP_HOLD_MS = 220;

/** The longest flight there is, which the spawner measures its gaps against. */
export const AIRTIME_MAX = 2 * Math.sqrt((2 * JUMP_MAX) / GRAVITY);

/* ---------------------------------------------------------------
   Running, and getting faster at it
   --------------------------------------------------------------- */

/** Blocks per second at the start. */
export const SPEED_BASE = 6.8;

/** Every `TIER_POINTS`, the world moves this much faster again. */
export const SPEED_STEP = 0.1;

/**
 * And the ceiling, as a multiple of the base.
 *
 * Down from twice, along with the base and the tier, because at 15 blocks a
 * second the ground was unpleasant to look at — the scroll stopped reading as
 * running and started reading as a flicker. The top speed is now a little over
 * ten and a half, reached at three thousand points rather than thirteen
 * hundred, so the whole run is calmer and the ramp is something a player
 * notices rather than something that happens to them.
 *
 * None of that makes the game easier. Speed was never where the difficulty
 * was — see the note over the hitbox insets, and the reason a *slower* world
 * is harder to jump in.
 */
export const SPEED_MAX = 1.6;

/**
 * How long a speed-up takes to arrive.
 *
 * The step is the design — "every hundred points it speeds up" — but a step
 * applied in a single frame can land in the middle of a jump already in the
 * air and move the rock under a player who read it correctly. Eased over most
 * of a second the step is still legible, and it never changes the answer to a
 * jump that has already been made.
 */
export const SPEED_EASE_MS = 800;

/* ---------------------------------------------------------------
   Scoring
   ---------------------------------------------------------------
   Points are distance, not time — the same thing the running dinosaur does,
   and the reason a faster tier is worth playing for rather than only worth
   surviving. Ten a second at the starting speed, sixteen at the cap.
   --------------------------------------------------------------- */

export const SCORE_RATE = 10;

/**
 * How often the world speeds up.
 *
 * Five hundred, not a hundred. At a hundred the speed-ups came every ten
 * seconds and stacked faster than anybody could settle into a rhythm; the run
 * was over before the world stopped changing under it. At five hundred a tier
 * lasts the better part of a minute, which is long enough to get used to one
 * before the next arrives.
 */
export const TIER_POINTS = 500;

/**
 * And how often the hour turns.
 *
 * Ten times less often than a speed-up, which is a much longer day than it
 * sounds: a thousand points is somewhere between seventy and ninety seconds of
 * running, so most guests will see one sky and the good ones will see two.
 * That is the point of it — the sky is a reward for a long run rather than
 * wallpaper that changes every ten seconds.
 */
export const SKY_POINTS = 1000;

/* ---------------------------------------------------------------
   Lives
   --------------------------------------------------------------- */

export const LIVES = 3;

/**
 * How long the player is untouchable after a hit.
 *
 * Long enough to run clear of whatever was in front of them, because the
 * alternative is losing all three lives to one rock in half a second and never
 * seeing why. The player blinks for the whole of it, which is all the notice
 * anyone needs that the rules are suspended.
 */
export const INVULN_MS = 1300;

/* ---------------------------------------------------------------
   The obstacles
   --------------------------------------------------------------- */

/* ---------------------------------------------------------------
   The two lanes a bird uses
   ---------------------------------------------------------------
   Blocks are counted as bands off the ground, so the first block is the one a
   standing player fills (0 to 1, the same band a rock fills) and the second is
   the one directly above their head (1 to 2).

   A bird is in one of those two and nowhere else, and which one it is in is
   the whole question it asks:

     flying, in the second block   run under it. Any jump is a hit.
     grounded, in the first block  jump it, exactly as you would a rock.

   That is one rule inverted rather than two rules, which is what makes the
   birds that change lane worth putting in: a bird you were about to jump
   climbs out of reach and the jump becomes the mistake, and a bird you were
   happily running under drops into your path.

   The clearance under a flying bird is 0.18 of a block — the player's head
   stops at 0.89 and the bird's hitbox starts at 1.07. Tight on purpose: it
   should look like a near miss, because it is one.
   --------------------------------------------------------------- */

/** Flying: the second block up, out of a standing player's way. */
export const BIRD_FLY = 1;

/** Grounded: the first block, which is exactly where a rock sits. */
export const BIRD_GROUND = 0;

/**
 * Hitbox insets, as a fraction of a block taken off every side.
 *
 * A drawing and its hitbox are never the same shape — a bird is mostly the gap
 * between its wings, and a head is round inside a square tile — so a box the
 * size of the sprite collects hits that visibly missed. Every one of these
 * errs the player's way, which is the only direction a near miss should ever
 * be resolved in.
 *
 * ---------------------------------------------------------------------------
 * These numbers are the game's difficulty, and that is not obvious
 * ---------------------------------------------------------------------------
 * The jump is fixed, so what decides whether a rock is hard is how long the
 * player's box is clear of the rock's box, less how long the two overlap
 * horizontally — and both halves of that are these insets. The figure that
 * falls out is the window of press times that survive an ordinary rock at the
 * starting speed, found by sweeping the press over a single rock:
 *
 *                            jump       speed    tap      hold
 *   player .22 / rock .16    1.15/1.50   7.5     208 ms   312 ms  (forgiving)
 *   player .08 / rock .04    1.30/1.65   7.5      96 ms   204 ms
 *   player .11 / rock .07    1.30/1.65   6.8     105 ms   214 ms  ← these
 *
 * These are deliberately the hard ones: the boxes sit at the edge of the
 * drawings, so a near miss is a hit, which is what was asked for.
 *
 * The third row only exists because the speed came down. A slower world spends
 * *longer* crossing the same rock, so dropping the base speed from 7.5 to 6.8
 * would have taken the tap window from 96ms to 73 on its own — a difficulty
 * change nobody asked for, smuggled in under a comfort one. Four hundredths of
 * a block back on each inset undoes it exactly.
 *
 * ---------------------------------------------------------------------------
 * Why they are not zero
 * ---------------------------------------------------------------------------
 * Because zero does not leave a game. Measured, at the starting speed, with a
 * one-block player and a one-block rock touching exactly:
 *
 *   tap  -73 ms      hold  87 ms      two-block rock  -46 ms, at any jump
 *
 * A negative window means there is no moment at which the press works. At
 * literally exact hitboxes the ordinary rock is a coin toss and the wide one
 * is impossible, so the first thirty seconds of every run would end in the
 * same place regardless of skill. Four and eight hundredths of a block — a
 * couple of pixels on a phone — is what turns that back into something a
 * person can learn, and it is still well inside the drawn edge of both
 * sprites.
 *
 * Note which direction the speed runs, because it is the opposite of the
 * intuition: every tier makes a rock *easier* to clear, since the airtime is
 * fixed and a faster world spends less time crossing the same rock. What makes
 * a later tier hard is having less warning. So these windows are the tightest
 * the game ever gets, and they are at the start.
 */
export const PLAYER_INSET = 0.11;
export const ROCK_INSET = 0.07;
export const BIRD_INSET = 0.07;

/**
 * The rabbit's, which is its own because the rabbit is its own size.
 *
 * It is a smaller animal than a rock is a rock, and that is the point of it:
 * three quarters of a block tall, so the jump that clears it is an easier one.
 * What makes a rabbit hard is not knowing whether it will be there.
 */
export const RABBIT_INSET = 0.08;

/** The boulder is round, so a touch more of its corners is forgiven. */
export const BOULDER_INSET = 0.1;



/**
 * How far ahead of the player a thing that changes, changes.
 *
 * Measured in *seconds* of approach rather than blocks, because the whole
 * point of it is reaction time and that is a time. Seven tenths is about
 * five blocks at the starting speed — which is the middle of the screen, where
 * it was asked to happen — and stretches to nearly eight at the cap, so a fast
 * run gets the same warning rather than the same distance.
 *
 * The floor stops it collapsing on a slow tier. Nothing should ever transform
 * closer than four and a half blocks out, which is a jump's worth of travel
 * plus the time it takes to decide on one.
 */
export const CHANGE_LEAD_S = 0.7;
export const CHANGE_LEAD_MIN = 4.5;

/** And how long the change itself takes. Quick — these are meant to surprise. */
export const CHANGE_MS = 260;

/* ---------------------------------------------------------------
   The rabbit
   ---------------------------------------------------------------
   A ground obstacle that may or may not be there when it arrives. Three
   quarters of a block, so the jump that clears it is comfortable — what makes
   a rabbit hard is the hole, which says something *might* happen here and
   does not say what.
   --------------------------------------------------------------- */

export const RABBIT_H = 0.75;
export const RABBIT_W = 0.8;

/** Where it waits, out of sight, far enough under that its box clears the player's. */
export const RABBIT_DOWN = -0.9;

/* ---------------------------------------------------------------
   The boulder
   ---------------------------------------------------------------
   The one obstacle that is not simply carried along by the world: it rolls,
   and it picks up speed on the way in.
   --------------------------------------------------------------- */

/**
 * Blocks per second per second of *extra* leftward speed, on top of the world.
 *
 * Three is about a third again by the time it reaches the player, which takes
 * roughly a fifth off the warning a rock of the same size would give. That is
 * the whole of its difficulty — and note that it makes the boulder *easier* to
 * jump, not harder, because a faster thing spends less time overlapping the
 * player. It is a reaction test, not a timing one.
 */
export const BOULDER_ACC = 3;

/**
 * Extra blocks of gap before a boulder is put out.
 *
 * It needs its own allowance because it closes on whatever is in front of it.
 * Over a crossing it gains a couple of blocks on the world, so without this the
 * obstacle before it would still be leaving as the boulder arrived — and the
 * spacing rule that keeps every jump landable would quietly stop holding.
 */
export const BOULDER_LEAD = 3.5;

/* ---------------------------------------------------------------
   When each thing starts appearing
   ---------------------------------------------------------------
   One idea at a time. A player meets rocks, learns the button, and only then
   meets something that argues with what the button taught them.
   --------------------------------------------------------------- */

/** The score from which birds appear at all. */
export const BIRD_FROM = 150;

/** Rabbits, which are the gentlest of the new ones. */
export const RABBIT_FROM = 250;

/**
 * And the versions that change on the way in — the diving bird, the one that
 * climbs away, the rabbit that pops up, the one that drops out of sight.
 *
 * Held back behind all three plain kinds, because every one of them is a
 * variation on something and a variation is meaningless until the theme is
 * known. A rabbit that appears from nowhere is only interesting to a player who
 * has already learned what a rabbit sitting still does.
 */
export const TRICKS_FROM = 400;

/** The boulder, last, because it is the only one that changes the pace. */
export const BOULDER_FROM = 700;

/** And the share of obstacles they make up once the run is properly going. */
export const BIRD_SHARE = 0.4;
export const BIRD_FULL = 600;

/**
 * The wide rock: how wide, and from what score.
 *
 * It is the one obstacle a tap will not clear, and that is its whole job —
 * the thing that makes the length of the press matter. Measured windows, which
 * is how both numbers were chosen:
 *
 *                            tap        hold
 *   2.0 wide, speed 6.80      0 ms       64 ms
 *   2.0 wide, speed 8.16     28 ms      132 ms
 *   1.7 wide, speed 7.48     32 ms      140 ms   <- these
 *
 * A two-block rock needs the world to be moving at 8.16 before even a held
 * jump has a fair window, and the world does not reach 8.16 until a thousand
 * points — well past where most guests at a party will ever get, which would
 * have left the hold with nothing to do in a typical run. At 1.7 blocks the
 * same gate opens at five hundred and change, which is a minute in.
 *
 * Note which way the speed runs, because it is the opposite of the intuition:
 * every tier makes this *easier*, since the airtime is fixed and a faster world
 * spends less time crossing the same rock.
 */
export const WIDE_ROCK_W = 1.7;
export const WIDE_ROCK_FROM = 550;

/* ---------------------------------------------------------------
   Spacing
   ---------------------------------------------------------------
   The one rule that keeps the game honest: the player is always back on the
   ground before the next obstacle is close enough to matter. Everything here
   is measured in the distance a full jump covers *at the current speed*,
   because that distance grows with every tier while the airtime does not.
   --------------------------------------------------------------- */

/** Blocks of clear ground after the longest possible jump lands. */
export const GAP_LANDING = 2.2;

/** And up to this much more again, at random, so the rhythm never settles. */
export const GAP_SPREAD = 4.5;

/* ---------------------------------------------------------------
   The sky
   ---------------------------------------------------------------
   Five of them, one per `SKY_POINTS`, in the order a day runs — and then round
   again. Each is a flat list of colours the renderer reads; there is no logic
   here, only paint.

   Nothing on screen names them. The light does the telling, and a caption over
   the top of it only ever said what the player could already see.

   Every entry is `[r, g, b]`, because when the hour changes the renderer
   crossfades between two whole skies, and channels are what it can
   interpolate.
   --------------------------------------------------------------- */

export type Rgb = [number, number, number];

export type Sky = {
  /** What the hour is called. Documentation — nothing on screen says it. */
  name: string;
  /** Sky gradient, from the top of the screen down to the horizon. */
  high: Rgb;
  mid: Rgb;
  low: Rgb;
  /** The disc in the sky, and how far down the field it sits (0 is the top). */
  disc: Rgb;
  discGlow: Rgb;
  discAt: number;
  /** How bright the stars are, 0 to 1. */
  stars: number;
  cloud: Rgb;
  cloudShade: Rgb;
  hillFar: Rgb;
  hillNear: Rgb;
  grass: Rgb;
  grassShade: Rgb;
  dirt: Rgb;
  dirtShade: Rgb;
  /** A wash laid over the whole field, which is what sells sunset and night. */
  tint: Rgb;
  tintAlpha: number;
};

export const SKIES: Sky[] = [
  {
    name: "Morning",
    high: [125, 193, 236],
    mid: [176, 220, 244],
    low: [226, 240, 236],
    disc: [255, 246, 214],
    discGlow: [255, 232, 170],
    discAt: 0.3,
    stars: 0,
    cloud: [255, 255, 255],
    cloudShade: [219, 233, 244],
    hillFar: [151, 193, 183],
    hillNear: [103, 165, 133],
    grass: [124, 190, 108],
    grassShade: [96, 160, 86],
    dirt: [150, 109, 74],
    dirtShade: [120, 85, 57],
    tint: [255, 240, 205],
    tintAlpha: 0.05,
  },
  {
    name: "Afternoon",
    high: [74, 160, 226],
    mid: [138, 200, 243],
    low: [204, 234, 246],
    disc: [255, 252, 232],
    discGlow: [255, 244, 190],
    discAt: 0.12,
    stars: 0,
    cloud: [255, 255, 255],
    cloudShade: [212, 229, 243],
    hillFar: [138, 186, 176],
    hillNear: [92, 158, 124],
    grass: [134, 199, 112],
    grassShade: [104, 168, 90],
    dirt: [158, 116, 78],
    dirtShade: [126, 90, 60],
    tint: [255, 255, 235],
    tintAlpha: 0.04,
  },
  {
    name: "Sunset",
    high: [92, 86, 148],
    mid: [232, 139, 122],
    low: [255, 199, 130],
    disc: [255, 214, 140],
    discGlow: [255, 150, 96],
    discAt: 0.62,
    stars: 0.12,
    cloud: [255, 203, 182],
    cloudShade: [214, 148, 143],
    hillFar: [136, 118, 150],
    hillNear: [96, 88, 117],
    grass: [116, 148, 100],
    grassShade: [88, 116, 80],
    dirt: [131, 92, 68],
    dirtShade: [102, 70, 52],
    tint: [255, 146, 86],
    tintAlpha: 0.16,
  },
  {
    name: "Evening",
    high: [20, 24, 58],
    mid: [38, 44, 92],
    low: [74, 74, 128],
    /* The moon — the one hour whose disc is cold rather than warm. */
    disc: [238, 240, 255],
    discGlow: [168, 182, 240],
    discAt: 0.22,
    stars: 1,
    cloud: [92, 98, 148],
    cloudShade: [66, 72, 116],
    hillFar: [48, 54, 96],
    hillNear: [34, 40, 72],
    grass: [58, 92, 76],
    grassShade: [42, 70, 58],
    dirt: [72, 58, 58],
    dirtShade: [54, 44, 46],
    tint: [40, 48, 110],
    tintAlpha: 0.22,
  },
  {
    name: "Dawn",
    high: [86, 104, 170],
    mid: [176, 150, 196],
    low: [250, 206, 184],
    disc: [255, 236, 206],
    discGlow: [255, 196, 170],
    discAt: 0.68,
    stars: 0.3,
    cloud: [236, 206, 216],
    cloudShade: [192, 164, 190],
    hillFar: [128, 128, 166],
    hillNear: [92, 100, 130],
    grass: [98, 148, 104],
    grassShade: [74, 120, 84],
    dirt: [124, 94, 72],
    dirtShade: [98, 72, 56],
    tint: [255, 196, 184],
    tintAlpha: 0.12,
  },
];

/** How long one sky takes to become the next. */
export const SKY_FADE_MS = 1400;
