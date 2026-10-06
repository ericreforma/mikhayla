/**
 * The game itself, with no screen attached to it.
 *
 * Nothing in this file knows what a pixel is, what React is, or where a tap
 * came from. It holds the world in blocks and seconds, and `step()` moves it
 * forward by one fixed slice of time. Everything else — the canvas, the HUD,
 * the overlays — reads this and paints it.
 *
 * Keeping it that way is not tidiness. A running game is the one kind of code
 * where "it only happens on some devices" is the normal bug report, and almost
 * all of those come from physics that is secretly a function of frame rate or
 * screen size. A pure stepper at a fixed timestep has neither: a 120Hz phone
 * and a 60Hz laptop run the identical simulation, and so does a tab that was
 * backgrounded for ten seconds.
 */

import {
  AIRTIME_MAX,
  BIRD_FROM,
  BIRD_FLY,
  BIRD_FULL,
  BIRD_INSET,
  BIRD_SHARE,
  BIRD_GROUND,
  BOULDER_ACC,
  BOULDER_FROM,
  BOULDER_INSET,
  BOULDER_LEAD,
  CHANGE_LEAD_MIN,
  CHANGE_LEAD_S,
  CHANGE_MS,
  WIDE_ROCK_FROM,
  WIDE_ROCK_W,
  GAP_LANDING,
  GAP_SPREAD,
  GRAVITY,
  INVULN_MS,
  JUMP_HOLD_MS,
  JUMP_MAX,
  JUMP_MIN,
  LIVES,
  PLAYER_INSET,
  PLAYER_X,
  RABBIT_FROM,
  RABBIT_H,
  RABBIT_INSET,
  RABBIT_W,
  RABBIT_DOWN,
  ROCK_INSET,
  SCORE_RATE,
  SKIES,
  SKY_FADE_MS,
  SKY_POINTS,
  SPEED_BASE,
  SPEED_EASE_MS,
  SPEED_MAX,
  SPEED_STEP,
  TIER_POINTS,
  TRICKS_FROM,
} from "./tuning";

/**
 * How long one step of the simulation is.
 *
 * A fixed 120th of a second rather than whatever the display handed us. The
 * jump is the reason: its apex is solved for exactly (see `release` below),
 * and a variable step integrates that to a slightly different height every
 * frame — which on a bad frame is the difference between clearing a rock and
 * not. Two steps per frame at 60Hz is cheap, and the renderer still draws at
 * whatever rate the screen runs.
 */
export const STEP = 1 / 120;

export type Status = "ready" | "running" | "paused" | "over";

export type ObstacleKind = "rock" | "bird" | "rabbit" | "boulder";

/**
 * What a thing does on its way across, which is now most of the game.
 *
 * `steady` is everything that simply arrives as it looked. The other four are
 * the ones that change their mind at the line — see `changeLine` — and every
 * one of them is a question about the same single button:
 *
 *   drop     a bird sailing safely overhead folds into the low lane. It was
 *            nothing to worry about and now you must not jump.
 *   climb    a bird in the low lane pulls up and away. You were holding still
 *            for it and now you needn't.
 *   emerge   a rabbit comes up out of its hole. There was nothing there.
 *   burrow   a rabbit drops down its hole. There was something there.
 *
 * Two of them make a safe thing dangerous and two make a dangerous thing safe,
 * which is deliberate: if every change were a threat the answer would just be
 * "treat everything as a threat", and the reading would stop being worth
 * doing.
 */
export type Motion = "steady" | "drop" | "climb" | "emerge" | "burrow";

export type Obstacle = {
  kind: ObstacleKind;
  motion: Motion;
  /** Left edge, in blocks from the left of the screen. Falls as the world moves. */
  x: number;
  /** Bottom edge, in blocks above the grass line. Animated, for the four above. */
  y: number;
  /** Where the change runs from and to. Equal when the motion is `steady`. */
  fromY: number;
  toY: number;
  /** 0 before the change, 1 after it. */
  phase: number;
  w: number;
  h: number;
  /**
   * Extra leftward speed of its own, on top of the world's. Only the boulder
   * has any, and the boulder's grows the whole way in.
   */
  vx: number;
  /** Fixed per obstacle, so its drawing is varied but never flickers. */
  seed: number;
  /** Already took a life. It stays on screen but can't take another. */
  spent: boolean;
};

