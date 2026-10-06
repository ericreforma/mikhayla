/**
 * Painting the world.
 *
 * The one place in the game that knows what a pixel is. It is handed a `Game`
 * (blocks and seconds) and a `View` (how big a block is on this screen) and
 * turns the one into the other. Nothing here is allowed to change the game —
 * no state is written back — which is what lets the renderer be skipped, run
 * twice, or run at a different rate from the simulation without consequence.
 *
 * Everything is drawn as cubes on a grid, because that is the look that was
 * asked for and because it is also the cheap one: flat fills, no gradients per
 * object, no images to decode. A phone four years old holds sixty frames with
 * room to spare.
 */

import {
  GROUND_ROWS,
  MAX_COLS,
  MIN_COLS,
  PLAYER_X,
  SKIES,
  VIEW_ROWS,
  type Rgb,
  type Sky,
} from "./tuning";
import { playerVisible, type Game, type Obstacle } from "./engine";

export type View = {
  /** The canvas, in CSS pixels. */
  w: number;
  h: number;
  /** One block, in CSS pixels. */
  b: number;
  /** How many blocks fit across, which the spawner needs. */
  cols: number;
  /** The grass line, in CSS pixels from the top. */
  groundY: number;
};

/**
 * Work out the block size for a canvas of this shape.
 *
 * Height decides it — the field is always `VIEW_ROWS` blocks tall, so the
 * world is the same size on every screen and only the picture changes. The
 * clamp afterwards is the exception, and it exists because the *width* decides
 * the difficulty: how many blocks the player can see is how much warning they
 * get. See `MIN_COLS` / `MAX_COLS`.
 */
export function measure(w: number, h: number): View {
  let b = h / VIEW_ROWS;
  if (w / b > MAX_COLS) b = w / MAX_COLS;
  if (w / b < MIN_COLS) b = w / MIN_COLS;
  return { w, h, b, cols: w / b, groundY: h - GROUND_ROWS * b };
}

/* ---------------------------------------------------------------
   Colour
   --------------------------------------------------------------- */

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function css(c: Rgb, alpha = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
}

/** The same colour, pushed toward white or black. Shading, in one call. */
function shade(c: Rgb, amount: number): Rgb {
  const to: Rgb = amount > 0 ? [255, 255, 255] : [0, 0, 0];
  return mix(c, to, Math.abs(amount));
}

/**
 * The sky on screen this frame: two of them crossfaded, every channel at once.
 *
 * Interpolating the whole palette rather than fading one picture over another
 * is what makes the hour change read as light moving rather than as a
 * dissolve — the grass, the hills, the clouds and the ground all turn together,
 * because they are all the same number being moved.
 */
function skyNow(g: Game): Sky {
  const to = SKIES[g.sky];
  if (g.skyBlend >= 1) return to;
  const from = SKIES[g.skyFrom];
  const t = g.skyBlend;
  return {
    name: to.name,
    high: mix(from.high, to.high, t),
    mid: mix(from.mid, to.mid, t),
    low: mix(from.low, to.low, t),
    disc: mix(from.disc, to.disc, t),
    discGlow: mix(from.discGlow, to.discGlow, t),
    discAt: from.discAt + (to.discAt - from.discAt) * t,
    stars: from.stars + (to.stars - from.stars) * t,
    cloud: mix(from.cloud, to.cloud, t),
    cloudShade: mix(from.cloudShade, to.cloudShade, t),
    hillFar: mix(from.hillFar, to.hillFar, t),
    hillNear: mix(from.hillNear, to.hillNear, t),
    grass: mix(from.grass, to.grass, t),
    grassShade: mix(from.grassShade, to.grassShade, t),
    dirt: mix(from.dirt, to.dirt, t),
    dirtShade: mix(from.dirtShade, to.dirtShade, t),
    tint: mix(from.tint, to.tint, t),
    tintAlpha: from.tintAlpha + (to.tintAlpha - from.tintAlpha) * t,
  };
}

