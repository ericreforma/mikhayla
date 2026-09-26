/**
 * The things that drift across her year.
 *
 * One drawing per princess: Snow White's apple, Elsa's snowflake, Ariel's
 * bubble. Every one is a flat SVG in the same 24×24 box the ornaments use,
 * sized to fill whatever square its particle gives it, and coloured by its
 * caller — the field picks a shade per particle so a dozen falling petals
 * aren't a dozen identical stamps.
 *
 * No hooks and no motion in here: these are stills. The movement all lives in
 * `MilestoneAmbience.tsx` and in the `mk-*` keyframes in `globals.css`, which
 * keeps the artwork readable and lets one drawing be reused at three
 * different speeds.
 */

type MotifProps = {
  /** The main body colour. */
  color: string;
  /** Veins, hearts, bellies — whatever the drawing marks its detail in. */
  detail?: string;
};

const BOX = "h-full w-full overflow-visible";

/**
 * A five-petal bloom, the same flower as the wallpaper on the title page so
 * the two read as one garden.
 *
 * The hairline round each petal is what keeps a pale bloom from dissolving
 * into a pale photograph — month zero's flowers are nursery pink falling
 * past a sheepskin, and without an edge half of them simply aren't there.
 * Drawn into the shape rather than applied as a `drop-shadow` filter: a
 * filter on each of sixteen moving petals is sixteen extra rasters a frame.
 */
