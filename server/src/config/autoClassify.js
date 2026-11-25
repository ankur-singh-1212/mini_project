// Confidence threshold for auto-assignment. Below this value a complaint is
// flagged for admin review instead of being auto-assigned to an agent.
export const MIN_AUTO_ASSIGN_CONFIDENCE = 0.4;

export function needsReview(confidence) {
  return !(Number.isFinite(confidence) && confidence >= MIN_AUTO_ASSIGN_CONFIDENCE);
}