/* ---------------------------------------------------------------
   Scenery that has to stay still
   ---------------------------------------------------------------
   Hills, clouds and stars are *not* stored anywhere. They are a function of
   the world column they sit in, so the same hill is the same height every
   frame without a single one of them being kept in memory — and a run that
   lasts ten minutes allocates nothing at all for the landscape.
   --------------------------------------------------------------- */

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * The same hash, but smooth: interpolated between whole numbers.
 *
 * Hills need this and speckles do not, which is the whole distinction. A hash
 * read once per column is pure noise, and a skyline built out of it is a comb
 * — every column an independent height, nothing reading as a hill. Reading it
 * at a fraction of a column and easing between the two neighbours is what
 * turns the same numbers into something that rolls.
 */
function smoothNoise(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const e = f * f * (3 - 2 * f); // smoothstep, so the joins have no corner
  return hash(i) * (1 - e) + hash(i + 1) * e;
}

/* ---------------------------------------------------------------
   The one drawing primitive
   --------------------------------------------------------------- */

/**
 * A cube face: flat colour, a lighter band along the top, a darker one down
 * the right and along the bottom.
 *
 * That is the entire visual language of the game. Everything — ground, rock,
 * cloud, crown — is this called a few times, which is why it is worth having
 * the lighting live in one function rather than at each call site.
 */
function cube(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: Rgb,
  lip = 0.16,
  /**
   * A dark keyline round the whole block, in pixels. Zero for scenery and
   * non-zero for everything the player has to react to.
   *
   * It is the one thing that makes an obstacle legible at every hour. A grey
   * rock is a good shape against a morning sky and very nearly invisible
   * against an evening one, and no choice of grey fixes both — the sky moves
   * through the whole wheel. An outline does not care what is behind it.
   */
  keyline = 0
) {
  if (keyline > 0) {
    ctx.fillStyle = "rgba(28,22,34,0.55)";
    ctx.fillRect(x - keyline, y - keyline, w + keyline * 2, h + keyline * 2);
  }
  const edge = Math.max(1, Math.min(w, h) * lip);
  ctx.fillStyle = css(c);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = css(shade(c, 0.22));
  ctx.fillRect(x, y, w, edge);
  ctx.fillStyle = css(shade(c, -0.18));
  ctx.fillRect(x, y + h - edge, w, edge);
  ctx.fillRect(x + w - edge, y + edge, edge, h - edge * 2);
}

/* ---------------------------------------------------------------
   The frame
   --------------------------------------------------------------- */

export type Sprites = {
  player: CanvasImageSource | null;
  rock: CanvasImageSource | null;
  bird: CanvasImageSource | null;
};

