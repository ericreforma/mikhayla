"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BABY_NAME, BIRTH_DATE, RSVP_BY, RSVP_EMAIL, RSVP_ENDPOINT } from "@/app/config";
import { Crown, Sparkle, CheckIcon, CloseIcon, Spinner } from "./Ornaments";
import { useCloseOnBack } from "./backButton";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * The same form, asked twice.
 *
 * An RSVP and a birthday wish want identical fields — who you are, which side
 * you are from, what you would like to say, and whether it may be shown — and
 * everything that makes the form *work* is identical too: the honeypot, the
 * text/plain post that dodges a preflight, the already-sent panel, the mailto
 * fallback. The only thing that differs is the wording, so the wording is the
 * only thing that is written twice.
 *
 * Keeping it one component rather than two is not just less code. The RSVP is
 * load-bearing — it is how a hundred people get counted — and a copy of it
 * made for her birthday would be a copy that stops getting the next fix.
 */
export type Mode = "rsvp" | "greeting";

type Copy = {
  /** Its own corner of localStorage, so one form never speaks for the other. */
  store: string;
  /** What the script is told this is. The RSVP sends nothing and is the default. */
  kind?: string;
  eyebrow: string;
  heading: string;
  nameMissing: string;
  typeLegend: string;
  typeMissing: string;
  /** The two-seats note, which only an invitation has any business making. */
  plusOne: boolean;
  messageLabel: string;
  messageHint: string;
  messagePlaceholder: string;
  submit: string;
  footnote: string;
  mailSubject: string;
  thanksTitle: string;
  thanksBody: (name: string) => string;
  thanksFoot: string;
  alreadyTitle: string;
  alreadyBody: string;
  alreadyAgain: string;
};

const COPY: Record<Mode, Copy> = {
  rsvp: {
    store: "mikhayla-rsvp",
    eyebrow: "Will you join us?",
    heading: "Reply to the royal invitation",
    nameMissing: "Please tell us who's coming.",
    typeLegend: "Guest type",
    typeMissing: "Please choose which court you're joining us from.",
    plusOne: true,
    messageLabel: "A message",
    messageHint: `For ${BABY_NAME} and her family`,
    messagePlaceholder: "Happy first birthday, little princess…",
    submit: "Send my RSVP",
    footnote: `Kindly reply before ${RSVP_BY}.`,
    mailSubject: `RSVP — ${BABY_NAME}'s First Birthday`,
    thanksTitle: "You're on the list",
    thanksBody: (name) =>
      `Thank you${name ? `, ${name}` : ""} — ${BABY_NAME} can't wait to see you at the ball.`,
    thanksFoot: "See you there 👑",
    alreadyTitle: "Already on the list",
    alreadyBody: "We have you down.",
    alreadyAgain: "Send another reply",
  },
  greeting: {
    store: "mikhayla-birthday-wish",
    kind: "greeting",
    eyebrow: "She is one today",
    heading: `Send ${BABY_NAME} a birthday wish`,
    nameMissing: "Please tell us who this is from.",
    typeLegend: "How you know her",
    typeMissing: "Please choose which court you're writing from.",
    plusOne: false,
    messageLabel: "Your birthday wish",
    messageHint: "For her to read when she is older",
    messagePlaceholder: "Happy first birthday, little princess…",
    submit: "Send my wish",
    footnote: `Born ${BIRTH_DATE}.`,
    mailSubject: `Birthday wishes — ${BABY_NAME}`,
    thanksTitle: "Your wish is sent",
    thanksBody: (name) =>
      `Thank you${name ? `, ${name}` : ""} — ${BABY_NAME} will have this one to keep.`,
    thanksFoot: "Happy birthday, little princess 👑",
    alreadyTitle: "Your wish is in",
    alreadyBody: "She has it.",
    alreadyAgain: "Send another wish",
  },
};

/**
 * Which court a guest arrives from. It settles the seat count without asking
 * anyone to do arithmetic: family come as a household, friends and godparents
 * come with one companion.
 */
type GuestType = "family" | "friends";

const GUEST_TYPES: { value: GuestType; label: string }[] = [
  { value: "family", label: "Family / Relative" },
  { value: "friends", label: "Friends / Godparents" },
];

