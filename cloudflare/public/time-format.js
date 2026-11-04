/**
 * Fail / File: cloudflare/public/time-format.js
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-26
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Modul JavaScript time-format untuk fungsi produk dan ujian.
 * EN: JavaScript module time-format for product functionality and tests.
 */

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
    second: "2-digit",
    hour12: true
  }).format(date) + " MYT";
}
