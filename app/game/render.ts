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
    paintRabbit(ctx, x, y, w, h, o.seed, g.t);
  } else if (o.kind === "boulder") {
    spin(ctx, g, o, x, y, w, h, () => paintBoulder(ctx, x, y, w, h, o.seed));
  } else {
    paintRock(ctx, x, y, w, h, o.seed);
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
   Rocks — which are castle masonry
   ---------------------------------------------------------------
   A chunk of battlement rather than a stone: courses of grey brick with
   staggered joints and a crenellated top. It is the one obstacle the player
   meets in the first ten seconds, so it is also the one that sets what the
   game is about — and a fragment of castle wall says "this is her invitation"
   where a boulder said "this is a running game".

   Grey, and the grey matters. Everything else on the field is green, blue or
   brown; cut stone is the one surface that reads as *built* rather than grown,
   and the keyline underneath it is what keeps it legible when the sky goes
   dark. See `cube` for why every obstacle carries one.
   --------------------------------------------------------------- */

/**
 * The silhouette: merlons up top, solid wall below.
 *
 * Returned as an alternating run of columns — the odd ones are the gaps a
 * bowman would shoot through — so a one-block piece gets three merlons and a
 * wide one gets four or five, and both are built from the same rule rather
 * than from two drawings.
 */
function battlement(w: number, h: number) {
  /* Forced odd, so the piece begins and ends on a merlon and reads as a
     fragment of wall rather than as a comb. */
  const slots = Math.max(3, Math.round(w / (h * 0.26)) | 1);
  return { slots, slotW: w / slots, crenel: h * 0.2 };
}

function paintRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
) {
  const { slots, slotW, crenel } = battlement(w, h);

  const base: Rgb = [152, 148, 144];
  const lit: Rgb = [200, 196, 190];
  const mortar: Rgb = [92, 88, 86];
  const shadow: Rgb = [118, 114, 112];

  /* Every merlon and the wall under them, as one path. Built once and used
     three times over: for the keyline, as the clip the brickwork is laid
     inside, and for the lit top faces. */
  const silhouette = (grow: number) => {
    ctx.beginPath();
    for (let i = 0; i < slots; i += 1) {
      const top = i % 2 === 0 ? 0 : crenel;
      ctx.rect(x + i * slotW - grow, y + top - grow, slotW + grow * 2, h - top + grow);
    }
  };

  const key = Math.max(1.5, h * 0.05);
  ctx.fillStyle = "rgba(28,22,34,0.6)";
  silhouette(key);
  ctx.fill();

  ctx.save();
  silhouette(0);
  ctx.clip();

  ctx.fillStyle = css(base);
  ctx.fillRect(x, y, w, h);

  /*
   * The courses, laid from the bottom up so the bed joint always sits on the
   * ground rather than wherever the division happened to fall. Alternate
   * courses are offset by half a brick, which is the whole of what makes
   * masonry read as masonry — in line, it reads as a grid.
   */
  const courseH = h / 5;
  const brickW = h / 3;
  const joint = Math.max(1, h * 0.022);

  for (let c = 0; c * courseH < h; c += 1) {
    const top = y + h - (c + 1) * courseH;
    const offset = (c % 2) * brickW * 0.5;

    for (let b = -1; x + b * brickW + offset < x + w; b += 1) {
      const bx = x + b * brickW + offset;

      /* A little variation per brick, fixed by its own position so a wall
         does not shimmer as it crosses the screen. */
      const n = hash(seed * 17 + c * 7.3 + b * 2.9);
      if (n > 0.78) {
        ctx.fillStyle = css(mix(base, lit, 0.25));
        ctx.fillRect(bx, top, brickW, courseH);
      } else if (n < 0.18) {
        ctx.fillStyle = css(mix(base, shadow, 0.5));
        ctx.fillRect(bx, top, brickW, courseH);
      }

      /* The perpend — the vertical joint between this brick and the next. */
      ctx.fillStyle = css(mortar, 0.75);
      ctx.fillRect(bx, top, joint, courseH);
    }

    /* And the bed joint along the top of the course. */
    ctx.fillStyle = css(mortar, 0.75);
    ctx.fillRect(x, top, w, joint);

    /* A hairline of light under each bed joint, which is what gives the wall
       its depth: the course below catches the sun on its own top edge. */
    ctx.fillStyle = css(lit, 0.35);
    ctx.fillRect(x, top + joint, w, joint);
  }

  ctx.restore();

  /* The sunlit top face of every merlon and of each crenel floor. Outside the
     clip, because these are the edges of the silhouette rather than anything
     laid inside it. */
  ctx.fillStyle = css(lit);
  for (let i = 0; i < slots; i += 1) {
    const top = i % 2 === 0 ? 0 : crenel;
    ctx.fillRect(x + i * slotW, y + top, slotW, Math.max(1.5, h * 0.045));
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
  seed: number
) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2;
  const rows = 14;
  const py = (r * 2) / rows;

  /* Grey, like the masonry — but round and unjointed, because this one is a
     stone that came loose rather than a piece of wall. */
  const base: Rgb = [138, 132, 128];
  const lit: Rgb = [190, 184, 176];
  const dark: Rgb = [92, 86, 84];

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
  t: number
) {
  const u = w / 16;
  const v = h / 16;

  const fur: Rgb = hash(seed * 7) > 0.5 ? [206, 190, 174] : [172, 150, 132];
  const dark = mix(fur, [0, 0, 0], 0.28);
  const shadeFur = mix(fur, [0, 0, 0], 0.14);

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

