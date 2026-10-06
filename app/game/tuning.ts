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
   The jump
   ---------------------------------------------------------------
   Held longer, it goes higher: the only control the game has, so it carries
   the only decision the player ever makes.

   The two apexes are chosen against the obstacles rather than by feel, and the
   comments on the obstacles below are the other half of each sum:

     a tap  reaches 1.15 blocks — over a one-block rock, and no higher than it
                                  has to be
     a hold reaches 1.50 blocks — the same rock with room to spare, and a
                                  longer flight, which is what gets a player
                                  over a two-block one

   Both are well above the bird band. A standing player's head stops 0.57 of a
   block short of a bird's hitbox, and the smaller of the two jumps is twice
   that — so *any* jump at a bird is a hit, and the way past one is to keep
   running. That is the second rule of the game and the whole reason the air
   obstacle exists.
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
export const SPEED_BASE = 7.5;

/** Every hundred points, the world moves this much faster again. */
export const SPEED_STEP = 0.08;

/**
 * And the ceiling, as a multiple of the base.
 *
 * Without one the hundredth tier would be travelling nine times faster than an
 * eye can follow, and the game would stop being a game and become a stopwatch.
 * Twice is already quick: a rock crosses the screen in a second.
 */
export const SPEED_MAX = 2;

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
   surviving. Ten a second at the starting speed, twenty at the cap.
   --------------------------------------------------------------- */

export const SCORE_RATE = 10;

/** How often the world speeds up. */
export const TIER_POINTS = 100;

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

/** The bottom of the bird band, in blocks above the ground. */
export const BIRD_Y = 1.15;

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
 *                          jump        tap        hold
 *   player .22 / rock .16  1.15/1.50   208 ms     312 ms   (the forgiving one)
 *   player .08 / rock .04  1.30/1.65    89 ms     204 ms   ← these
 *
 * These are deliberately the hard ones: the boxes now sit at the edge of the
 * drawings, so a near miss is a hit, which is what was asked for.
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
export const PLAYER_INSET = 0.08;
export const ROCK_INSET = 0.04;
export const BIRD_INSET = 0.04;

/** The score from which birds appear at all. */
export const BIRD_FROM = 150;

/** And the share of obstacles they make up once the run is properly going. */
export const BIRD_SHARE = 0.4;
export const BIRD_FULL = 600;

/**
 * The score from which a rock may be two blocks wide.
 *
 * This is where holding the button stops being a preference and starts being
 * the answer. Timing windows on a two-block rock, from the same sweep as the
 * insets above:
 *
 *                      tap       hold
 *   starting speed     72 ms     176 ms
 *   at this score     132 ms     232 ms
 *
 * So a wide rock is very nearly untappable at the speed the game starts at,
 * and merely tight by the time it is first put out. Held back to here for that
 * reason rather than for difficulty: a player who met one in the first ten
 * seconds would conclude the game was broken, where one who meets it at three
 * hundred has already felt the button get longer and has somewhere to go.
 *
 * Note which way the speed runs. Every tier makes a wide rock *easier* to
 * clear, because the airtime is fixed and a faster world spends less time
 * crossing the same rock — difficulty later in a run comes from having less
 * warning, not from the jump.
 */
export const DOUBLE_ROCK_FROM = 300;

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
