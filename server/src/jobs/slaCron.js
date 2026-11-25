import cron from "node-cron";
import { runEscalationPass } from "../services/escalationService.js";

let task = null;
export function startEscalationJob(io, expr = "*/1 * * * *") {
  if (task) return;
  task = cron.schedule(expr, async () => {
    try {
      const res = await runEscalationPass(io);
      if (res.escalated) console.log(`[sla] escalated ${res.escalated}`);
    } catch (e) {
      console.error("[sla] pass failed", e.message);
    }
  });
  console.log("[sla] escalation job started");
}
export function stopEscalationJob() {
  if (task) { task.stop(); task = null; }
}