export function Blossom({ color, detail = "#FFF8F0" }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="12"
          cy="6.6"
          rx="3.5"
          ry="5.2"
          fill={color}
          stroke="#6E4F63"
          strokeOpacity="0.2"
          strokeWidth="0.6"
          transform={`rotate(${a} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="2.7" fill={detail} />
    </svg>
  );
}

/** Snow White's apple — stem and leaf, or it is only a circle. */
export function Apple({ color, detail = "#4E7A3A" }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <path
        d="M12 7.6 C10.5 5.6 7.4 4.8 5.6 7 C3.4 9.5 4.4 15 7.2 18.8 C8.4 20.4 9.9 21.1 12 20 C14.1 21.1 15.6 20.4 16.8 18.8 C19.6 15 20.6 9.5 18.4 7 C16.6 4.8 13.5 5.6 12 7.6 Z"
        fill={color}
      />
      <ellipse
        cx="9.1"
        cy="10.8"
        rx="1.6"
        ry="2.5"
        fill="#FFF8F0"
        opacity="0.35"
        transform="rotate(-22 9.1 10.8)"
      />
      <path
        d="M12 7 C12 5.2 12.4 3.8 13.2 2.8"
        fill="none"
        stroke="#6B4A2E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M13.1 5 C14.6 3 17.2 2.7 18.6 3 C18.4 5.2 16.4 6.8 14 6.4 Z" fill={detail} />
    </svg>
  );
}

/**
 * Aurora's butterfly, seen from above so both wings show.
 *
 * The two wing groups carry `mk-wing`, which is what flaps them: each pivots
 * on the edge nearest the body, so the drawing has to keep its wings clear of
 * the centre line for the hinge to land in the right place.
 */
export function Butterfly({ color, detail = "#4A3355" }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <g className="mk-wing mk-wing-l">
        <path d="M11.4 9.6 C8.6 4.2 3.6 3.2 1.9 5.6 C0.2 8 3.2 11.4 11.4 12.2 Z" fill={color} />
        <path
          d="M11.4 12.6 C6.4 13.2 3.2 15.2 3.8 18 C4.4 20.6 8.6 20.4 11.4 15.6 Z"
          fill={color}
          opacity="0.78"
        />
      </g>
      <g className="mk-wing mk-wing-r">
        <path d="M12.6 9.6 C15.4 4.2 20.4 3.2 22.1 5.6 C23.8 8 20.8 11.4 12.6 12.2 Z" fill={color} />
        <path
          d="M12.6 12.6 C17.6 13.2 20.8 15.2 20.2 18 C19.6 20.6 15.4 20.4 12.6 15.6 Z"
          fill={color}
          opacity="0.78"
        />
      </g>
      <ellipse cx="12" cy="12.6" rx="0.95" ry="5.2" fill={detail} />
      <circle cx="12" cy="6.9" r="1.2" fill={detail} />
      <path
        d="M11.6 6 C10.7 4 9.5 3.3 8.3 3 M12.4 6 C13.3 4 14.5 3.3 15.7 3"
        fill="none"
        stroke={detail}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Elsa's snowflake — six arms, two pairs of branches each.
 *
 * Drawn twice: a wide, dark, nearly transparent pass and then the flake
 * itself on top of it. Her month is a white gown on a white blanket, and a
 * white flake with no shadow under it is invisible for most of its fall.
 */
export function Snowflake({ color }: MotifProps) {
  const arms = [0, 60, 120].map((a) => (
    <g key={a} transform={`rotate(${a} 12 12)`}>
      <path d="M12 1.8 V22.2" />
      <path d="M12 5.4 L9.1 8.1 M12 5.4 L14.9 8.1" />
      <path d="M12 18.6 L9.1 15.9 M12 18.6 L14.9 15.9" />
      <path d="M12 10 L10.2 11.6 M12 14 L10.2 12.4" />
    </g>
  ));
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <g
        fill="none"
        stroke="#3F5C72"
        strokeOpacity="0.22"
        strokeWidth="2.6"
        strokeLinecap="round"
      >
        {arms}
      </g>
      <g fill="none" stroke={color} strokeWidth="1.25" strokeLinecap="round">
        {arms}
      </g>
      <circle cx="12" cy="12" r="1.4" fill={color} />
    </svg>
  );
}

/**
 * An autumn leaf — Anna's, and Pocahontas's wind carries the same one.
 *
 * The stem is the whole drawing. A blade on its own is an oval, and an oval
 * tumbling past at twenty pixels is a dot; hang a stem off the bottom of it
 * and the same twenty pixels is unmistakably a leaf. The outline is here for
 * the same reason the blossom has one — these fall past a brown costume on
 * one of the two months that use them.
 */
export function Leaf({ color, detail = "#6B3F1E" }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <path
        d="M12 19.2 C12.4 21 13.2 22.2 14.6 23"
        fill="none"
        stroke={detail}
        strokeOpacity="0.85"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 1.4 C17.2 5.4 20 10.6 18.9 14.8 C18 18.2 15 20 12 20 C9 20 6 18.2 5.1 14.8 C4 10.6 6.8 5.4 12 1.4 Z"
        fill={color}
        stroke={detail}
        strokeOpacity="0.4"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <g fill="none" stroke={detail} strokeWidth="0.9" strokeLinecap="round" opacity="0.5">
        <path d="M12 3.2 V19.4" />
        <path d="M12 7.6 L8.6 5.8 M12 7.6 L15.4 5.8" />
        <path d="M12 12 L7.4 9.8 M12 12 L16.6 9.8" />
        <path d="M12 16.2 L8.4 14.4 M12 16.2 L15.6 14.4" />
      </g>
    </svg>
  );
}

/**
 * Ariel's bubble. The radial fill needs an id, and the tint changes per
 * particle, so each bubble is handed one rather than sharing a definition.
 */
export function Bubble({ color, id }: MotifProps & { id: string }) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <defs>
        <radialGradient id={id} cx="34%" cy="30%" r="74%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="46%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0.46" />
        </radialGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10.3"
        fill={`url(#${id})`}
        stroke="#FFFFFF"
        strokeOpacity="0.72"
        strokeWidth="0.9"
      />
      <ellipse
        cx="8.3"
        cy="7.9"
        rx="2.5"
        ry="1.8"
        fill="#FFFFFF"
        opacity="0.85"
        transform="rotate(-30 8.3 7.9)"
      />
      <circle cx="15.7" cy="15.6" r="1.05" fill="#FFFFFF" opacity="0.4" />
    </svg>
  );
}

/**
 * Moana's coconut — husk, fibres and the three eyes.
 *
 * The three eyes are drawn big and dark on purpose. They are the only thing
 * that separates a coconut from a brown circle, and a brown circle falling
 * past a photograph of a girl in brown braids is nothing at all; at thirty
 * pixels a subtle eye is one grey pixel and the drawing loses its name.
 */
export function Coconut({ color = "#6B4527", detail = "#2E1A0C" }: Partial<MotifProps>) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <circle
        cx="12"
        cy="12.3"
        r="9.6"
        fill={color}
        stroke={detail}
        strokeOpacity="0.6"
        strokeWidth="0.9"
      />
      {/* The husk catching the light down one side, so it reads as a ball. */}
      <path
        d="M12 2.9 A9.4 9.4 0 0 1 20.6 8.6 A9.4 9.4 0 0 0 8.4 3.6 Z"
        fill="#FFF8F0"
        opacity="0.22"
      />
      <ellipse
        cx="8.4"
        cy="8.4"
        rx="3.2"
        ry="2.2"
        fill="#FFF8F0"
        opacity="0.16"
        transform="rotate(-30 8.4 8.4)"
      />
      <g fill="none" stroke={detail} strokeWidth="0.7" opacity="0.38" strokeLinecap="round">
        <path d="M5.2 15.6 C8.4 17.4 12.6 17.8 16.4 16.4" />
        <path d="M4.2 12.6 C7.6 14.8 13 15.4 17.8 13.6" />
        <path d="M6.8 18.6 C9.4 19.8 12.6 19.9 15.2 19" />
      </g>
      <g fill={detail}>
        <circle cx="9" cy="10.2" r="1.7" />
        <circle cx="14.2" cy="9" r="1.7" />
        <circle cx="11.8" cy="14" r="1.7" />
      </g>
    </svg>
  );
}

