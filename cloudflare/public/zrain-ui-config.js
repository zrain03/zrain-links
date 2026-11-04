/**
 * Fail / File: cloudflare/public/zrain-ui-config.js
 * Pembangun / Developer: Zrain
 * Dicipta / Created (rekod Git terawal / earliest Git addition): 2026-10-27
 * Dikemas kini / Last updated: 2026-11-04
 * BM: Integrasi identiti bersama tanpa mengubah navigasi produk.
 * EN: Shared identity integration without modifying product navigation.
 */

/**
 * BM: Identiti header/footer rasmi untuk halaman Zrain Links, tanpa mengambil alih fungsi produk.
 * EN: Official Zrain Links header/footer identity without taking over product features.
 */
import { mountZrainUI } from "./zrain-ui.js?v=ui-20261104-golden";

// Product-specific navigation and authentication remain owned by Zrain Links.
// The shared component owns only the Zrain branding and footer credit.
mountZrainUI({
  product: "Links",
  logoSrc: "/zrain-logo.webp",
  productHref: "/"
});