export type Game = {
  status: Status;
  /** Seconds of play. Pausing stops it; it is what every deadline is measured against. */
  t: number;
  /** Blocks travelled, which is the only reason anything moves. */
  distance: number;
  score: number;
  lives: number;
  /** Blocks per second, eased toward the tier's target — see `SPEED_EASE_MS`. */
  speed: number;
  /** How many blocks across the screen is, handed in by the renderer on resize. */
  cols: number;

  /** Feet above the grass line, in blocks. Zero is standing. */
  y: number;
  vy: number;
  grounded: boolean;
  /** Seconds spent running, which is what drives the legs. */
  run: number;

  /** The button, and the jump it is currently buying. */
  held: boolean;
  heldSince: number;
  /** Set while a jump is still open to being extended by holding. */
  rising: boolean;

  /** Hits are ignored until this time — see `INVULN_MS`. */
  invulnUntil: number;
  /** Counts down from 1 after a hit; the screen shakes by it. */
  shake: number;
  /** Counts down from 1 after a hit; the screen flashes red by it. */
  flash: number;

  obstacles: Obstacle[];
  /** Blocks of ground still to pass before the next obstacle is put out. */
  untilSpawn: number;
  /**
   * And what that one will be.
   *
   * Chosen a whole gap in advance, because the gap's length depends on it: a
   * boulder needs more room in front of it than anything else. See `nextGap`.
   */
  nextKind: ObstacleKind;

  /** The sky on screen, the one it is becoming, and how far through. */
  sky: number;
  skyFrom: number;
  skyBlend: number;

  rng: () => number;
};

/**
 * A seeded generator, so a run can be replayed exactly when something needs
 * debugging. `mulberry32` — small, fast, and good enough for picking rocks.
 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame(cols: number, seed = Date.now()): Game {
  return {
    status: "ready",
    t: 0,
    distance: 0,
    score: 0,
    lives: LIVES,
    speed: SPEED_BASE,
    cols,

    y: 0,
    vy: 0,
    grounded: true,
    run: 0,

    held: false,
    heldSince: 0,
    rising: false,

    invulnUntil: 0,
    shake: 0,
    flash: 0,

    obstacles: [],
    /* A clear run-up: a few seconds of empty ground to find the button in. */
    untilSpawn: 14,
    nextKind: "rock",

    sky: 0,
    skyFrom: 0,
    skyBlend: 1,

    rng: makeRng(seed),
  };
}

/* ---------------------------------------------------------------
   The button
   --------------------------------------------------------------- */

/**
 * Pressed.
 *
 * The jump leaves the ground at the velocity for the *maximum* height and is
 * cut back on release — the opposite of adding to it while held, which is the
 * other way to write this and the one that feels floaty. Launching at full
 * power means the first frame of every jump is identical however long it ends
 * up being, so the game answers instantly and then listens.
 */
export function press(g: Game) {
  g.held = true;
  g.heldSince = g.t;
  if (g.status !== "running" || !g.grounded) return;

  g.vy = Math.sqrt(2 * GRAVITY * JUMP_MAX);
  g.grounded = false;
  g.rising = true;
}

/** Let go. The height is settled here, or by `JUMP_HOLD_MS` passing. */
export function release(g: Game) {
  g.held = false;
  if (!g.rising) return;
  cutJump(g);
}

/**
 * Trim the jump in flight to the apex the hold actually bought.
 *
 * Solved rather than scaled. The velocity needed to rise the remaining
 * distance is `sqrt(2 g dh)`, so setting it directly lands the apex on the
 * number the player asked for — a tap on 1.15 blocks, a full hold on 1.5, and
 * a smooth interpolation between. Multiplying the velocity by a constant (the
 * usual trick) gets a different height depending on how far through the rise
 * the release happened, which is exactly the sort of thing that makes a game
 * feel arbitrary without anyone being able to say why.
 */