export function draw(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  sprites: Sprites
) {
  const sky = skyNow(g);

  ctx.save();

  /*
   * The screen shake after a hit.
   *
   * Applied to the whole world and nothing else — the HUD lives in the DOM
   * above this canvas, so the score and the hearts stay rock steady while the
   * ground lurches. A shaking scoreboard reads as a bug; a shaking world reads
   * as an impact.
   */
  if (g.shake > 0) {
    const amp = g.shake * g.shake * view.b * 0.22;
    ctx.translate(
      (Math.sin(g.t * 71) * amp) | 0,
      (Math.sin(g.t * 53 + 1.7) * amp) | 0
    );
  }

  paintSky(ctx, view, sky);
  paintStars(ctx, g, view, sky);
  paintDisc(ctx, view, sky);
  paintClouds(ctx, g, view, sky);
  /*
   * The far ridge is allowed to reach two blocks and the near one barely
   * past one, and the near one is the one that matters: it is the band the
   * obstacles stand against, so it is kept below the bird lane and hazed only
   * a little, which leaves it reading as ground rather than as sky.
   */
  paintHills(ctx, g, view, sky, sky.hillFar, 0.14, 0.9, 2.1, 31, 0.42);
  paintHills(ctx, g, view, sky, sky.hillNear, 0.3, 0.4, 1.15, 77, 0.1);
  paintGround(ctx, g, view, sky);

  for (const o of g.obstacles) paintObstacle(ctx, g, view, o, sky, sprites);
  paintPlayer(ctx, g, view, sky, sprites);

  /* The hour's wash, over everything, so the world is lit rather than
     repainted. Sunset and night are almost entirely this. */
  if (sky.tintAlpha > 0.005) {
    ctx.fillStyle = css(sky.tint, sky.tintAlpha);
    ctx.fillRect(-view.w, -view.h, view.w * 3, view.h * 3);
  }

  ctx.restore();

  /* And the hit, which is outside the shake so it covers the whole screen
     rather than lurching with the world. */
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(214,52,66,${g.flash * 0.34})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

/* ---------------------------------------------------------------
   Sky, stars and the disc
   --------------------------------------------------------------- */

function paintSky(ctx: CanvasRenderingContext2D, view: View, sky: Sky) {
  const grad = ctx.createLinearGradient(0, 0, 0, view.groundY);
  grad.addColorStop(0, css(sky.high));
  grad.addColorStop(0.58, css(sky.mid));
  grad.addColorStop(1, css(sky.low));
  ctx.fillStyle = grad;
  /* Overdrawn on every side, because the shake has already moved the origin
     and a sky that stopped at the canvas edge would show bare page at it. */
  ctx.fillRect(-view.w, -view.h, view.w * 3, view.h + view.groundY);
}

function paintStars(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  sky: Sky
) {
  if (sky.stars < 0.02) return;
  const size = Math.max(1, view.b * 0.08);
  /* Barely moving: the sky is a long way off, and stars that scrolled with the
     hills would read as snow. */
  const drift = g.distance * 0.02;
  for (let i = 0; i < 60; i += 1) {
    const x = ((hash(i * 3.1) * 40 - drift) % 40 + 40) % 40;
    const px = (x / 40) * view.w;
    const py = hash(i * 7.7) * view.groundY * 0.72;
    /* Each one breathes at its own rate, which is the cheapest twinkle there
       is and the only animation in the sky. */
    const tw = 0.55 + 0.45 * Math.sin(g.t * (1.1 + hash(i * 1.3)) + i);
    ctx.fillStyle = `rgba(255,253,240,${sky.stars * tw})`;
    ctx.fillRect(px | 0, py | 0, size, size);
  }
}

function paintDisc(ctx: CanvasRenderingContext2D, view: View, sky: Sky) {
  const size = view.b * 1.5;
  const x = view.w * 0.74 - size / 2;
  const y = sky.discAt * (view.groundY - size);

  /* Square, like Minecraft's own sun, with a soft halo behind it so it reads
     as light rather than as a tile that got lost in the sky. */
  const glow = ctx.createRadialGradient(
    x + size / 2,
    y + size / 2,
    size * 0.4,
    x + size / 2,
    y + size / 2,
    size * 2.4
  );
  glow.addColorStop(0, css(sky.discGlow, 0.5));
  glow.addColorStop(1, css(sky.discGlow, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 2.4, y - size * 2.4, size * 5.8, size * 5.8);

  ctx.fillStyle = css(sky.disc);
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = css(shade(sky.disc, 0.35), 0.8);
  ctx.fillRect(x, y, size, size * 0.18);
}

/* ---------------------------------------------------------------
   Clouds
   --------------------------------------------------------------- */

function paintClouds(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  sky: Sky
) {
  const span = 9; // blocks between clouds
  const shift = g.distance * 0.12;
  const first = Math.floor((shift - span) / span);
  const last = Math.ceil((shift + view.cols + span) / span);

  for (let k = first; k <= last; k += 1) {
    const r = hash(k * 2.3);
    const r2 = hash(k * 5.9);
    const x = (k * span + r * 3 - shift) * view.b;
    if (x > view.w + view.b * 6 || x < -view.b * 6) continue;
    const y = (0.25 + r2 * 0.55) * view.groundY * 0.52;
    const unit = view.b * (0.42 + r * 0.26);
    puff(ctx, x, y, unit, sky);
  }
}

/** Five blocks in a lump. Minecraft's clouds are flat slabs; these are softer. */
function puff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  sky: Sky
) {
  const blocks: [number, number, number][] = [
    [0, 1, 2],
    [1.4, 0, 2],
    [2.8, 0.7, 1.6],
    [0.9, 1.2, 2.4],
  ];
  for (const [bx, by, bw] of blocks) {
    ctx.fillStyle = css(sky.cloud);
    ctx.fillRect(x + bx * u, y + by * u, bw * u, u);
  }
  /* One darker row along the bottom is the whole of the modelling. */
  for (const [bx, by, bw] of blocks) {
    ctx.fillStyle = css(sky.cloudShade);
    ctx.fillRect(x + bx * u, y + by * u + u * 0.72, bw * u, u * 0.28);
  }
}

/* ---------------------------------------------------------------
   Hills
   --------------------------------------------------------------- */

/**
 * A run of block columns along the horizon, at `rate` of the world's speed.
 *
 * Two of these are drawn, far and near, and the gap between their rates is
 * what gives the distance. Each column's height is a function of the world
 * column it occupies, so hills scroll past without a single one being stored.
 *
 * `haze` is the part that matters for playing rather than for looking: it
 * mixes the hills toward the colour of the sky at the horizon, which is both
 * what distance does to a hill and what keeps a grey rock from disappearing
 * into a grey ridge. Obstacles are the only things on the field drawn at full
 * contrast, and that is deliberate — everything a player has to react to
 * should be the most legible thing on the screen.
 */
function paintHills(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  sky: Sky,
  colour: Rgb,
  rate: number,
  low: number,
  high: number,
  salt: number,
  haze: number
) {
  const step = view.b * 0.9;
  const shift = (g.distance * rate * view.b) / step;
  const first = Math.floor(shift) - 1;
  const last = first + Math.ceil(view.w / step) + 3;

  const body = mix(colour, sky.low, haze);
  const cap = mix(shade(colour, 0.18), sky.low, haze);

  /* Two octaves of smooth noise: a long swell with a smaller roll on it. One
     alone is either a flat line or a jagged one. */
  /*
   * The two frequencies are the whole look of a hill, and both were set by
   * eye against a screenshot. Too slow and the ridge is a flat band a few
   * pixels thick; too fast and it is a saw. 0.22 puts a swell about every four
   * blocks — two or three of them across a phone held sideways — and 0.6 puts
   * a smaller roll on each.
   */
  const heightAt = (i: number) =>
    (low +
      (smoothNoise(i * 0.22 + salt) * 0.68 + smoothNoise(i * 0.6 + salt * 2) * 0.32) *
        (high - low)) *
    view.b;

  ctx.fillStyle = css(body);
  for (let i = first; i <= last; i += 1) {
    ctx.fillRect((i - shift) * step, view.groundY - heightAt(i), step + 1, heightAt(i));
  }

  /* A lighter cap along the top edge of each column, in a second pass so it is
     never painted over by its neighbour. */
  ctx.fillStyle = css(cap);
  for (let i = first; i <= last; i += 1) {
    const h = heightAt(i);
    ctx.fillRect((i - shift) * step, view.groundY - h, step + 1, Math.max(1, view.b * 0.09));
  }
}

/* ---------------------------------------------------------------
   The ground
   --------------------------------------------------------------- */

function paintGround(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  sky: Sky
) {
  const b = view.b;
  const grassH = b * 0.3;
  /* The world moves by sub-block amounts, so the grid is drawn from the
     fractional part of the distance and never jumps a whole block. */
  const offset = (g.distance % 1) * b;
  const first = Math.floor(g.distance) - 1;
  const cols = Math.ceil(view.cols) + 3;

  ctx.fillStyle = css(sky.dirt);
  ctx.fillRect(-view.w, view.groundY, view.w * 3, view.h * 2);

  for (let i = 0; i < cols; i += 1) {
    const col = first + i;
    const x = (i - 1) * b - offset;

    /* Grass cap. */
    ctx.fillStyle = css(sky.grass);
    ctx.fillRect(x, view.groundY, b + 1, grassH);
    ctx.fillStyle = css(shade(sky.grass, 0.2));
    ctx.fillRect(x, view.groundY, b + 1, Math.max(1, b * 0.07));
    ctx.fillStyle = css(sky.grassShade);
    ctx.fillRect(x, view.groundY + grassH - b * 0.06, b + 1, b * 0.06);

    /* A couple of blades, placed by the column's own hash so they travel with
       the ground rather than shimmering in place. */
    if (hash(col * 1.7) > 0.55) {
      ctx.fillStyle = css(shade(sky.grass, 0.3));
      const bx = x + hash(col * 4.2) * b * 0.7;
      ctx.fillRect(bx, view.groundY - b * 0.1, Math.max(1, b * 0.08), b * 0.1);
    }

    /* Dirt, with a speckle or two. */
    for (let r = 0; r < 2; r += 1) {
      if (hash(col * 2.9 + r * 13) > 0.6) {
        ctx.fillStyle = css(sky.dirtShade);
        const sx = x + hash(col * 3.3 + r) * b * 0.7;
        const sy = view.groundY + grassH + hash(col * 6.1 + r) * b * 0.6;
        ctx.fillRect(sx, sy, b * 0.18, b * 0.18);
      }
    }

    /* The block grid itself: one hairline down each seam. */
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(x, view.groundY, 1, view.h - view.groundY);
  }
}

/* ---------------------------------------------------------------
   Obstacles
   --------------------------------------------------------------- */

function paintObstacle(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  o: Obstacle,
  sky: Sky,
  sprites: Sprites
) {
  const b = view.b;
  const x = o.x * b;
  const y = view.groundY - (o.y + o.h) * b;
  const w = o.w * b;
  const h = o.h * b;

  if (x > view.w + b || x + w < -b) return;

  const art = o.kind === "bird" ? sprites.bird : sprites.rock;
  if (art) {
    /* A bird's drawing flaps by squashing — the sprite the family supply later
       is a single frame, and this is how it gets a wingbeat for nothing. */
    if (o.kind === "bird") {
      const flap = Math.sin(g.t * 11 + o.seed * 6) * 0.14;
      ctx.drawImage(art, x, y + flap * h * 0.5, w, h * (1 - flap));
    } else {
      ctx.drawImage(art, x, y, w, h);
    }
  } else if (o.kind === "bird") {
    paintBird(ctx, g, x, y, w, h, o.seed);
  } else {
    paintRock(ctx, x, y, w, h, o.seed);
  }

  /* Spent obstacles are the ones that already took a life. Greyed slightly so
     a player can see at a glance which rock is still live — and so the one
     they just clipped stops looking like a fresh threat. */
  if (o.spent) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x, y, w, h);
  }

  /* The shadow it casts, which is most of what tells a player where a bird
     actually is above the ground. */
  if (o.kind === "bird") {
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(x + w * 0.15, view.groundY + b * 0.08, w * 0.7, b * 0.1);
  }
}

