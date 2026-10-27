// Sync the active navigation tab to what a visitor can actually see.
// The reading line sits inside the viewport, not immediately under the
// header. Direct's large heading is visible before its section reaches
// the very top, especially on laptops.
export function readingLine(viewportHeight, headerHeight=0) {
  const height = Number(viewportHeight)>0 ? Number(viewportHeight) : 768;
  const header = Number(headerHeight)>0 ? Number(headerHeight) : 0;
  return Math.min(height-16,Math.max(header+32,Math.round(height*0.38)));
}

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
  const anchors = [
    ...doc.querySelectorAll('.topnav a[href^="#"]'),
    ...doc.querySelectorAll('.mode-choices a[href^="#"]')
  ];
  if (!direct || !anchors.length) return;

  function paint(section) {
    for (const anchor of anchors) {
      const selected = anchor.getAttribute("href") === "#" + section;
      const mode = anchor.closest(".mode-choices") !== null;
      anchor.classList.toggle(mode ? "selected" : "current", selected);
      if (selected) anchor.setAttribute("aria-current", "location");
      else anchor.removeAttribute("aria-current");
    }
  }

  function fromScroll() {
    const line = readingLine(
      win.innerHeight || doc.documentElement?.clientHeight,
      header?.getBoundingClientRect().height
    );
    return activeSectionFromOffsets({
      directTop: direct.getBoundingClientRect().top,
      collectionTop: collection?.getBoundingClientRect().top ?? Infinity,
      collectionVisible: Boolean(collection && !collection.hidden)
    }, line);
  }

  // The displayed section is the source of truth, not an old URL hash.
  // This also handles browser back/forward restoring a previous scroll.
  function sync() { paint(fromScroll()); }
  sync();

  // Normal anchors perform the navigation, keeping native smooth scrolling.
  // Click gives immediate feedback; subsequent scroll events correct it to
  // whichever section is genuinely visible.
  for (const anchor of anchors) {
    anchor.addEventListener("click", () => {
      const selected = sectionForHash(anchor.getAttribute("href"));
      if (selected) paint(selected);
    });
  }

  let queued = false;
  function scheduleSync() {
    if (queued) return;
    queued = true;
    (win.requestAnimationFrame || (fn=>fn()))(() => {
      queued = false;
      sync();
    });
  }
  win.addEventListener("scroll", scheduleSync, {passive:true});
  win.addEventListener("resize", scheduleSync);
  win.addEventListener("hashchange", scheduleSync);
  win.addEventListener("pageshow", scheduleSync);
  win.addEventListener("load", scheduleSync);

  // Sign-in can reveal the collection later. Recalculate when its hidden
  // state changes so "My links" cannot stay highlighted incorrectly.
  const Observer = win.MutationObserver;
  if (collection && typeof Observer === "function") {
    new Observer(scheduleSync).observe(collection,{attributes:true,attributeFilter:["hidden"]});
  }
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  mountSectionNavigation(document,window);
}