function cutJump(g: Game) {
  g.rising = false;
  const heldFor = (g.t - g.heldSince) * 1000;
  const f = Math.min(1, Math.max(0, heldFor / JUMP_HOLD_MS));
  const apex = JUMP_MIN + (JUMP_MAX - JUMP_MIN) * f;
  const remaining = apex - g.y;
  if (remaining <= 0) {
    g.vy = Math.min(g.vy, 0);
    return;
  }
  g.vy = Math.min(g.vy, Math.sqrt(2 * GRAVITY * remaining));
}

/* ---------------------------------------------------------------
   One step
   --------------------------------------------------------------- */

export function step(g: Game) {
  if (g.status !== "running") return;

  g.t += STEP;

  /* The tier, and the speed it wants. Eased rather than stepped — see
     `SPEED_EASE_MS` for the jump this would otherwise land in the middle of. */
  const tier = Math.floor(g.score / TIER_POINTS);
  const target = SPEED_BASE * Math.min(SPEED_MAX, 1 + SPEED_STEP * tier);
  const ease = STEP / (SPEED_EASE_MS / 1000);
  g.speed += (target - g.speed) * Math.min(1, ease);

  const moved = g.speed * STEP;
  g.distance += moved;
  g.score += SCORE_RATE * (g.speed / SPEED_BASE) * STEP;
  g.run += STEP;

  /* A jump held past the window has bought everything it can; settle it now
     rather than waiting for a release that may come after the apex. */
  if (g.rising && (g.t - g.heldSince) * 1000 >= JUMP_HOLD_MS) cutJump(g);

  if (!g.grounded) {
    /*
     * Position from the velocity it had, *then* the new velocity — with the
     * half-step of gravity written into the position term. That is exact for a
     * constant acceleration, where the obvious `v -= g dt; y += v dt` is not:
     * it loses `v·dt/2` of height on every jump, which at these numbers is
     * 0.036 of a block — the difference between a tap reaching the 1.15 it is
     * tuned for and reaching 1.11. Every clearance figure in `tuning.ts` is
     * solved algebraically, so the integrator has to agree with the algebra or
     * those comments are quietly wrong.
     */
    g.y += g.vy * STEP - 0.5 * GRAVITY * STEP * STEP;
    g.vy -= GRAVITY * STEP;
    if (g.y <= 0) {
      g.y = 0;
      g.vy = 0;
      g.grounded = true;
      g.rising = false;
    }
  }

  moveObstacles(g, moved);
  spawn(g, moved);
  collide(g);
  advanceSky(g);

  g.shake = Math.max(0, g.shake - STEP * 3.2);
  g.flash = Math.max(0, g.flash - STEP * 2.4);
}

/**
 * How far ahead of the player the things that change, change.
 *
 * A time rather than a distance — see `CHANGE_LEAD_S`. The player gets the same
 * fraction of a second to read it whatever tier the run has reached, which is
 * the only version of this that stays fair at the top speed.
 */
function changeLine(g: Game) {
  return PLAYER_X + Math.max(CHANGE_LEAD_MIN, CHANGE_LEAD_S * g.speed);
}

/** Ease-out cubic: quick off the mark, settling. Everything changes on this. */
function ease(t: number) {
  const u = 1 - t;
  return 1 - u * u * u;
}

function moveObstacles(g: Game, moved: number) {
  const line = changeLine(g);

  for (const o of g.obstacles) {
    if (o.kind === "boulder") {
      /* The one thing the world does not simply carry. It accelerates the
         whole way in, so it arrives sooner than its spacing would suggest —
         which is what `BOULDER_LEAD` pays for at the other end. */
      o.vx += BOULDER_ACC * STEP;
      o.x -= moved + o.vx * STEP;
    } else {
      o.x -= moved;
    }

    if (o.motion !== "steady" && o.phase < 1 && o.x <= line) {
      o.phase = Math.min(1, o.phase + STEP / (CHANGE_MS / 1000));
      o.y = o.fromY + (o.toY - o.fromY) * ease(o.phase);
    }
  }

  /* Gone past the left edge with room to spare, so nothing pops out of sight. */
  for (let i = g.obstacles.length - 1; i >= 0; i -= 1) {
    if (g.obstacles[i].x + g.obstacles[i].w < -2) g.obstacles.splice(i, 1);
  }
}