/** Grey stone, a lighter crown, and two chips of shadow. */
function paintRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
) {
  /* Warm grey rather than neutral. The hills either side of it are hazed
     toward the sky, which at dawn and sunset is pink — a neutral stone sat in
     the middle of that reads as part of the scenery. */
  const base: Rgb = [146, 138, 132];
  const wide = w > h * 1.5;
  const key = Math.max(1.5, h * 0.05);

  /* A two-block rock is drawn as two cubes rather than one long one, so it
     reads as the two blocks it costs a player to jump. */
  const parts = wide ? 2 : 1;
  for (let i = 0; i < parts; i += 1) {
    const px = x + (i * w) / parts;
    const pw = w / parts;
    const lift = i === 1 ? h * 0.12 : 0;
    cube(
      ctx,
      px,
      y + lift,
      pw,
      h - lift,
      mix(base, [182, 172, 160], hash(seed + i)),
      0.16,
      key
    );
  }

  ctx.fillStyle = "rgba(60,54,52,0.28)";
  ctx.fillRect(x + w * 0.2, y + h * 0.42, w * 0.18, h * 0.16);
  ctx.fillRect(x + w * 0.58, y + h * 0.62, w * 0.14, h * 0.12);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(x + w * 0.22, y + h * 0.2, w * 0.2, h * 0.1);
}

