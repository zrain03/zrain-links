// Keeps navigation and the two workspace shortcuts consistent with the visible
// page section. This affects presentation only, not forms or authentication.
export function activeSectionFromOffsets({directTop, collectionTop, collectionVisible}, threshold) {
  if (collectionVisible && collectionTop <= threshold) return "my-links";
  if (directTop <= threshold) return "create";
  return "visits-links";
}

export function sectionForHash(hash) {
  const value = typeof hash === "string" ? hash.replace(/^#/, "") : "";
  if (value === "my-links" || value === "visits-list" || value === "links-list") return "my-links";
  if (value === "create" || value === "long-url" || value === "custom-alias" ||
      value === "shorten-form" || value === "latest-result") return "create";
  if (value === "visits-links" || value.startsWith("visits-")) return "visits-links";
  return null;
}

export function mountSectionNavigation(doc, win) {
  const header = doc.querySelector(".zrain-header");
  const direct = doc.getElementById("create");
  const collection = doc.getElementById("my-links");
  const links = [
    ...doc.querySelectorAll('.topnav a[href^="#"]'),
    ...doc.querySelectorAll('.mode-choices a[href^="#"]')
  ];
  if (!direct || !links.length) return;

  function paint(section) {
    for (const anchor of links) {
      const selected = anchor.getAttribute("href") === "#" + section;
      const mode = anchor.closest(".mode-choices") !== null;
      anchor.classList.toggle(mode ? "selected" : "current", selected);
      if (selected) anchor.setAttribute("aria-current", "location");
      else anchor.removeAttribute("aria-current");
    }
  }

  function fromScroll() {
    const threshold = (header?.getBoundingClientRect().height || 0) + 32;
    return activeSectionFromOffsets({
      directTop: direct.getBoundingClientRect().top,
      collectionTop: collection?.getBoundingClientRect().top ?? Infinity,
      collectionVisible: Boolean(collection && !collection.hidden)
    }, threshold);
  }

  // Favor the current hash at first paint. As a user scrolls, the position
  // becomes the source of truth, including after clicking an anchor.
  paint(sectionForHash(win.location.hash) || fromScroll());
  for (const anchor of links) {
    anchor.addEventListener("click", () => {
      const section = sectionForHash(anchor.getAttribute("href"));
      if (section) paint(section);
    });
  }

  win.addEventListener("hashchange", () => {
    paint(sectionForHash(win.location.hash) || fromScroll());
  });

  let queued = false;
  win.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    win.requestAnimationFrame(() => {
      queued = false;
      paint(fromScroll());
    });
  }, {passive:true});

  win.addEventListener("resize", () => paint(fromScroll()));
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  mountSectionNavigation(document, window);
}
