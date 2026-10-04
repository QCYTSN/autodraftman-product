import { useEffect, type RefObject } from "react";

export function useDemoMotion(page: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = page.current;
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = root.querySelectorAll<HTMLElement>("[data-demo-reveal]");
    const hero = root.querySelector<HTMLElement>(".demo-hero");
    const header = root.querySelector<HTMLElement>(".demo-header");
    const nav = root.querySelector<HTMLElement>(".demo-nav");
    const indicator = nav?.querySelector<HTMLElement>(".demo-nav-indicator");
    const closing = root.querySelector<HTMLElement>(".demo-closing");
    const destinations = Array.from(nav?.querySelectorAll<HTMLAnchorElement>('a[href^="#"]') ?? [])
      .map(link => ({ link, section: root.querySelector<HTMLElement>(link.hash) }))
      .filter((destination): destination is { link: HTMLAnchorElement; section: HTMLElement } => Boolean(destination.section));
    let checkpoints: { link: HTMLAnchorElement; top: number }[] = [];
    let closingTop = Infinity;
    let pageBottom = Infinity;
    let headerHeight = header?.offsetHeight || 0;
    let heroHeight = hero?.offsetHeight || 1;
    let frame = 0;
    let previousProgress = -1;
    let previousHeaderProgress = -1;
    let currentLink: HTMLAnchorElement | null = null;
    let layoutChanged = true;
    let disposed = false;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("demo-revealed");
          observer.unobserve(entry.target);
        }
      }
    }, { rootMargin: "0px 0px -48px 0px", threshold: 0.06 });

    function showContent() {
      root!.classList.remove("demo-motion-ready");
      elements.forEach((element) => element.classList.add("demo-revealed"));
      observer.disconnect();
    }

    function updateNavigation(scrollTop: number) {
      // Use the start of the readable content, without its entrance transform.
      const readingLine = scrollTop + headerHeight + Math.min(160, (window.innerHeight - headerHeight) * .2);
      let nextLink: HTMLAnchorElement | null = null;
      if (readingLine < closingTop && scrollTop + window.innerHeight < pageBottom - 2) {
        for (const checkpoint of checkpoints) {
          if (checkpoint.top > readingLine) break;
          nextLink = checkpoint.link;
        }
      }
      if (nextLink === currentLink && !layoutChanged) return;
      currentLink = nextLink;
      layoutChanged = false;
      for (const { link } of destinations) {
        if (link === nextLink) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
      if (!nav || !indicator) return;
      nav.toggleAttribute("data-active", Boolean(nextLink));
      if (!nextLink) return;
      const bounds = nextLink.getBoundingClientRect();
      const navBounds = nav.getBoundingClientRect();
      indicator.style.setProperty("--demo-nav-x", bounds.left - navBounds.left - 10 + "px");
      indicator.style.setProperty("--demo-nav-y", bounds.top - navBounds.top - 6 + "px");
      indicator.style.width = bounds.width + 20 + "px";
      indicator.style.height = bounds.height + 12 + "px";
    }

    function updateScroll() {
      frame = 0;
      const scrollTop = Math.max(0, window.scrollY);
      root!.classList.toggle("demo-scrolled", scrollTop > 24);
      updateNavigation(scrollTop);
      const headerProgress = Math.min(1, scrollTop / 120);
      if (headerProgress !== previousHeaderProgress) {
        previousHeaderProgress = headerProgress;
        root!.style.setProperty("--demo-header-opacity", String(.84 + .14 * headerProgress));
        root!.style.setProperty("--demo-header-shadow", String(.065 * headerProgress));
      }
      const progress = preference.matches ? 0 : Math.min(1, scrollTop / heroHeight);
      if (progress === previousProgress) return;
      previousProgress = progress;
      root!.style.setProperty("--demo-hero-shift", (-32 * progress).toFixed(2) + "px");
      root!.style.setProperty("--demo-hero-opacity", String(1 - 0.3 * progress));
    }

    function requestUpdate() {
      if (!frame) frame = requestAnimationFrame(updateScroll);
    }

    function refreshLayout() {
      if (disposed) return;
      headerHeight = header?.offsetHeight || 0;
      heroHeight = hero?.offsetHeight || 1;
      checkpoints = destinations.filter(({ link }) => link.getClientRects().length > 0).map(({ link, section }) => ({
        link, top: section.getBoundingClientRect().top + window.scrollY + parseFloat(getComputedStyle(section).paddingTop),
      }));
      closingTop = closing ? closing.offsetTop : Infinity;
      pageBottom = root!.getBoundingClientRect().bottom + window.scrollY;
      layoutChanged = true;
      requestUpdate();
    }

    if (preference.matches) showContent();
    else {
      root.classList.add("demo-motion-ready");
      elements.forEach((element) => observer.observe(element));
    }
    function changePreference() {
      if (preference.matches) showContent();
      previousProgress = -1;
      requestUpdate();
    }
    const resize = new ResizeObserver(refreshLayout);
    resize.observe(root);
    if (nav) resize.observe(nav);
    window.addEventListener("resize", refreshLayout);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    preference.addEventListener("change", changePreference);
    void document.fonts.ready.then(refreshLayout);
    refreshLayout();
    return () => {
      disposed = true;
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", refreshLayout);
      window.removeEventListener("scroll", requestUpdate);
      preference.removeEventListener("change", changePreference);
      cancelAnimationFrame(frame);
      root.classList.remove("demo-motion-ready", "demo-scrolled");
      root.style.removeProperty("--demo-hero-shift");
      root.style.removeProperty("--demo-hero-opacity");
      root.style.removeProperty("--demo-header-opacity");
      root.style.removeProperty("--demo-header-shadow");
      nav?.removeAttribute("data-active");
      for (const { link } of destinations) link.removeAttribute("aria-current");
      indicator?.removeAttribute("style");
    };
  }, [page]);
}
