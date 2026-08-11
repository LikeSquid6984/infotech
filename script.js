// my js file

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVG_NS = "http://www.w3.org/2000/svg";

  // navbar logic

  function nav() {
    var bar = document.getElementById("nav");
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (!bar) { return; }

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      links.classList.toggle("is-open", !open);
    });

    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        toggle.setAttribute("aria-expanded", "false");
        links.classList.remove("is-open");
      }
    });

    // Highlight the section currently filling most of the screen.
    var anchors = Array.prototype.slice.call(links.querySelectorAll("a"));
    var sections = anchors
      .map(function (a) { return document.querySelector(a.getAttribute("href")); })
      .filter(Boolean);

    if ("IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) { return; }
          anchors.forEach(function (a) {
            a.classList.toggle("is-active",
              a.getAttribute("href") === "#" + e.target.id);
          });
        });
      }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      sections.forEach(function (s) { seen.observe(s); });
    }

    return bar;
  }

  // scrollbar progress

  function scrollDriven(bar) {
    var fill = document.getElementById("progressBar");
    var y = window.scrollY, queued = false;

    function frame() {
      queued = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (fill) { fill.style.width = (max > 0 ? (y / max) * 100 : 0) + "%"; }
      if (bar) { bar.classList.toggle("is-stuck", y > 40); }
    }

    window.addEventListener("scroll", function () {
      y = window.scrollY;
      if (!queued) { queued = true; requestAnimationFrame(frame); }
    }, { passive: true });

    frame();
  }

  // fade in animations

  function reveals() {
    var els = document.querySelectorAll(".reveal");
    if (reduced || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  // animate numbers

  function group(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  function runCount(el) {
    var to = parseFloat(el.dataset.to);
    var dp = el.dataset.decimal ? parseInt(el.dataset.decimal, 10) : 0;
    var pre = el.dataset.prefix || "";
    var suf = el.dataset.suffix || "";
    var comma = el.dataset.comma === "in";

    function show(v) {
      var s = dp ? (v / Math.pow(10, dp)).toFixed(dp) : Math.round(v).toString();
      if (comma) { s = group(s); }
      el.textContent = pre + s + suf;
    }

    if (reduced) { show(to); return; }

    var dur = 1500, t0 = null;
    requestAnimationFrame(function step(t) {
      if (t0 === null) { t0 = t; }
      var p = Math.min((t - t0) / dur, 1);
      show(to * (1 - Math.pow(1 - p, 3)));   // ease-out cubic
      if (p < 1) { requestAnimationFrame(step); }
    });
  }

  function counters() {
    var els = document.querySelectorAll(".count");
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(els, runCount);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  /* ── The chakra dial ────────────────────────────────────────────────
     Generated from the milestone list in the HTML, so the wheel and the
     text can never disagree. One century = one full turn: 1947 sits at
     twelve o'clock and 2047 arrives back at the same place. */

  var START = 1947, SPAN = 100, NOW = 2026;
  var CX = 200, CY = 200, R_RING = 148, R_IN = 112, R_OUT = 136;

  var dialEl = document.getElementById("dial");
  var items = Array.prototype.slice.call(document.querySelectorAll(".mile"));
  var rotor = null, marks = [];

  function angleOf(y) { return (y - START) / SPAN * 360; }

  // Angles run clockwise from twelve o'clock — hence sin on x, minus cos on y.
  function polar(r, deg) {
    var a = deg * Math.PI / 180;
    return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
  }

  function make(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { el.setAttribute(k, attrs[k]); }
    return el;
  }

  function arc(r, from, to) {
    var a = polar(r, from), b = polar(r, to);
    return "M" + a.x + " " + a.y + " A" + r + " " + r + " 0 " +
           ((to - from) > 180 ? 1 : 0) + " 1 " + b.x + " " + b.y;
  }

  function buildDial() {
    if (!dialEl || !items.length) { return; }

    var defs = make("defs", {});
    var grad = make("linearGradient", { id: "dialGrad", x1: "0", y1: "0", x2: "1", y2: "1" });
    [["0%", "#FF9838"], ["55%", "#FF6B2C"], ["100%", "#4D93FF"]].forEach(function (s) {
      grad.appendChild(make("stop", { offset: s[0], "stop-color": s[1] }));
    });
    defs.appendChild(grad);
    dialEl.appendChild(defs);

    rotor = make("g", { class: "dial__rotor" });

    for (var i = 0; i < 24; i++) {           // 24 spokes, as on the Chakra
      var d = i * 15, p1 = polar(R_IN, d), p2 = polar(R_OUT, d);
      rotor.appendChild(make("line", { class: "dial__spoke", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }));
    }

    rotor.appendChild(make("circle", { class: "dial__ring", cx: CX, cy: CY, r: R_RING }));
    rotor.appendChild(make("path", { class: "dial__future", d: arc(R_RING, angleOf(NOW), 359.5) }));
    rotor.appendChild(make("path", { class: "dial__past",   d: arc(R_RING, 0, angleOf(NOW)) }));

    items.forEach(function (li) {
      var year = parseInt(li.dataset.year, 10);
      // A full century lands 2047 back on 1947. Push the last marker
      // outside the ring so the loop closing reads as a lap completed
      // rather than two dots colliding.
      var r = year === START + SPAN ? R_RING + 18 : R_RING;
      var p = polar(r, angleOf(year));
      var c = make("circle", { class: "dial__mark", cx: p.x, cy: p.y, r: 6 });
      if (year <= NOW) { c.classList.add("is-done"); }
      rotor.appendChild(c);
      marks.push(c);
    });

    dialEl.appendChild(rotor);

    // The needle sits outside the rotor: the wheel turns, the reading
    // position stays put.
    dialEl.appendChild(make("line", {
      class: "dial__needle", x1: CX, y1: CY - R_RING - 15, x2: CX, y2: CY - R_RING + 9
    }));
  }

  var readYear = document.getElementById("readoutYear");
  var readTitle = document.getElementById("readoutTitle");
  var dialFill = document.getElementById("dialFill");
  var current = -1;

  function setActive(i) {
    if (i === current || !items[i]) { return; }
    current = i;

    items.forEach(function (li, n) { li.classList.toggle("is-active", n === i); });
    marks.forEach(function (c, n) { c.classList.toggle("is-live", n === i); });

    var li = items[i], year = parseInt(li.dataset.year, 10);
    if (readYear) { readYear.textContent = li.dataset.year; }
    if (readTitle) { readTitle.textContent = li.dataset.title; }
    if (dialFill) { dialFill.style.width = ((year - START) / SPAN * 100) + "%"; }
    if (rotor) {
      rotor.setAttribute("transform", "rotate(" + (-angleOf(year)) + " " + CX + " " + CY + ")");
    }
  }

  function watchMilestones() {
    if (!items.length) { return; }
    setActive(0);
    if (!("IntersectionObserver" in window)) { return; }

    // A narrow band across the middle of the viewport decides which
    // milestone is being read. Between cards the last one stays active,
    // so the wheel never snaps back to a default.
    var band = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { setActive(items.indexOf(e.target)); }
      });
    }, { rootMargin: "-46% 0px -46% 0px", threshold: 0 });
    items.forEach(function (li) { band.observe(li); });

    // Clicking a card jumps the wheel straight to it.
    items.forEach(function (li, i) {
      li.addEventListener("mouseenter", function () { setActive(i); });
    });
  }

  // tabs for defence

  function chain() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.chain__tabs [role="tab"]'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.chain__panels [role="tabpanel"]'));
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".chain__nodes > g"));
    if (!tabs.length) { return; }

    function select(i, focus) {
      tabs.forEach(function (t, n) {
        t.setAttribute("aria-selected", n === i ? "true" : "false");
        t.tabIndex = n === i ? 0 : -1;
      });
      panels.forEach(function (p, n) { p.hidden = n !== i; });
      nodes.forEach(function (g, n) { g.classList.toggle("is-on", n <= i); });
      if (focus) { tabs[i].focus(); }
    }

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, false); });
      t.addEventListener("keydown", function (e) {
        var next = e.key === "ArrowRight" ? i + 1
                 : e.key === "ArrowLeft"  ? i - 1
                 : e.key === "Home"       ? 0
                 : e.key === "End"        ? tabs.length - 1 : null;
        if (next === null) { return; }
        e.preventDefault();
        select((next + tabs.length) % tabs.length, true);
      });
    });

    select(0, false);
  }

  // scrolling images loop

  function marquee() {
    var row = document.getElementById("marqueeRow");
    if (!row || reduced) { return; }
    Array.prototype.slice.call(row.children).forEach(function (node) {
      var copy = node.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      row.appendChild(copy);
    });
  }

  /* ── Loading screen ─────────────────────────────────────────────────
     Held for a moment even on a fast load, so the flag finishes drawing
     instead of flashing past. */

  function loader() {
    var el = document.getElementById("loader");
    if (!el) { return; }

    var MIN = reduced ? 300 : 2100;
    var started = Date.now();

    function done() {
      setTimeout(function () {
        el.classList.add("is-done");
        setTimeout(function () { el.remove(); }, 800);
      }, Math.max(0, MIN - (Date.now() - started)));
    }

    if (document.readyState === "complete") { done(); }
    else { window.addEventListener("load", done); }
  }

  /* ── Custom cursor ──────────────────────────────────────────────────
     The ring trails the dot with easing; both are skipped on touch
     screens and when reduced motion is asked for. */

  function cursor() {
    var ring = document.getElementById("curRing");
    var dot = document.getElementById("curDot");
    if (!ring || !dot || reduced) { return; }
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) { return; }

    var mx = -100, my = -100, rx = -100, ry = -100, live = false;

    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!live) {
        live = true;
        ring.classList.add("is-live");
        dot.classList.add("is-live");
      }
      dot.style.transform = "translate(" + mx + "px," + my + "px)";

      // Grow over anything clickable.
      var hot = e.target.closest("a, button, .card, .chip, .plate, .tile, .pillar, .bigstat");
      ring.classList.toggle("is-hot", !!hot);
    }, { passive: true });

    document.addEventListener("mousedown", function () { ring.classList.add("is-down"); });
    document.addEventListener("mouseup", function () { ring.classList.remove("is-down"); });
    document.addEventListener("mouseleave", function () {
      ring.classList.remove("is-live"); dot.classList.remove("is-live"); live = false;
    });

    (function follow() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(follow);
    })();
  }

  // run everything

  loader();
  cursor();
  var bar = nav();
  scrollDriven(bar);
  reveals();
  counters();
  buildDial();
  watchMilestones();
  chain();
  marquee();

})();
