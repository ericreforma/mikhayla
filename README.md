# {Baby}'s First Birthday — scroll-story invite

A single-page, front-end-only Next.js site. As you scroll: a balloon rises
from the bottom of the page to the top, a "vine" grows down the timeline to
mark her first year, and each month's card drifts and settles into place.

**Stack:** Next.js 14 (App Router, static export) + TypeScript + Tailwind CSS
+ Framer Motion. No backend, no database, no API routes — it builds to plain
HTML/CSS/JS you can host anywhere (Vercel, Netlify, GitHub Pages, or even a
folder on a USB stick).

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Save any file and the page hot-reloads.

## Ship it

```bash
npm run build
```

Because `next.config.mjs` sets `output: "export"`, this produces a fully
static `out/` folder — drag that folder onto Netlify, or run
`npx serve out` to preview the production build locally.

## Make it yours

Everything content-related lives at the top of **`app/page.tsx`**:

- `BABY_NAME`, `PARTY_DATE`, `PARTY_TIME`, `PARTY_LOCATION`, `PARTY_ADDRESS`,
  `RSVP_EMAIL`, `RSVP_BY` — one config block, edit and you're done.
- `MILESTONES` — the 12 timeline entries (`month`, `title`, `note`, `emoji`).
  Replace with her actual milestones, or leave the placeholders.
- Colors live in `tailwind.config.ts` (`sunshine`, `sky`, `grass`, `blush`,
  `berry`, `ink`, `cream`) if you want a different palette.

## What I'd extend first

1. **Real photos instead of emoji.** Each `MilestoneCard` renders `m.emoji`
   inside a circle — swap that `<span>{m.emoji}</span>` for an
   `<Image src={m.photo} .../>` (add a `photo` field to the `Milestone` type
   and drop files in `public/`). This is the single highest-impact change.
2. **A real RSVP.** Right now "RSVP" just opens a `mailto:` link. Wiring it
   to a tiny form service (Formspree, Google Form embed, or a Vercel
   serverless function + Airtable/Sheets) would let you see who's coming
   without adding a backend of your own.
3. **Tighten the vine's alignment.** The growing vine's start/end offsets
   (`top-[13rem] bottom-24` in the timeline section of `page.tsx`) are tuned
   for the current copy length — if you add/remove milestones or change
   font sizes, nudge those two values back to matching the first and last
   dot.
4. **A countdown.** A "X days to go" line in the hero or party section,
   computed client-side from `PARTY_DATE`, adds urgency for guests deciding
   whether to RSVP.
5. **Open Graph image.** Add an `opengraph-image.png` so the link looks
   great when shared in group chats/texts.

## Notes on the motion

- All scroll animations are driven by Framer Motion's `useScroll` /
  `useTransform`, and respect `prefers-reduced-motion` (see `globals.css`) —
  visitors with that OS setting get instant transitions instead.
- The balloon uses `useScroll()` with no `target`, which tracks whole-page
  scroll progress (0 → 1) — that's what makes it rise the entire length of
  the page rather than just one section.
- Each timeline card uses its **own** `useScroll({ target: cardRef, ... })`,
  so cards animate independently as they individually enter the viewport,
  rather than all firing at once.