type Sent = { name: string; at: string };

/** localStorage throws outright in some privacy modes, so every touch is guarded. */
function readSent(store: string): Sent | null {
  try {
    const raw = window.localStorage.getItem(store);
    return raw ? (JSON.parse(raw) as Sent) : null;
  } catch {
    return null;
  }
}

function writeSent(store: string, value: Sent) {
  try {
    window.localStorage.setItem(store, JSON.stringify(value));
  } catch {
    /* A guest in a private window simply doesn't get the reminder. */
  }
}

export function RsvpDialog({
  open,
  onClose,
  mode = "rsvp",
}: {
  open: boolean;
  onClose: () => void;
  mode?: Mode;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  if (!host) return null;
  return createPortal(
    <AnimatePresence>{open && <Form onClose={onClose} mode={mode} />}</AnimatePresence>,
    host
  );
}

function Form({ onClose, mode }: { onClose: () => void; mode: Mode }) {
  const c = COPY[mode];
  const [name, setName] = useState("");
  const [guestType, setGuestType] = useState<GuestType | null>(null);
  const [message, setMessage] = useState("");
  /*
   * Starts on "Yes", for both the RSVP and the birthday wish.
   *
   * What makes that fair rather than presumptuous is the second gate behind
   * it: nothing written here reaches the guestbook on its own. The row lands
   * in the sheet with its *Approved* column empty and stays unpublished until
   * somebody in the family ticks it — see `saveInto` in `docs/rsvp-setup.md`.
   * So this answer is a guest saying they do not mind, not a guest publishing
   * something, and the two buttons are right there for anyone who does mind.
   */
  const [share, setShare] = useState(true);
  /** Hidden from real users; anything that fills it is a bot. */
  const [website, setWebsite] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [already, setAlready] = useState<Sent | null>(() => readSent(c.store));

  const nameRef = useRef<HTMLInputElement>(null);
  const firstOpen = useRef(true);

  /* Back closes the form rather than the invitation — the same thing the X
     does, and what a guest who opened it by accident will reach for first. */
  useCloseOnBack(onClose);

  /* Flag the deck off the keyboard while we're up — it listens for arrow
     keys on `window` — and start the guest in the first field. */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.dataset.modal = "open";
    return () => {
      delete document.body.dataset.modal;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (firstOpen.current && already === null && status === "idle") {
      firstOpen.current = false;
      nameRef.current?.focus();
    }
  }, [already, status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const guestTypeLabel = GUEST_TYPES.find((t) => t.value === guestType)?.label ?? "";

  /** The same details as an email, for when the endpoint is unreachable. */
  const mailto = `mailto:${RSVP_EMAIL}?subject=${encodeURIComponent(
    c.mailSubject
  )}&body=${encodeURIComponent(
    `Name: ${name}\nGuest type: ${guestTypeLabel}\n\n${message}`.trim()
  )}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!name.trim()) {
      setError(c.nameMissing);
      nameRef.current?.focus();
      return;
    }
    if (!guestType) {
      setError(c.typeMissing);
      return;
    }

    setStatus("sending");
    setError("");

    try {
      const res = await fetch(RSVP_ENDPOINT, {
        method: "POST",
        /*
         * Deliberately not application/json. That would make the browser
         * send a CORS preflight OPTIONS request first, and an Apps Script
         * web app has no way to answer one — the real POST would never
         * leave. The body is still JSON; the script parses it regardless.
         */
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          /* Absent for an RSVP, which is what the script treats as its
             default — see `doPost` in docs/rsvp-setup.md. */
          kind: c.kind,
          name: name.trim(),
          guestType,
          message: message.trim(),
          public: share,
          website,
        }),
      });

      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error || `The server said ${res.status}.`);

      writeSent(c.store, { name: name.trim(), at: new Date().toISOString() });
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error && err.message.startsWith("The server said")
          ? err.message
          : "We couldn't send that just now — your connection may have dropped."
      );
    }
  }

  const sending = status === "sending";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rsvp-heading"
      className="fixed inset-0 z-[100] overflow-y-auto bg-night/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Auto margins rather than `justify-center`, for the same reason the
          sections use them: on a short phone with the keyboard up, centring
          would push the top of the card off the screen for good. */}
      <div className="flex min-h-full flex-col items-center px-4 py-6">
        <motion.div
          className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-gold/40 bg-parchment shadow-2xl"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 parchment-texture" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-ink/50 transition active:scale-95 hover:bg-mist hover:text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>

          <div className="relative px-5 pb-6 pt-7 sm:px-8 sm:pb-8">
            {status === "sent" ? (
              <Thanks c={c} name={name.trim()} shared={share} onClose={onClose} />
            ) : already ? (
              <AlreadyIn
                c={c}
                sent={already}
                onAnother={() => setAlready(null)}
                onClose={onClose}
              />
            ) : (
              <>
                <header className="text-center">
                  <Crown className="mx-auto h-7 w-auto text-gold sm:h-8" />
                  <p className="mt-2 font-hand text-lg text-berry sm:text-xl">{c.eyebrow}</p>
                  <h2
                    id="rsvp-heading"
                    className="mt-0.5 font-display text-2xl italic leading-snug text-ink sm:text-3xl"
                  >
                    {c.heading}
                  </h2>
                  <div aria-hidden className="gilt-rule mx-auto mt-3 h-px w-24 sm:w-32" />
                </header>

                <form onSubmit={submit} noValidate className="mt-5 space-y-4">
                  <Field label="Your name" htmlFor="rsvp-name">
                    <input
                      ref={nameRef}
                      id="rsvp-name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      maxLength={100}
                      placeholder="Juan Dela Cruz"
                      className={`${INPUT} w-full`}
                    />
                  </Field>

                  <fieldset className="text-left">
                    <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-goldDeep">
                      {c.typeLegend}
                    </legend>
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                      {GUEST_TYPES.map((type) => (
                        <GuestChoice
                          key={type.value}
                          on={guestType === type.value}
                          onClick={() => setGuestType(type.value)}
                        >
                          {type.label}
                        </GuestChoice>
                      ))}
                    </div>

                    {/* The plus-one only concerns friends and godparents, so
                        it arrives with that answer rather than sitting there
                        confusing everyone else. */}
                    <AnimatePresence initial={false}>
                      {c.plusOne && guestType === "friends" && (
                        <motion.div
                          key="plus-one"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink/60 sm:text-xs">
                            <Sparkle className="mt-0.5 h-3 w-3 flex-none text-gold" />
                            <span>
                              By royal decree, one companion may accompany you to the ball — two
                              seats are held in your name.
                            </span>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </fieldset>

                  <Field label={c.messageLabel} htmlFor="rsvp-message" hint={c.messageHint}>
                    <textarea
                      id="rsvp-message"
                      name="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder={c.messagePlaceholder}
                      className={`${INPUT} w-full resize-none`}
                    />
                  </Field>

                  <fieldset className="rounded-2xl border border-gold/30 bg-mist/40 px-3.5 py-3">
                    <legend className="sr-only">Share this message publicly</legend>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-left text-xs leading-snug text-ink/75 sm:text-sm">
                        Share this message publicly?
                        <span className="mt-0.5 block text-[11px] text-ink/50 sm:text-xs">
                          Shown on her guestbook with your name
                        </span>
                      </p>
                      <div className="flex flex-none gap-1 rounded-full border border-gold/30 bg-parchment p-1">
                        <Choice on={share} onClick={() => setShare(true)}>
                          Yes
                        </Choice>
                        <Choice on={!share} onClick={() => setShare(false)}>
                          No
                        </Choice>
                      </div>
                    </div>
                  </fieldset>

                  {/* The honeypot. Off-screen rather than display:none, which
                      some bots know to skip, and hidden from assistive tech. */}
                  <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
                    <label htmlFor="rsvp-website">Leave this empty</label>
                    <input
                      id="rsvp-website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  {error && (
                    <p role="alert" className="text-left text-xs leading-relaxed text-snow sm:text-sm">
                      {error}{" "}
                      {status === "error" && (
                        <a href={mailto} className="font-semibold underline underline-offset-2">
                          Send it by email instead
                        </a>
                      )}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-gold px-8 font-display text-base font-semibold text-night shadow-lg shadow-gold/20 transition active:scale-[0.98] hover:bg-goldSoft disabled:opacity-70 sm:text-lg"
                  >
                    {sending ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Sending…
                      </>
                    ) : (
                      c.submit
                    )}
                  </button>

                  <p className="text-center text-[11px] leading-relaxed text-ink/45 sm:text-xs">
                    {c.footnote}
                  </p>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------
   The two states that replace the form
   --------------------------------------------------------------- */

function Thanks({
  c,
  name,
  shared,
  onClose,
}: {
  c: Copy;
  name: string;
  shared: boolean;
  onClose: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <motion.div
        className="relative mx-auto flex h-16 w-16 items-center justify-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 16 }}
      >
        <span className="absolute inset-0 rounded-full bg-gold/20 blur-xl" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-parchment text-goldDeep">
          <CheckIcon className="h-7 w-7" />
        </span>
        <Sparkle className="absolute -right-1 -top-1 h-4 w-4 animate-twinkle text-gold" />
      </motion.div>

      <h2 id="rsvp-heading" className="mt-4 font-display text-2xl italic text-ink sm:text-3xl">
        {c.thanksTitle}
      </h2>
      <p className="mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed text-ink/70">
        {c.thanksBody(name)}
      </p>
      {shared && (
        <p className="mx-auto mt-2 max-w-[32ch] text-xs leading-relaxed text-ink/50">
          Your message will appear on her guestbook once her family has read it.
        </p>
      )}
      <p className="mt-4 font-hand text-lg text-berry sm:text-xl">{c.thanksFoot}</p>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 min-h-[2.75rem] rounded-full border border-gold/50 px-7 font-display text-base text-ink transition active:scale-[0.98] hover:bg-mist"
      >
        Close
      </button>
    </div>
  );
}

function AlreadyIn({
  c,
  sent,
  onAnother,
  onClose,
}: {
  c: Copy;
  sent: Sent;
  onAnother: () => void;
  onClose: () => void;
}) {
  const when = new Date(sent.at);
  const date = Number.isNaN(when.getTime())
    ? null
    : when.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <div className="py-4 text-center">
      <Crown className="mx-auto h-8 w-auto text-gold" />
      <h2 id="rsvp-heading" className="mt-3 font-display text-2xl italic text-ink sm:text-3xl">
        {c.alreadyTitle}
      </h2>
      <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed text-ink/70">
        You replied as <span className="font-semibold text-ink">{sent.name}</span>
        {date ? ` on ${date}` : ""}. {c.alreadyBody}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[2.75rem] rounded-full bg-gold px-7 font-display text-base font-semibold text-night shadow-lg shadow-gold/20 transition active:scale-[0.98] hover:bg-goldSoft"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="min-h-[2.75rem] rounded-full border border-gold/40 px-7 font-display text-sm text-ink/70 transition active:scale-[0.98] hover:bg-mist hover:text-ink"
        >
          {c.alreadyAgain}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Form furniture
   --------------------------------------------------------------- */

const INPUT =
  "rounded-xl border border-gold/40 bg-parchment px-3.5 py-2.5 font-body text-base text-ink shadow-sm outline-none transition placeholder:text-ink/30 focus:border-gold focus:ring-2 focus:ring-gold/30";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-left">
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-goldDeep"
      >
        {label}
        {hint && (
          <span className="text-[10px] font-normal normal-case tracking-normal text-ink/45 sm:text-xs">
            {hint}
          </span>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/**
 * One of the two guest types. A pair of buttons rather than a `<select>`:
 * both answers stay visible, and each is a thumb-sized target.
 */
function GuestChoice({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-h-[3rem] items-center justify-center rounded-xl border px-3 text-center font-display text-sm leading-snug transition active:scale-[0.98] sm:text-base ${
        on
          ? "border-gold bg-gold font-semibold text-night shadow-sm shadow-gold/20"
          : "border-gold/40 bg-parchment text-ink/70 shadow-sm hover:bg-mist hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Choice({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-[2rem] rounded-full px-3.5 font-display text-sm transition ${
        on ? "bg-gold text-night shadow-sm" : "text-ink/50 active:scale-95 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