/* ---------------------------------------------------------------
   Putting obstacles out
   --------------------------------------------------------------- */

/**
 * The gap before the next one.
 *
 * Measured from the distance a full jump covers *now*, not from a fixed number
 * of blocks. The airtime never changes, so every speed-up stretches a jump
 * across more ground — and a gap that was comfortable at the starting speed is
 * one the player is still airborne for at the cap. This is the single rule
 * that keeps a fast run hard rather than impossible.
 */
function nextGap(g: Game, kind: ObstacleKind) {
  const jump = AIRTIME_MAX * g.speed;
  const extra = kind === "boulder" ? BOULDER_LEAD : 0;
  return jump + GAP_LANDING + extra + g.rng() * GAP_SPREAD;
}

/**
 * What comes next, weighted by how far the run has got.
 *
 * Decided when the *gap* is set rather than when the thing is put out, which
 * is the whole reason this is a function of its own. The boulder needs a longer
 * run-up than everything else — it closes on whatever is ahead of it — and a
 * gap cannot be made longer for a thing nobody has chosen yet.
 */
function pickKind(g: Game): ObstacleKind {
  const score = g.score;

  /* Weights, not thresholds, so each new kind thins the others out rather than
     replacing them. A rock stays the commonest thing on the field all the way
     through, because it is the one the button was learned on. */
  const weights: [ObstacleKind, number][] = [["rock", 10]];

  if (score >= BIRD_FROM) {
    weights.push([
      "bird",
      10 *
        BIRD_SHARE *
        Math.min(1, (score - BIRD_FROM) / Math.max(1, BIRD_FULL - BIRD_FROM)),
    ]);
  }
  if (score >= RABBIT_FROM) weights.push(["rabbit", 4]);
  if (score >= BOULDER_FROM) weights.push(["boulder", 3]);

  let total = 0;
  for (const [, w] of weights) total += w;

  let roll = g.rng() * total;
  for (const [kind, w] of weights) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return "rock";
}

/** One obstacle, with the fields only a transforming one ever uses defaulted. */
function make(
  kind: ObstacleKind,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  motion: Motion = "steady",
  toY = y
): Obstacle {
  return { kind, motion, x, y, fromY: y, toY, phase: 0, w, h, vx: 0, seed, spent: false };
}

function spawn(g: Game, moved: number) {
  g.untilSpawn -= moved;
  if (g.untilSpawn > 0) return;

  /* What was chosen last time round, and the gap that was sized for it. */
  const kind = g.nextKind;
  g.nextKind = pickKind(g);
  g.untilSpawn = nextGap(g, g.nextKind);

  const score = g.score;
  const tricks = score >= TRICKS_FROM;

  /* Just off the right-hand edge. `cols` is handed in by the renderer, so a
     wide screen puts them out further away and sees them sooner — which is
     what `MAX_COLS` in tuning.ts is there to keep within reason. */
  const x = g.cols + 0.5;
  const seed = g.rng();

  if (kind === "bird") {
    /*
     * Four of them, and the two plain ones come first on purpose: one flying
     * and one grounded, which between them teach that the lane is the rule.
     * Only once both are familiar do the two that swap lanes appear, and a
     * swap is only interesting to somebody who knows what each lane means.
     */
    const roll = g.rng();
    if (!tricks) {
      const lane = roll < 0.5 ? BIRD_FLY : BIRD_GROUND;
      g.obstacles.push(make(kind, x, lane, 1, 1, seed));
    } else if (roll < 0.28) {
      /* Was no trouble at all, and is about to be in the way. */
      g.obstacles.push(make(kind, x, BIRD_FLY, 1, 1, seed, "drop", BIRD_GROUND));
    } else if (roll < 0.52) {
      /* Was in the way, and is about to climb out of it — so the jump you were
         lining up becomes the thing that hits it. */
      g.obstacles.push(make(kind, x, BIRD_GROUND, 1, 1, seed, "climb", BIRD_FLY));
    } else if (roll < 0.76) {
      g.obstacles.push(make(kind, x, BIRD_FLY, 1, 1, seed));
    } else {
      g.obstacles.push(make(kind, x, BIRD_GROUND, 1, 1, seed));
    }
    return;
  }

  if (kind === "rabbit") {
    const roll = tricks ? g.rng() : 1;
    if (roll < 0.35) {
      /* An empty hole, until it is not. */
      g.obstacles.push(make(kind, x, RABBIT_DOWN, RABBIT_W, RABBIT_H, seed, "emerge", 0));
    } else if (roll < 0.6) {
      g.obstacles.push(make(kind, x, 0, RABBIT_W, RABBIT_H, seed, "burrow", RABBIT_DOWN));
    } else {
      g.obstacles.push(make(kind, x, 0, RABBIT_W, RABBIT_H, seed));
    }
    return;
  }

  if (kind === "boulder") {
    g.obstacles.push(make(kind, x, 0, 1, 1, seed));
    return;
  }

  /* The wide one is the only obstacle a tap will not clear — see
     `WIDE_ROCK_W`, which carries the arithmetic. */
  const wide = score >= WIDE_ROCK_FROM && g.rng() < 0.3;
  g.obstacles.push(make("rock", x, 0, wide ? WIDE_ROCK_W : 1, 1, seed));
}

