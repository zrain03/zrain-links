import { mountZrainUI } from "./zrain-ui.js?v=1.0.0";

// Product-specific navigation and authentication remain owned by Zrain Links.
// The shared component owns only the Zrain branding and footer credit.
mountZrainUI({
  product: "Links",
  logoSrc: "/zrain-logo.webp",
  productHref: "/"
});
