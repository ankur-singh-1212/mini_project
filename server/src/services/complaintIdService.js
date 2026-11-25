import Counter from "../models/Counter.js";
export async function nextComplaintId() {
  const year = new Date().getFullYear();
  const c = await Counter.findOneAndUpdate(
    { name: `complaint-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `NX-${year}-${String(c.seq).padStart(4, "0")}`;
}
