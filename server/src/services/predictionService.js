// ML + rule-based fallback for category and priority prediction
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const CATEGORIES = [
  "Technical Issue",
  "Infrastructure and Maintenance",
  "Electricity and Safety",
  "Water and Sanitation",
  "Academic or Administrative",
  "Network and Internet",
  "Hostel or Accommodation",
  "Other",
];

const KEYWORDS = {
  "Electricity and Safety": ["electric", "shock", "spark", "fire", "wire", "power outage", "safety", "gas leak"],
  "Water and Sanitation": ["water", "leak", "drain", "toilet", "sanitation", "sewage", "plumbing"],
  "Network and Internet": ["internet", "wifi", "network", "router", "lan", "connection", "bandwidth"],
  "Technical Issue": ["software", "bug", "error", "crash", "login", "password", "app", "system"],
  "Infrastructure and Maintenance": ["roof", "wall", "door", "window", "floor", "paint", "ceiling", "repair"],
  "Hostel or Accommodation": ["hostel", "room", "mess", "accommodation", "bed", "warden"],
  "Academic or Administrative": ["exam", "grade", "certificate", "fee", "admission", "admin", "result", "class"],
};

export async function predictCategory(text) {
  // Try ML service first
  try {
    const res = await fetch(`${ML_URL}/predict/category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        category: data.label,
        confidence: data.confidence,
        source: "ml",
      };
    }
  } catch (e) {
    // fall through
  }
  // Rule-based fallback (transparent)
  const lower = text.toLowerCase();
  let best = "Other";
  let score = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > score) {
      score = hits;
      best = cat;
    }
  }
  const confidence = score > 0 ? Math.min(0.5 + score * 0.1, 0.85) : 0.4;
  return { category: best, confidence, source: "rule-based-fallback" };
}

const CRITICAL_WORDS = ["fire", "shock", "gas leak", "explosion", "flood", "collapse", "injury", "violence", "emergency", "bleeding"];
const HIGH_WORDS = ["outage", "down", "broken", "not working", "urgent", "exam", "deadline", "safety"];
const MEDIUM_WORDS = ["slow", "intermittent", "issue", "problem", "request"];

export function predictPriority(text, category) {
  const lower = text.toLowerCase();
  const reasons = [];
  let priority = "Low";
  if (CRITICAL_WORDS.some((w) => lower.includes(w))) {
    priority = "Critical";
    reasons.push("Safety/emergency keyword detected");
  } else if (HIGH_WORDS.some((w) => lower.includes(w))) {
    priority = "High";
    reasons.push("High-impact keyword detected");
  } else if (MEDIUM_WORDS.some((w) => lower.includes(w))) {
    priority = "Medium";
    reasons.push("General issue keyword detected");
  } else {
    reasons.push("No urgency keywords detected");
  }
  // category adjustments
  if (category === "Electricity and Safety" && priority !== "Critical") {
    priority = "High";
    reasons.push("Electricity/safety category elevates priority");
  }
  if (category === "Water and Sanitation" && priority === "Low") {
    priority = "Medium";
    reasons.push("Water/sanitation category elevates priority");
  }
  return { priority, reason: reasons.join("; "), source: "rule-based" };
}