/** A blocky bird, wings beating out of the clock rather than out of frames. */
function paintBird(
  ctx: CanvasRenderingContext2D,
  g: Game,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
) {
  const body: Rgb = [92, 112, 182];
  const wing: Rgb = [226, 232, 248];
  const beat = Math.sin(g.t * 11 + seed * 6);

  const u = w * 0.2;
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;

  /* Wings: two bars that swing above and below the body together. */
  const lift = beat * h * 0.3;
  ctx.fillStyle = css(wing);
  ctx.fillRect(cx - u * 2.6, cy - lift - u * 0.4, u * 2.2, u * 0.9);
  ctx.fillRect(cx + u * 0.4, cy - lift - u * 0.4, u * 2.2, u * 0.9);
  ctx.fillStyle = css(shade(wing, -0.18));
  ctx.fillRect(cx - u * 2.6, cy - lift + u * 0.3, u * 2.2, u * 0.2);
  ctx.fillRect(cx + u * 0.4, cy - lift + u * 0.3, u * 2.2, u * 0.2);

  cube(ctx, cx - u, cy - u * 0.9, u * 2, u * 1.8, body, 0.16, Math.max(1.5, h * 0.05));

  /* Beak and eye, pointing the way it is travelling — at the player. */
  ctx.fillStyle = "#E8B23A";
  ctx.fillRect(cx - u * 1.9, cy - u * 0.1, u * 0.9, u * 0.5);
  ctx.fillStyle = "#1D1726";
  ctx.fillRect(cx - u * 0.7, cy - u * 0.5, u * 0.45, u * 0.45);
}

