const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "2026-11" -> "Nov-2026". Pass through anything that isn't a YYYY-MM value.
export const formatMonthLabel = (value) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value || "");
  if (!match) return value ?? "";
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month}-${match[1]}` : value;
};