/* ---------------------------------------------------------------
   Hits
   --------------------------------------------------------------- */

/** Each kind's own forgiveness. See the insets in `tuning.ts`. */
const INSET: Record<ObstacleKind, number> = {
  rock: ROCK_INSET,
  bird: BIRD_INSET,
  rabbit: RABBIT_INSET,
  boulder: BOULDER_INSET,
};

function collide(g: Game) {
  if (g.t < g.invulnUntil) return;

  const px = PLAYER_X + PLAYER_INSET;
  const pw = 1 - PLAYER_INSET * 2;
  const py = g.y + PLAYER_INSET;
  const ph = 1 - PLAYER_INSET * 2;

  for (const o of g.obstacles) {
    if (o.spent) continue;
    const inset = INSET[o.kind];
    const ox = o.x + inset;
    const ow = o.w - inset * 2;
    const oy = o.y + inset;
    const oh = o.h - inset * 2;

    if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
      hit(g, o);
      return;
    }
  }
}

function hit(g: Game, o: Obstacle) {
  /*
   * The obstacle is spent, not removed.
   *
   * Removing it would be the easy way to stop it taking all three lives in
   * consecutive frames, and it would also make a rock vanish out from under a
   * player who is looking straight at it. Marking it instead keeps the picture
   * honest: the rock is still there, it is simply already paid for.
   */
  o.spent = true;
  g.lives -= 1;
  g.invulnUntil = g.t + INVULN_MS / 1000;
  g.shake = 1;
  g.flash = 1;

  if (g.lives <= 0) {
    g.lives = 0;
    g.status = "over";
  }
}

/* ---------------------------------------------------------------
   The hour
   --------------------------------------------------------------- */

function advanceSky(g: Game) {
  /* `SKY_POINTS`, not the speed tier. The two used to be the same hundred and
     are deliberately not any more — the world speeds up ten times for every
     once the sun moves. */
  const want = Math.floor(g.score / SKY_POINTS) % SKIES.length;
  if (want !== g.sky) {
    /*
     * Fade out of whatever is on screen *right now*, which is not necessarily
     * the last whole sky: crossing two hundreds inside one fade would
     * otherwise snap back to the sky before last and then start again.
     * `skyFrom` holds the one being left and `skyBlend` restarts from zero, so
     * a double change reads as one continuous drift through the two.
     */
    g.skyFrom = g.skyBlend < 1 ? g.skyFrom : g.sky;
    g.sky = want;
    g.skyBlend = 0;
  }
  if (g.skyBlend < 1) {
    g.skyBlend = Math.min(1, g.skyBlend + STEP / (SKY_FADE_MS / 1000));
  }
}

/* ---------------------------------------------------------------
   Readings the screen wants
   --------------------------------------------------------------- */

/** The score as anyone would say it. */
export function shownScore(g: Game) {
  return Math.floor(g.score);
}

/** Whether the player should be drawn this frame — blinks while untouchable. */
export function playerVisible(g: Game) {
  if (g.t >= g.invulnUntil) return true;
  return Math.floor(g.t * 14) % 2 === 0;
}
