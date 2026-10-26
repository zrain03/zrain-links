/** Display UTC creation timestamps consistently in Malaysia time (UTC+08:00). */
export function formatMalaysiaTime(isoTimestamp) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return "Creation time unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date) + " MYT";
}
