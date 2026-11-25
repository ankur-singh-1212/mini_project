import { useState } from "react";

const SLOW_AFTER_MS = 3000;
export const SLOW_SERVER_MSG = "Server start ho raha hai, thoda ruko…";

// Reusable submit-guard:
// - `submitting` is true while the action runs, so double clicks are ignored
//   (the handler starts with `if (submitting) return`) and buttons can be
//   disabled with label "Please wait…" or a spinner.
// - `slowHint` becomes true when the request takes longer than SLOW_AFTER_MS,
//   so the form can show a small "Server start ho raha hai…" note.
export function useSubmit(action) {
  const [submitting, setSubmitting] = useState(false);
  const [slowHint, setSlowHint] = useState(false);

  const submit = async (e, ...args) => {
    e?.preventDefault?.();
    if (submitting) return;
    setSubmitting(true);
    setSlowHint(false);
    const timer = setTimeout(() => setSlowHint(true), SLOW_AFTER_MS);
    try {
      return await action(...args);
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
      setTimeout(() => setSlowHint(false), 400);
    }
  };

  return { submitting, slowHint, submit };
}