/* ---------------------------------------------------------------
   The player
   --------------------------------------------------------------- */

function paintPlayer(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  sky: Sky,
  sprites: Sprites
) {
  const b = view.b;
  const x = PLAYER_X * b;
  const y = view.groundY - (g.y + 1) * b;

  /*
   * The shadow, and it earns its place: on a jump it stays on the ground and
   * shrinks, which is the only cue that says how high the player actually is.
   * Without it the whole field reads as flat and a bird's height is a guess.
   */
  const lift = Math.min(1, g.y / 1.6);
  ctx.fillStyle = `rgba(0,0,0,${0.22 * (1 - lift * 0.7)})`;
  const sw = b * (0.72 - lift * 0.28);
  ctx.fillRect(x + (b - sw) / 2, view.groundY + b * 0.06, sw, b * 0.11);

  /* The dust a run kicks up. Only while the feet are down. */
  if (g.grounded && g.status === "running") {
    for (let i = 0; i < 3; i += 1) {
      const age = (g.run * 3 + i * 0.33) % 1;
      const d = b * (0.1 + age * 0.75);
      ctx.fillStyle = css(shade(sky.dirt, 0.25), 0.45 * (1 - age));
      ctx.fillRect(x - d, view.groundY - age * b * 0.3, b * 0.14, b * 0.14);
    }
  }

  if (!playerVisible(g)) return;

  /* A gentle bob while running, flattened out in the air — a head that kept
     bouncing mid-jump would fight the arc it is already drawing. */
  const bob = g.grounded ? Math.sin(g.run * 13) * b * 0.045 : 0;

  ctx.save();
  ctx.translate(x, y + bob);

  if (sprites.player) {
    ctx.drawImage(sprites.player, 0, 0, b, b);
  } else {
    paintHead(ctx, b, g);
  }

  ctx.restore();
}

