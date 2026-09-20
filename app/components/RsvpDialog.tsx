"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BABY_NAME, RSVP_BY, RSVP_EMAIL, RSVP_ENDPOINT, RSVP_MAX_GUESTS } from "@/app/config";
import { Crown, Sparkle, CheckIcon, CloseIcon } from "./Ornaments";

/** Remembers, on this device only, that an RSVP already went in. */
const STORE_KEY = "mikhayla-rsvp";

type Status = "idle" | "sending" | "sent" | "error";

type Sent = { name: string; at: string };

/** localStorage throws outright in some privacy modes, so every touch is guarded. */
function readSent(): Sent | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Sent) : null;
  } catch {
    return null;
  }
}

function writeSent(value: Sent) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    /* A guest in a private window simply doesn't get the reminder. */
  }
}

export function RsvpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  if (!host) return null;
  return createPortal(
    <AnimatePresence>{open && <Form onClose={onClose} />}</AnimatePresence>,
    host
  );
}

function Form({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  /*
   * Opt-in, not opt-out. Publishing what someone wrote to the family is not
   * a default anyone should be handed — and a guest who does want it on the
   * wall only has to tap "Yes".
   */
  const [share, setShare] = useState(false);
  /** Hidden from real users; anything that fills it is a bot. */
  const [website, setWebsite] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [already, setAlready] = useState<Sent | null>(() => readSent());

  const nameRef = useRef<HTMLInputElement>(null);
  const firstOpen = useRef(true);

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

  /** The same details as an email, for when the endpoint is unreachable. */
  const mailto = `mailto:${RSVP_EMAIL}?subject=${encodeURIComponent(
    `RSVP — ${BABY_NAME}'s First Birthday`
  )}&body=${encodeURIComponent(
    `Name: ${name}\nGuests: ${guests}\n\n${message}`.trim()
  )}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!name.trim()) {
      setError("Please tell us who's coming.");
      nameRef.current?.focus();
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
          name: name.trim(),
          guests,
          message: message.trim(),
          public: share,
          website,
        }),
      });

      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error || `The server said ${res.status}.`);

      writeSent({ name: name.trim(), at: new Date().toISOString() });
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
              <Thanks name={name.trim()} shared={share} onClose={onClose} />
            ) : already ? (
              <AlreadyIn sent={already} onAnother={() => setAlready(null)} onClose={onClose} />
            ) : (
              <>
                <header className="text-center">
                  <Crown className="mx-auto h-7 w-auto text-gold sm:h-8" />
                  <p className="mt-2 font-hand text-lg text-berry sm:text-xl">Will you join us?</p>
                  <h2
                    id="rsvp-heading"
                    className="mt-0.5 font-display text-2xl italic leading-snug text-ink sm:text-3xl"
                  >
                    Reply to the royal invitation
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
                      placeholder="Nina Dela Cruz"
                      className={`${INPUT} w-full`}
                    />
                  </Field>

                  <Field
                    label="Number of guests"
                    htmlFor="rsvp-guests"
                    hint="Including yourself"
                  >
                    <Stepper value={guests} onChange={setGuests} />
                  </Field>

                  <Field
                    label="A message"
                    htmlFor="rsvp-message"
                    hint={`For ${BABY_NAME} and her family`}
                  >
                    <textarea
                      id="rsvp-message"
                      name="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Happy first birthday, little princess…"
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
                        <Spinner />
                        Sending…
                      </>
                    ) : (
                      "Send my RSVP"
                    )}
                  </button>

                  <p className="text-center text-[11px] leading-relaxed text-ink/45 sm:text-xs">
                    Kindly reply before {RSVP_BY}.
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
  name,
  shared,
  onClose,
}: {
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
        You&apos;re on the list
      </h2>
      <p className="mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed text-ink/70">
        Thank you{name ? `, ${name}` : ""} — {BABY_NAME} can&apos;t wait to see you at the ball.
      </p>
      {shared && (
        <p className="mx-auto mt-2 max-w-[32ch] text-xs leading-relaxed text-ink/50">
          Your message will appear on her guestbook once her family has read it.
        </p>
      )}
      <p className="mt-4 font-hand text-lg text-berry sm:text-xl">See you there 👑</p>

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
  sent,
  onAnother,
  onClose,
}: {
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
        Already on the list
      </h2>
      <p className="mx-auto mt-2 max-w-[32ch] text-sm leading-relaxed text-ink/70">
        You replied as <span className="font-semibold text-ink">{sent.name}</span>
        {date ? ` on ${date}` : ""}. We have you down.
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
          Send another reply
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
 * The guest count. A stepper rather than a number input: on a phone, `type
 *="number"` opens a full keyboard for a value that is almost always 1 to 4,
 * and its spinners are unusable at thumb size.
 *
 * The readout is still a real input, so it can be typed into on a desktop
 * and is announced properly by a screen reader.
 */
function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const clamp = (n: number) => Math.min(Math.max(n, 1), RSVP_MAX_GUESTS);
  return (
    <div className="flex items-center gap-2">
      <StepButton
        label="One fewer guest"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 1}
      >
        <path d="M6 12 h12" />
      </StepButton>

      <input
        id="rsvp-guests"
        name="guests"
        type="number"
        inputMode="numeric"
        min={1}
        max={RSVP_MAX_GUESTS}
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || 1))}
        className={`${INPUT} w-16 flex-none px-0 text-center font-display text-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />

      <StepButton
        label="One more guest"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= RSVP_MAX_GUESTS}
      >
        <path d="M12 6 v12 M6 12 h12" />
      </StepButton>

      <span className="ml-1 text-xs text-ink/50">
        {value === 1 ? "guest" : "guests"}
      </span>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-gold/40 bg-parchment text-goldDeep shadow-sm transition active:scale-95 hover:bg-mist disabled:opacity-35"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none">
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {children}
        </g>
      </svg>
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

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12 a9 9 0 0 0 -9 -9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
