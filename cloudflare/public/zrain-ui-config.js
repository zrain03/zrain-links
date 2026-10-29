import { mountZrainUI } from "./zrain-ui.js?v=brand-20261029-v2";

// Product-specific navigation and authentication remain owned by Zrain Links.
// The shared component owns only the Zrain branding and footer credit.
mountZrainUI({
  product: "Links",
  logoSrc: "/zrain-logo.webp",
  productHref: "/"
});