/**
 * The placeholder: a blocky head with a crown, drawn from the origin into a
 * one-block square.
 *
 * It is here to be replaced. Point `GAME_PLAYER_SPRITE` in `app/config.ts` at
 * a cut-out of Mikhayla's head and this function is never called again — the
 * renderer prefers the image wherever one has loaded. Until then the game is
 * playable, which is the whole job of a placeholder: nothing downstream is
 * waiting on the art.
 */
function paintHead(ctx: CanvasRenderingContext2D, b: number, g: Game) {
  const skin: Rgb = [246, 214, 190];
  const hair: Rgb = [84, 54, 46];
  const u = b / 16; // a sixteenth, so this is drawn like a pixel sprite

  /* Hair behind, face in front. */
  ctx.fillStyle = css(hair);
  ctx.fillRect(u * 2, u * 3, u * 12, u * 12);

  ctx.fillStyle = css(skin);
  ctx.fillRect(u * 3.5, u * 5, u * 9, u * 9);
  ctx.fillStyle = css(shade(skin, -0.1));
  ctx.fillRect(u * 3.5, u * 12.6, u * 9, u * 1.4);

  /* Fringe. */
  ctx.fillStyle = css(hair);
  ctx.fillRect(u * 3.5, u * 5, u * 9, u * 2.2);
  ctx.fillRect(u * 2.4, u * 5, u * 1.6, u * 8);
  ctx.fillRect(u * 12, u * 5, u * 1.6, u * 8);

  /* Eyes — they blink, which costs two lines and is the thing that makes a
     square of pixels read as a face. */
  const blink = Math.sin(g.t * 1.7) > 0.985;
  ctx.fillStyle = "#2E1F3D";
  const eyeH = blink ? u * 0.5 : u * 1.8;
  ctx.fillRect(u * 5.4, u * 8.4, u * 1.6, eyeH);
  ctx.fillRect(u * 9, u * 8.4, u * 1.6, eyeH);
  if (!blink) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(u * 5.8, u * 8.7, u * 0.6, u * 0.6);
    ctx.fillRect(u * 9.4, u * 8.7, u * 0.6, u * 0.6);
  }

  /* Cheeks and a smile. */
  ctx.fillStyle = "rgba(216,120,140,0.5)";
  ctx.fillRect(u * 4.4, u * 10.4, u * 1.4, u * 1);
  ctx.fillRect(u * 10.2, u * 10.4, u * 1.4, u * 1);
  ctx.fillStyle = "#8E4258";
  ctx.fillRect(u * 7, u * 11.2, u * 2, u * 0.8);
  ctx.fillRect(u * 6.4, u * 10.6, u * 0.6, u * 0.6);
  ctx.fillRect(u * 9, u * 10.6, u * 0.6, u * 0.6);

  /* And her crown, because it is her invitation. */
  ctx.fillStyle = "#D4AF37";
  ctx.fillRect(u * 4.4, u * 2.6, u * 7.2, u * 1.6);
  ctx.fillRect(u * 4.4, u * 1, u * 1.5, u * 2);
  ctx.fillRect(u * 7.2, u * 0.4, u * 1.6, u * 2.6);
  ctx.fillRect(u * 10.1, u * 1, u * 1.5, u * 2);
  ctx.fillStyle = "#F0DFA8";
  ctx.fillRect(u * 4.4, u * 2.6, u * 7.2, u * 0.5);
  ctx.fillStyle = "#A8325C";
  ctx.fillRect(u * 7.6, u * 3, u * 0.9, u * 0.9);
}