/**
 * Jasmine's gem — the emerald off the Cave of Wonders, cut the way a jewel is
 * drawn: flat table, bevelled shoulders, and everything running to a point.
 *
 * The facet lines are the drawing. A gem is one flat colour in silhouette and
 * would fall as a green lozenge; it is the lines across it that say *cut
 * stone*, so they are drawn in the stone's own colour darkened rather than in
 * a wash that would disappear on the paler shades.
 */
export function Gem({ color, detail = "#0A3B2E" }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <path
        d="M6.2 2.9 H17.8 L22.2 9.1 L12 21.7 L1.8 9.1 Z"
        fill={color}
        stroke={detail}
        strokeOpacity="0.55"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* The table, catching more light than the shoulders under it. */}
      <path d="M6.2 2.9 H17.8 L14.9 9.1 H9.1 Z" fill="#FFFFFF" opacity="0.26" />
      {/* One shoulder brighter still, so the stone has a lit side. */}
      <path d="M6.2 2.9 L9.1 9.1 H1.8 Z" fill="#FFFFFF" opacity="0.16" />
      <g
        fill="none"
        stroke={detail}
        strokeOpacity="0.5"
        strokeWidth="0.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1.8 9.1 H22.2" />
        <path d="M6.2 2.9 L9.1 9.1 L12 21.7 L14.9 9.1 L17.8 2.9" />
      </g>
    </svg>
  );
}

/** Belle's rose petal — round at the lip, pinched where it left the flower. */
export function Petal({ color, detail = "#FFF8F0" }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <path
        d="M12 21.8 C6.1 19.5 2.7 14.6 3.7 9.7 C4.6 5.3 8.5 2.6 12 2.6 C15.5 2.6 19.4 5.3 20.3 9.7 C21.3 14.6 17.9 19.5 12 21.8 Z"
        fill={color}
      />
      <path
        d="M12 21.4 C10.1 16.8 9.9 8.9 12 3"
        fill="none"
        stroke={detail}
        strokeWidth="0.8"
        opacity="0.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * One of Cinderella's bluebirds, in profile. The near wing is the only one
 * drawn — it carries `mk-wing` and beats about the shoulder, which is where
 * its box bottoms out.
 */
export function Bird({ color, detail = "#FFF8F0" }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      <path d="M7.6 12.4 L2.2 14.2 L7.4 15.4 Z" fill={color} opacity="0.9" />
      <ellipse cx="12" cy="13.6" rx="5" ry="3" fill={color} />
      <ellipse cx="12.5" cy="15" rx="3.3" ry="1.6" fill={detail} opacity="0.75" />
      <circle cx="16.3" cy="11" r="2.5" fill={color} />
      <path d="M18.6 10.5 L21.9 11.3 L18.5 12.3 Z" fill="#E8A33D" />
      <circle cx="17.1" cy="10.4" r="0.6" fill="#2E1F3D" />
      <g className="mk-wing mk-wing-up">
        <path d="M11.6 12.2 C10.4 8.2 9.3 4.7 12.1 3.5 C14.7 2.4 15.7 6.7 14.6 11.5 Z" fill={color} />
        <path
          d="M11.9 11.6 C11 8.4 10.4 5.8 12.2 4.8"
          fill="none"
          stroke={detail}
          strokeWidth="0.7"
          opacity="0.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------
   The last page: her own sparkles
   ---------------------------------------------------------------
   Every other month borrows its weather from a film. The twelfth has no
   film to borrow from, so it gets the invitation's own motif instead —
   the four-point star that sits beside her name on the hero, on the
   loading screen and at the head of the progress bar — coming down over
   her like the rest of her year came down over her princesses.
   --------------------------------------------------------------- */

/**
 * A four-point sparkle, pinched at the waist.
 *
 * The same silhouette as `Sparkle` in `Ornaments.tsx`, redrawn here because
 * a particle needs a colour per instance and that one takes `currentColor`
 * — a field of thirty identical golds is a field of stickers.
 *
 * The small cross behind it is what keeps it from reading as a plain star:
 * two faint diagonal spikes catching a different light, the way a real
 * glint has more than four arms.
 */
export function Star({ color, detail = "#FFFDF2" }: MotifProps) {
  return (
    <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
      {/* The diagonals, half the reach of the main star and half as solid. */}
      <g stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.55">
        <path d="M5.2 5.2 L18.8 18.8" />
        <path d="M18.8 5.2 L5.2 18.8" />
      </g>
      <path
        d="M12 0.4 C12.85 7.6 16.4 11.15 23.6 12 C16.4 12.85 12.85 16.4 12 23.6 C11.15 16.4 7.6 12.85 0.4 12 C7.6 11.15 11.15 7.6 12 0.4 Z"
        fill={color}
      />
      {/* The hot centre. Every one of these falls over a photograph of her
          face, so the core is a highlight rather than a second colour. */}
      <circle cx="12" cy="12" r="2.1" fill={detail} opacity="0.85" />
    </svg>
  );
}
