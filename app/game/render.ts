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
  GRAVITY,
  GROUND_ROWS,
  JUMP_FRAMES,
  JUMP_MAX,
  MAX_COLS,
  MIN_COLS,
  PLAYER_CELL,
  PLAYER_DRAW_H,
  PLAYER_X,
  RUN_CYCLE_BLOCKS,
  RUN_FRAMES,
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

/**
 * Under snow, everything goes white — but only as white as it should.
 *
 * The amount is per-surface rather than one figure for the whole field, and it
 * has to be: snow lies thickly on grass, patchily on a bush, and not at all on
 * a berry. More to the point, a scene whitened uniformly stops having any
 * shape in it. The amounts below are chosen so the forms survive, and the dark
 * keyline every obstacle carries is what finally holds them apart — it is the
 * one thing on the field that the weather never touches.
 */
const FROST: Rgb = [242, 248, 255];

function frost(c: Rgb, snow: number, amount = 1): Rgb {
  return snow > 0.01 ? mix(c, FROST, Math.min(1, snow * amount)) : c;
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
  const weather = g.rain > 0.01;
  const snowing = g.snow > 0.01;

  /* Settled on one hour, and nothing to do to it: hand back the constant
     itself. A third of the game is spent here, and this is the only path
     through this function that allocates nothing. */
  if (g.skyBlend >= 1 && !weather && !snowing) return to;

  let out: Sky;
  if (g.skyBlend >= 1) {
    /* Copied, not returned. `SKIES[n]` is a module constant and the rain pass
       below writes to whatever this hands back — returning the constant itself
       would darken that hour permanently, for the rest of the run. */
    out = { ...to };
  } else {
    const from = SKIES[g.skyFrom];
    const t = g.skyBlend;
    out = {
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

  /*
   * And then the weather, over the top of whatever hour it is.
   *
   * Done to the *palette* rather than as a grey sheet laid over the finished
   * frame, which is the whole difference between a scene under cloud and a
   * scene behind a dirty window. Every surface darkens by its own amount —
   * the sky most, because that is where the cloud is; the ground least,
   * because the ground is lit by the sky rather than being it — and they go
   * toward one slate blue rather than toward black, because an overcast day
   * is blue-grey and a dimmed one is just dim.
   */
  if (weather) {
    const k = g.rain;
    const storm: Rgb = [56, 62, 80];
    const damp = (c: Rgb, amount: number) => mix(c, storm, amount * k);

    out.high = damp(out.high, 0.62);
    out.mid = damp(out.mid, 0.56);
    out.low = damp(out.low, 0.48);
    out.cloud = damp(out.cloud, 0.46);
    out.cloudShade = damp(out.cloudShade, 0.52);
    out.hillFar = damp(out.hillFar, 0.42);
    out.hillNear = damp(out.hillNear, 0.36);
    out.grass = damp(out.grass, 0.3);
    out.grassShade = damp(out.grassShade, 0.32);
    out.dirt = damp(out.dirt, 0.38);
    out.dirtShade = damp(out.dirtShade, 0.38);

    /* No stars through a rain cloud, and no warm wash either — the hour's
       tint is sunlight, and the sun is behind all of this. */
    out.stars *= 1 - k;
    out.tintAlpha *= 1 - k * 0.75;
  }

  /*
   * And snow, which does the opposite of rain to the same palette.
   *
   * Everything goes toward one cold white — but *partly*, which is the whole
   * instruction here. The hour is still supposed to show through: a snowy
   * midnight is a blue-white and a snowy sunset is a pink-white, and both stop
   * being either if the mix goes to one. The ground takes the most because
   * snow lies on it; the sky takes less than it looks, because a white sky
   * that has lost its hour is just a blank page.
   */
  if (snowing) {
    const k = g.snow;
    const ice = (c: Rgb, amount: number) => frost(c, k, amount);

    out.high = ice(out.high, 0.66);
    out.mid = ice(out.mid, 0.72);
    out.low = ice(out.low, 0.78);
    out.cloud = ice(out.cloud, 0.88);
    out.cloudShade = ice(out.cloudShade, 0.72);
    out.hillFar = ice(out.hillFar, 0.84);
    out.hillNear = ice(out.hillNear, 0.78);
    out.grass = ice(out.grass, 0.92);
    out.grassShade = ice(out.grassShade, 0.82);
    out.dirt = ice(out.dirt, 0.74);
    out.dirtShade = ice(out.dirtShade, 0.68);

    /* A few stars still get through a snow sky, where none get through rain. */
    out.stars *= 1 - k * 0.55;
    out.tintAlpha *= 1 - k * 0.5;
  }

  return out;
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
  /** Her three animations, as strips — see `paintPlayer`. */
  run: CanvasImageSource | null;
  jump: CanvasImageSource | null;
  hurt: CanvasImageSource | null;
  rock: CanvasImageSource | null;
  bird: CanvasImageSource | null;
  rabbit: CanvasImageSource | null;
  boulder: CanvasImageSource | null;
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
  paintDisc(ctx, view, sky, 1 - Math.max(g.rain, g.snow));
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

  /* Weather, outside the shake — rain that lurched with the ground would read
     as the camera moving rather than as rain. */
  paintWeather(ctx, g, view);

  /* And the hit, which is outside the shake so it covers the whole screen
     rather than lurching with the world. */
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(214,52,66,${g.flash * 0.34})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

/* ---------------------------------------------------------------
   Weather
   ---------------------------------------------------------------
   Rain and snow, each drawn at its own strength — see `rain` and `snow` on
   the game, which ease between 0 and 1 over several seconds. Clear weather is
   both at zero and costs two comparisons.

   Neither is stored. Every drop and every flake is a function of its own index
   and the clock, the same trick the hills and the stars use, so a storm that
   lasts four minutes allocates nothing at all.
   --------------------------------------------------------------- */

function paintWeather(ctx: CanvasRenderingContext2D, g: Game, view: View) {
  if (g.rain > 0.01) paintRain(ctx, g, view);
  if (g.snow > 0.01) paintSnow(ctx, g, view);
}

function paintRain(ctx: CanvasRenderingContext2D, g: Game, view: View) {
  const amount = g.rain;

  /*
   * A thin wash only. The weather's real darkening is done to the palette, in
   * `skyNow`, so that every surface dims by an amount that suits it — this is
   * just the haze in the air between the player and the field, and laying any
   * more of it on top flattens the whole picture to one grey.
   */
  ctx.fillStyle = `rgba(62,72,96,${0.1 * amount})`;
  ctx.fillRect(0, 0, view.w, view.h);

  /*
   * The drops lean *with* the run. She is travelling right, so the world's air
   * is travelling left past her, and rain falling into that leans left — the
   * same reason rain leans back along a moving train.
   */
  const lean = -view.b * 0.5;
  const fall = view.h + view.b * 2;

  /* Short and many rather than long and few. Long streaks read as scratches on
     the lens — a raindrop at this distance is a tick, and what makes it rain is
     how many of them there are. */
  const count = Math.round(200 * amount);

  ctx.strokeStyle = `rgba(214,228,255,${0.46 * amount})`;
  ctx.lineWidth = Math.max(1, view.b * 0.026);
  ctx.beginPath();
  for (let i = 0; i < count; i += 1) {
    const speed = 1.1 + hash(i * 2.3) * 0.7;
    const x = hash(i * 5.1) * (view.w + view.b * 4) - view.b * 2;
    const y = ((hash(i * 7.9) + g.t * speed * 0.55) % 1) * fall - view.b;
    const len = view.b * (0.16 + hash(i * 3.3) * 0.14);
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean * (len / view.b), y + len);
  }
  ctx.stroke();

  paintSplashes(ctx, g, view, amount);
}

/**
 * Where the rain lands: a tick on the grass that opens and fades.
 *
 * It is the thing that joins the rain to the ground. Without it the drops fall
 * past the bottom of the screen and the field they are falling on might as
 * well be under glass — and a splash is cheap, where actually colliding two
 * hundred drops with a ground line would not be.
 *
 * Each has its own period and its own place, so they do not pulse together;
 * none of them is stored, for the same reason nothing else here is.
 */
function paintSplashes(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  amount: number
) {
  const count = Math.round(36 * amount);
  const line = view.groundY + view.b * 0.02;

  for (let i = 0; i < count; i += 1) {
    const period = 0.45 + hash(i * 3.7) * 0.5;
    const life = ((g.t / period) + hash(i * 8.1)) % 1;
    /* Each splash is only alive for the first half of its period; the rest is
       the gap before the next drop lands in the same place. */
    if (life > 0.5) continue;

    const p = life / 0.5;
    const x = hash(i * 5.3) * view.w;
    const fade = (1 - p) * 0.9 * amount;
    const w = view.b * (0.06 + p * 0.16);
    const t = Math.max(1, view.b * 0.022);

    ctx.fillStyle = `rgba(226,238,255,${fade})`;
    /* The ring, as the two ends of one — side on, that is all of it you see. */
    ctx.fillRect(x - w, line, w * 0.5, t);
    ctx.fillRect(x + w * 0.5, line, w * 0.5, t);

    /* And two specks thrown up out of it, falling back as they fade. */
    const lift = view.b * 0.12 * Math.sin(p * Math.PI);
    ctx.fillRect(x - w * 0.8, line - lift, t, t);
    ctx.fillRect(x + w * 0.7, line - lift, t, t);
  }
}

function paintSnow(ctx: CanvasRenderingContext2D, g: Game, view: View) {
  const amount = g.snow;

  /* Snow light is cold and flat rather than dark. */
  ctx.fillStyle = `rgba(198,214,238,${0.17 * amount})`;
  ctx.fillRect(0, 0, view.w, view.h);

  const fall = view.h + view.b * 2;
  const count = Math.round(85 * amount);

  for (let i = 0; i < count; i += 1) {
    const speed = 0.12 + hash(i * 1.7) * 0.12;
    const size = view.b * (0.05 + hash(i * 9.1) * 0.06);

    /* Each flake wanders on its own sine as it comes down, which is the whole
       difference between snow and falling dust. */
    const sway = Math.sin(g.t * (0.5 + hash(i * 4.4) * 0.7) + i) * view.b * 0.5;
    const x = hash(i * 5.1) * (view.w + view.b * 2) - view.b + sway;
    const y = ((hash(i * 7.9) + g.t * speed) % 1) * fall - view.b;

    ctx.fillStyle = `rgba(255,255,255,${(0.55 + hash(i * 6.2) * 0.4) * amount})`;
    ctx.fillRect(x, y, size, size);
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

/** `through` is how much of it the weather lets past: 1 in the clear, 0 in either. */
function paintDisc(
  ctx: CanvasRenderingContext2D,
  view: View,
  sky: Sky,
  through: number
) {
  if (through <= 0.01) return;
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
  glow.addColorStop(0, css(sky.discGlow, 0.5 * through));
  glow.addColorStop(1, css(sky.discGlow, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - size * 2.4, y - size * 2.4, size * 5.8, size * 5.8);

  ctx.fillStyle = css(sky.disc, through);
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = css(shade(sky.disc, 0.35), 0.8 * through);
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
  /* Half as far apart under either weather, so twice as many are overhead —
     which is what an overcast sky is, rather than the same few clouds painted
     a different colour. */
  const span = 9 - 4.6 * Math.max(g.rain, g.snow);
  const shift = g.distance * 0.12;
  const first = Math.floor((shift - span) / span);
  const last = Math.ceil((shift + view.cols + span) / span);

  for (let k = first; k <= last; k += 1) {
    const r = hash(k * 2.3);
    const r2 = hash(k * 5.9);
    const x = (k * span + r * 3 - shift) * view.b;
    if (x > view.w + view.b * 6 || x < -view.b * 6) continue;
    const y = (0.25 + r2 * 0.55) * view.groundY * 0.52;
    const unit = view.b * (0.42 + r * 0.26) * (1 + 0.3 * Math.max(g.rain, g.snow));
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

  if (g.rain > 0.01) paintWetGround(ctx, g, view, b, grassH, offset, first, cols);
}

/**
 * What the rain does to the ground it is falling on.
 *
 * Two things, and the second is the one that sells it. The sheen along the
 * grass line is wet grass catching what light there is — a single pale band,
 * because a wet surface seen side on returns the sky in a stripe rather than
 * all over. The puddles are standing water, and they are dark rather than
 * light: a puddle is a hole in the ground as far as the eye is concerned,
 * reflecting a sky that this weather has already made darker than the field.
 *
 * Both scroll on the ground's own offset, so they travel with the grass rather
 * than swimming over it — which is the single thing that would give the whole
 * effect away.
 */
function paintWetGround(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  b: number,
  grassH: number,
  offset: number,
  first: number,
  cols: number
) {
  const wet = g.rain;

  /* The sheen, straight along the top of the grass. */
  ctx.fillStyle = `rgba(188,214,246,${0.2 * wet})`;
  ctx.fillRect(0, view.groundY, view.w, Math.max(1, b * 0.045));

  for (let i = 0; i < cols; i += 1) {
    const col = first + i;
    const x = (i - 1) * b - offset;

    /* About one column in four has standing water on it. Placed by the
       column's own hash, so a puddle stays on the same patch of ground for as
       long as that ground is on screen. */
    if (hash(col * 8.3) > 0.72) {
      const pw = b * (0.5 + hash(col * 2.1) * 0.9);
      const px = x + hash(col * 4.9) * (b - pw * 0.5);
      const py = view.groundY + grassH * 0.35;
      const ph = Math.max(2, b * 0.075);

      ctx.fillStyle = `rgba(42,56,78,${0.5 * wet})`;
      ctx.fillRect(px, py, pw, ph);
      /* A bright lip along the near edge, which is the whole of what makes a
         dark patch read as water rather than as a hole. */
      ctx.fillStyle = `rgba(206,228,255,${0.4 * wet})`;
      ctx.fillRect(px, py, pw, Math.max(1, b * 0.018));
    }
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
  const w = o.w * b;
  const h = o.h * b;
  const y = view.groundY - (o.y + o.h) * b;

  if (x > view.w + b * 2 || x + w < -b * 2) return;

  /* The burrow is drawn first and always, whatever the rabbit is doing — it is
     the tell. A hole on its own means something may come out of it; a hole with
     a rabbit sitting in it means that rabbit may drop. Either way the player is
     told to watch this spot a second before anything happens. */
  if (o.kind === "rabbit") paintHole(ctx, view, x + w / 2, w * 0.56);

  const art = spriteFor(o.kind, sprites);

  ctx.save();
  /* Anything that lives in a hole is clipped at the grass line, which is what
     turns "its y is negative" into "it is underground". */
  if (o.kind === "rabbit") {
    ctx.beginPath();
    ctx.rect(-view.w, -view.h, view.w * 3, view.h + view.groundY + b * 0.04);
    ctx.clip();
  }

  if (art) {
    /* A bird's drawing flaps by squashing — the sprite the family supply later
       is a single frame, and this is how it gets a wingbeat for nothing. */
    if (o.kind === "bird") {
      const flap = Math.sin(g.t * 11 + o.seed * 6) * 0.14;
      ctx.drawImage(art, x, y + flap * h * 0.5, w, h * (1 - flap));
    } else if (o.kind === "boulder") {
      spin(ctx, g, o, x, y, w, h, () => ctx.drawImage(art, x, y, w, h));
    } else {
      ctx.drawImage(art, x, y, w, h);
    }
  } else if (o.kind === "bird") {
    paintBird(ctx, g, x, y, w, h, o.seed);
  } else if (o.kind === "rabbit") {
    paintRabbit(ctx, x, y, w, h, o.seed, g.t, g.snow);
  } else if (o.kind === "boulder") {
    spin(ctx, g, o, x, y, w, h, () => paintBoulder(ctx, x, y, w, h, o.seed, g.snow));
  } else {
    paintRock(ctx, x, y, w, h, o.seed, g.snow);
  }

  /* Spent obstacles are the ones that already took a life. Washed out so a
     player can see at a glance which is still live — and so the one they just
     clipped stops looking like a fresh threat. */
  if (o.spent) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(x - b * 0.1, y - b * 0.1, w + b * 0.2, h + b * 0.2);
  }

  ctx.restore();

  /* The shadow it casts, which is most of what tells a player how high a bird
     actually is. It shrinks and fades with height, like the player's own. */
  if (o.kind === "bird") {
    const lift = Math.min(1, o.y / 2.8);
    const sw = w * (0.72 - lift * 0.3);
    ctx.fillStyle = `rgba(0,0,0,${0.16 * (1 - lift * 0.6)})`;
    ctx.fillRect(x + (w - sw) / 2, view.groundY + b * 0.08, sw, b * 0.09);
  }
}

function spriteFor(kind: Obstacle["kind"], sprites: Sprites): CanvasImageSource | null {
  if (kind === "bird") return sprites.bird;
  if (kind === "rabbit") return sprites.rabbit;
  if (kind === "boulder") return sprites.boulder;
  return sprites.rock;
}

/**
 * Turn whatever is drawn inside by how far it has rolled.
 *
 * The angle is read off the distance travelled rather than kept on the
 * obstacle: a wheel of radius r that has rolled d turns by d/r, and the
 * boulder's travel is simply where it entered less where it is now. One less
 * field to keep in step, and it can never drift out of phase with the ground.
 */
function spin(
  ctx: CanvasRenderingContext2D,
  g: Game,
  o: Obstacle,
  x: number,
  y: number,
  w: number,
  h: number,
  draw: () => void
) {
  const radius = o.w / 2;
  const rolled = g.cols + 0.5 - o.x;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-rolled / radius);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  draw();
  ctx.restore();
}

/**
 * A blocky bird, wings beating out of the clock rather than out of frames.
 *
 * Nothing here knows which lane it is in — high, low, or halfway through
 * swapping. The engine moves `y` and this draws whatever it is given, which is
 * what lets one drawing serve all three of the birds in the game.
 */
function paintBird(
  ctx: CanvasRenderingContext2D,
  g: Game,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
) {
  const body = frost([92, 112, 182], g.snow, 0.84);
  const wing = frost([226, 232, 248], g.snow, 0.9);
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
   Rocks — which are bushes
   ---------------------------------------------------------------
   A dense green bush with fruit on it. Still the obstacle the player meets in
   the first ten seconds, so it still sets what the game is about: a garden
   with things growing in it rather than a quarry.

   Legibility is the whole problem with a green obstacle on green ground, and
   it is solved three ways at once rather than by hoping. The foliage is darker
   and far more saturated than either the grass or the hazed hills behind it;
   every bush carries the same dark keyline as everything else that can hit
   you; and the fruit is red, which is the one hue nothing else on the field
   shares. The last of those is doing the most work — a player reads "red dots"
   long before they read "bush".
   --------------------------------------------------------------- */

/** How many pixel rows tall every bush is drawn on. */
const BUSH_ROWS = 16;

/**
 * The top of each pixel column.
 *
 * Three or four overlapping mounds rather than one, which is the difference
 * between a bush and a hill: the silhouette has to break. Each mound is a
 * half-ellipse, and the jitter on top of them is deliberately coarser than a
 * rock's was — a leafy edge is meant to be ragged.
 */
function bushProfile(cols: number, seed: number, peaks: number[]): number[] {
  const tops: number[] = [];
  for (let i = 0; i < cols; i += 1) {
    const u = (i + 0.5) / cols;

    /* The lowest top of any mound wins — mounds union rather than average, so
       the silhouette is their outline rather than a mush of all of them. */
    let top = BUSH_ROWS;
    for (let k = 0; k < peaks.length; k += 1) {
      const d = Math.min(1, Math.abs(u - peaks[k]) / (0.62 / peaks.length));
      const lift = 2.6 + hash(seed * 13 + k) * 2.2;
      top = Math.min(top, lift + 10 * (1 - Math.sqrt(Math.max(0, 1 - d * d))));
    }

    const jitter = hash(seed * 37 + i * 1.7) < 0.35 ? 1 : 0;
    tops.push(Math.max(1, Math.min(BUSH_ROWS - 3, Math.round(top) + jitter)));
  }
  return tops;
}

function paintRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  snow: number
) {
  const wide = w > h * 1.5;
  const cols = wide ? BUSH_ROWS * 2 : BUSH_ROWS;
  const px = w / cols;
  const py = h / BUSH_ROWS;
  const peaks = wide ? [0.16, 0.42, 0.68, 0.9] : [0.22, 0.52, 0.8];
  const tops = bushProfile(cols, seed, peaks);

  /* Under snow the leaves go white and the fruit does not. A berry with snow
     on it is still a berry, and the red is the one thing on this field that
     survives both weathers — it is what a player actually tracks. */
  const leaf = frost([58, 116, 48], snow, 0.84);
  const lit = frost([108, 174, 70], snow, 0.9);
  const dark = frost([32, 68, 30], snow, 0.62);

  /* The keyline, as one pass of slightly over-sized columns underneath. It is
     what keeps a green bush legible against a green hill at every hour. */
  ctx.fillStyle = "rgba(20,32,20,0.62)";
  const key = Math.max(1.5, py * 0.5);
  for (let i = 0; i < cols; i += 1) {
    ctx.fillRect(
      x + i * px - key,
      y + tops[i] * py - key,
      px + key * 2,
      (BUSH_ROWS - tops[i]) * py + key
    );
  }

  for (let i = 0; i < cols; i += 1) {
    const top = tops[i];
    const cx = x + i * px;

    ctx.fillStyle = css(leaf);
    ctx.fillRect(cx, y + top * py, px + 0.5, (BUSH_ROWS - top) * py);

    /* Sun on the crown of each column, falling away down the right. */
    ctx.fillStyle = css(mix(lit, leaf, (i / cols) * 0.55));
    ctx.fillRect(cx, y + top * py, px + 0.5, py * 1.5);

    /* And the shade the bush casts into itself, along the ground. */
    ctx.fillStyle = css(dark, 0.45);
    ctx.fillRect(cx, y + h - py * 2.6, px + 0.5, py * 2.6);
  }

  /* Leaf gaps: a few darker notches, placed by the bush's own hash so they
     sit still while it crosses the screen. */
  ctx.fillStyle = css(dark, 0.5);
  for (let k = 0; k < (wide ? 9 : 5); k += 1) {
    const i = Math.floor(hash(seed * 11 + k) * cols);
    const row = tops[i] + 1 + Math.floor(hash(seed * 23 + k) * (BUSH_ROWS - tops[i] - 2));
    if (row >= BUSH_ROWS - 1) continue;
    ctx.fillRect(x + i * px, y + row * py, px * 1.5, py);
  }

  /* The fruit. Sitting on the foliage rather than floating in front of it —
     each one is placed a row or two under the leaf line of its own column, so
     it reads as hanging in the bush. */
  const berries = wide ? 6 : 4;
  for (let k = 0; k < berries; k += 1) {
    const i = Math.floor(hash(seed * 7.7 + k * 3.1) * (cols - 2)) + 1;
    const row = tops[i] + 1.4 + hash(seed * 19 + k) * (BUSH_ROWS - tops[i] - 3);
    if (row >= BUSH_ROWS - 1.2) continue;

    const bx = x + i * px;
    const by = y + row * py;
    const r = Math.max(2, py * 1.15);

    ctx.fillStyle = "rgba(20,32,20,0.55)";
    ctx.fillRect(bx - r * 0.5, by - r * 0.5, r * 2, r * 2);
    ctx.fillStyle = css(frost([210, 58, 82], snow, 0.18));
    ctx.fillRect(bx - r * 0.2, by - r * 0.2, r * 1.4, r * 1.4);
    ctx.fillStyle = "rgba(255,210,210,0.85)";
    ctx.fillRect(bx, by, r * 0.45, r * 0.45);
  }
}

/* ---------------------------------------------------------------
   The boulder
   ---------------------------------------------------------------
   Round, because it rolls — and the one obstacle drawn from its centre
   outward rather than from its box, since `spin` turns it.
   --------------------------------------------------------------- */

function paintBoulder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  snow: number
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  const rows = 14;
  const py = (r * 2) / rows;

  /* Grey, and round and unjointed — a stone that came loose rather than a
     piece of anything. Under snow it goes to a snowball, pits and all. */
  const base = frost([138, 132, 128], snow, 0.86);
  const lit = frost([190, 184, 176], snow, 0.9);
  const dark = frost([92, 86, 84], snow, 0.6);

  /* A pixel disc: every row as wide as the circle is at that height. Drawn
     twice, the first time over-sized, for the keyline. */
  const disc = (grow: number, style: string) => {
    ctx.fillStyle = style;
    for (let i = 0; i < rows; i += 1) {
      const dy = (i + 0.5) / rows - 0.5;
      const half = Math.sqrt(Math.max(0, 0.25 - dy * dy)) * 2 * r + grow;
      ctx.fillRect(cx - half, cy - r + i * py - grow * 0.5, half * 2, py + grow);
    }
  };

  disc(Math.max(1, py * 0.45), "rgba(28,22,34,0.6)");
  disc(0, css(base));

  /* The light catches the upper left; the lower right falls away. Both are
     fixed to the stone rather than to the screen, so they turn with it and the
     roll is legible. */
  ctx.fillStyle = css(lit, 0.85);
  ctx.fillRect(cx - r * 0.72, cy - r * 0.72, r * 0.7, r * 0.34);
  ctx.fillRect(cx - r * 0.45, cy - r * 0.95, r * 0.5, r * 0.3);
  ctx.fillStyle = css(dark, 0.45);
  ctx.fillRect(cx + r * 0.05, cy + r * 0.25, r * 0.75, r * 0.45);

  /* Three pits, placed by the boulder's own hash. These are what the eye
     actually tracks to see that it is turning. */
  ctx.fillStyle = css(dark, 0.7);
  for (let k = 0; k < 3; k += 1) {
    const a = hash(seed * 13 + k) * Math.PI * 2;
    const d = (0.25 + hash(seed * 29 + k) * 0.4) * r;
    ctx.fillRect(cx + Math.cos(a) * d - py * 0.6, cy + Math.sin(a) * d - py * 0.6, py * 1.3, py * 1.3);
  }
}

/* ---------------------------------------------------------------
   The burrow, and what comes out of it
   --------------------------------------------------------------- */

/**
 * A dark mouth cut into the grass. Drawn whether or not anybody is home.
 *
 * Narrower than the rabbit on purpose, so a rabbit sitting up covers it. If
 * the hole showed around a rabbit's feet you could tell at a glance which of
 * the three it was — and the whole of a rabbit is that you cannot. A hole on
 * its own means something may come out of it; a rabbit means something may
 * drop out of sight; neither says which.
 */
function paintHole(
  ctx: CanvasRenderingContext2D,
  view: View,
  cx: number,
  width: number
) {
  const b = view.b;

  /*
   * A dark slot in the grass, and nothing more.
   *
   * It was an ellipse, which is a hole seen from somewhere above — and this
   * ground is seen from directly to the side, where a hole has no opening to
   * show. All that is honest from here is the line where the ground stops, so
   * that is all this draws.
   *
   * The pale lip above it is the one thing it cannot do without. The slot alone
   * is dark on dark once the evening sky comes round, and this is a *tell* —
   * the only warning that something may come out of here — so it carries its
   * own light rather than borrowing the ground's.
   */
  const h = Math.max(2, b * 0.1);

  ctx.fillStyle = "rgba(255,244,226,0.4)";
  ctx.fillRect(cx - width / 2, view.groundY - h * 0.55, width, h * 0.5);

  ctx.fillStyle = "#140D0C";
  ctx.fillRect(cx - width / 2, view.groundY - h * 0.1, width, h);
}

/**
 * The rabbit: head low and forward, haunches up behind, two ears, a tail.
 *
 * Facing left, into the player, because that is the direction the whole world
 * travels and an animal looking the other way reads as scenery. Drawn as a
 * short stack of boxes rather than one rounded one — a single box is a loaf,
 * and the thing that makes this read as an animal at forty pixels tall is the
 * step down from the haunches to the head.
 */
function paintRabbit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  t: number,
  snow: number
) {
  const u = w / 16;
  const v = h / 16;

  /* A winter coat: she turns white with the weather, like a real one. The eye
     and the nose below are left alone — they are the whole of her face. */
  const fur = frost(hash(seed * 7) > 0.5 ? [206, 190, 174] : [172, 150, 132], snow, 0.88);
  const dark = frost(mix(fur, [0, 0, 0], 0.28), snow, 0.5);
  const shadeFur = frost(mix(fur, [0, 0, 0], 0.14), snow, 0.6);

  const box = (px: number, py: number, pw: number, ph: number, style: string) => {
    ctx.fillStyle = style;
    ctx.fillRect(x + px * u, y + py * v, pw * u, ph * v);
  };

  /* The ear nearest us twitches; the far one is darker and still. Between them
     that is the whole of the depth in this drawing. */
  const twitch = Math.sin(t * 2.3 + seed * 9) * 0.6;

  /* Keyline first, as one silhouette a little larger than everything that
     follows — the same trick the rocks use, and for the same reason: this has
     to read against a midnight sky as well as a morning one. */
  const key = "rgba(28,22,34,0.6)";
  box(6.6, 1.0, 2.6, 7.0, key); // far ear
  box(3.8, 0.0 + twitch, 2.8, 8.0, key); // near ear
  box(0.8, 6.0, 8.4, 10.0, key); // head
  box(5.4, 7.4, 10.2, 8.6, key); // haunches
  box(12.8, 9.0, 3.4, 4.0, key); // tail

  /* Far ear, then the near one over the top of it. */
  box(7.0, 1.4, 1.8, 6.4, css(dark));
  box(4.2, 0.4 + twitch, 2.0, 7.2, css(fur));
  box(4.6, 1.6 + twitch, 1.2, 4.6, "rgba(226,154,164,0.8)");

  /* Haunches behind, head in front and lower. The overlap is what gives the
     crouch. */
  box(5.8, 7.8, 9.4, 7.8, css(shadeFur));
  box(5.8, 13.0, 9.4, 2.6, css(dark, 0.5));
  box(1.2, 6.4, 7.6, 9.2, css(fur));
  box(1.2, 13.2, 7.6, 2.4, css(shadeFur));

  /* Tail, on the trailing side. */
  box(13.2, 9.4, 2.6, 3.2, "rgba(255,252,246,0.95)");

  /* And the face, on the leading edge: one eye and a nose is all it takes. */
  box(2.6, 8.8, 1.8, 1.8, "#241A22");
  box(2.9, 9.1, 0.6, 0.6, "rgba(255,255,255,0.85)");
  box(1.2, 11.0, 1.4, 1.1, "rgba(216,132,148,0.95)");
}

/* ---------------------------------------------------------------
   The player
   ---------------------------------------------------------------
   Three sprite strips, one cell each, built by `scripts/build-player.py`. The
   renderer's whole job here is to pick a strip, pick a frame, and put the cell
   on the ground in the right place.

   She is drawn `PLAYER_DRAW_H` blocks tall against a hitbox of one — see the
   note over that constant for why the overlap is deliberate.
   --------------------------------------------------------------- */

/** Which strip and which frame of it this moment wants. */
function pose(g: Game, sprites: Sprites) {
  /*
   * Hurt wins over everything, including being in the air.
   *
   * The crying face is the clearest signal in the game that a life has gone,
   * and it lasts exactly as long as the mercy does. A player hit at the top of
   * a jump gets a running pose for a fraction of a second, which is the lesser
   * of the two wrongs — and she is blinking throughout anyway.
   */
  if (g.t < g.invulnUntil) {
    return { strip: sprites.hurt ?? sprites.run, frames: RUN_FRAMES, frame: strideFrame(g) };
  }

  if (!g.grounded && sprites.jump) {
    /*
     * The jump's five frames read off her vertical speed rather than off a
     * clock: a stride, a push-off, the airborne peak, the fall, a stride
     * again. Speed is what the pose is actually *about*, so a jump cut short
     * by a tap and one held to the full height both show the right frame at
     * the right moment, with no timer to keep in step.
     */
    const v = g.vy / Math.sqrt(2 * GRAVITY * JUMP_MAX);
    const frame = v > 0.8 ? 0 : v > 0.3 ? 1 : v > -0.3 ? 2 : v > -0.8 ? 3 : 4;
    return { strip: sprites.jump, frames: JUMP_FRAMES, frame };
  }

  return { strip: sprites.run, frames: RUN_FRAMES, frame: strideFrame(g) };
}

/** Where she is in her stride, measured in ground covered rather than in time. */
function strideFrame(g: Game) {
  const cycle = (g.distance % RUN_CYCLE_BLOCKS) / RUN_CYCLE_BLOCKS;
  return Math.min(RUN_FRAMES - 1, Math.floor(cycle * RUN_FRAMES));
}

function paintPlayer(
  ctx: CanvasRenderingContext2D,
  g: Game,
  view: View,
  sky: Sky,
  sprites: Sprites
) {
  const b = view.b;
  const x = PLAYER_X * b;

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

  const { strip, frames, frame } = pose(g, sprites);

  /* The cell: taller than she is, because it holds the tallest of the three
     poses and carries a transparent gutter besides. See `PLAYER_CELL`. */
  const cellH = (b * PLAYER_DRAW_H) / PLAYER_CELL.runFill;
  const cellW = cellH * PLAYER_CELL.aspect;

  /* Centred on her hitbox, with the cell's *ground line* on the grass — which
     is not the cell's bottom edge, because of that gutter. */
  const left = x + b / 2 - cellW / 2;
  const feet = view.groundY - g.y * b;
  const top = feet - cellH * PLAYER_CELL.foot;

  if (!strip) {
    /* Nothing has loaded yet. A plain marker rather than an empty field —
       a player who cannot see herself cannot play at all. */
    cube(ctx, x + b * 0.2, feet - b * 0.9, b * 0.6, b * 0.9, [232, 180, 200], 0.16, 2);
    return;
  }

  const sheetW = (strip as HTMLImageElement).width || 0;
  const sheetH = (strip as HTMLImageElement).height || 0;
  const fw = sheetW / frames;

  /*
   * Smoothing back on for this one call. The whole field is drawn with it off,
   * which is what keeps the block art crisp — but she is painted artwork being
   * shrunk to a hundred pixels, and nearest-neighbour on that is a mess of
   * broken edges. Turned off again immediately, because everything drawn after
   * her expects it off.
   */
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(strip, frame * fw, 0, fw, sheetH, left, top, cellW, cellH);
  ctx.imageSmoothingEnabled = false;
}

