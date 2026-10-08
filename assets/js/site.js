/* chinmay18.com — theme toggle, command palette, scroll reveal, copy buttons.
   No dependencies. The theme is applied before first paint by the inline script in <head>. */
(function () {
  "use strict";

  var root = document.documentElement;
  var THEMES = ["system", "light", "dark"];

  function readTheme() {
    try {
      var t = localStorage.getItem("theme");
      return THEMES.indexOf(t) >= 0 ? t : "system";
    } catch (e) {
      return "system";
    }
  }

  function applyTheme(t) {
    if (t === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", t);
    }
    try {
      localStorage.setItem("theme", t);
    } catch (e) {
      /* storage unavailable: theme still applies for this view */
    }
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-label", "Theme: " + t + ". Click to change.");
      btn.dataset.theme = t;
      var label = btn.querySelector(".theme-label");
      if (label) label.textContent = t;
    }
  }

  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    applyTheme(readTheme());
    toggle.addEventListener("click", function () {
      var cur = readTheme();
      applyTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]);
    });
  }

  /* ---- scroll reveal: moves only, content is visible at rest ---- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("in");
    });
  }

  /* ---- copy buttons ---- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        var old = btn.textContent;
        btn.textContent = "copied";
        setTimeout(function () {
          btn.textContent = old;
        }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          window.prompt("Copy:", text);
        });
      } else {
        window.prompt("Copy:", text);
      }
    });
  });

  /* ---- command palette (⌘K / Ctrl+K, or the button) ---- */
  var palette = document.getElementById("palette");
  var input = document.getElementById("palette-input");
  var list = document.getElementById("palette-list");
  var openers = document.querySelectorAll("[data-open-palette]");
  var items = [];
  var selected = 0;

  function collect() {
    items = [];
    document.querySelectorAll("[data-cmd]").forEach(function (el) {
      items.push({
        label: el.getAttribute("data-cmd"),
        kind: el.getAttribute("data-kind") || "",
        href: el.getAttribute("href") || el.getAttribute("data-href") || "#",
        external: /^https?:/.test(el.getAttribute("href") || el.getAttribute("data-href") || "")
      });
    });
  }

  function render(q) {
    if (!list) return;
    var query = (q || "").trim().toLowerCase();
    var shown = items.filter(function (it) {
      return !query || (it.label + " " + it.kind).toLowerCase().indexOf(query) >= 0;
    });
    list.innerHTML = "";
    if (!shown.length) {
      var li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No match. Try a project, a section, or a link.";
      list.appendChild(li);
      return;
    }
    selected = Math.min(selected, shown.length - 1);
    shown.forEach(function (it, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === selected ? "true" : "false");
      var a = document.createElement("a");
      a.href = it.href;
      if (it.external) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      a.textContent = it.label;
      var small = document.createElement("small");
      small.textContent = it.kind;
      a.appendChild(small);
      a.addEventListener("click", close);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function open() {
    if (!palette) return;
    collect();
    selected = 0;
    palette.hidden = false;
    document.body.style.overflow = "hidden";
    if (input) {
      input.value = "";
      render("");
      input.focus();
    }
  }

  function close() {
    if (!palette) return;
    palette.hidden = true;
    document.body.style.overflow = "";
  }

  function activate() {
    var el = list && list.querySelector('[aria-selected="true"] a');
    if (el) el.click();
  }

  openers.forEach(function (b) {
    b.addEventListener("click", open);
  });

  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "k") {
      e.preventDefault();
      palette && palette.hidden ? open() : close();
      return;
    }
    if (palette && !palette.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        selected++;
        render(input ? input.value : "");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selected = Math.max(0, selected - 1);
        render(input ? input.value : "");
      } else if (e.key === "Enter") {
        e.preventDefault();
        activate();
      }
    }
  });

  if (input) {
    input.addEventListener("input", function () {
      selected = 0;
      render(input.value);
    });
  }

  if (palette) {
    palette.addEventListener("click", function (e) {
      if (e.target === palette) close();
    });
  }

  /* ---- project filters (projects.html) ---- */
  var filters = document.querySelectorAll(".filter");
  if (filters.length) {
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filters.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        var f = btn.getAttribute("data-filter");
        document.querySelectorAll(".proj").forEach(function (card) {
          var kinds = (card.getAttribute("data-kinds") || "").split(" ");
          card.hidden = !(f === "all" || kinds.indexOf(f) >= 0);
        });
        try {
          if (f === "all") history.replaceState(null, "", location.pathname);
          else history.replaceState(null, "", "#" + f);
        } catch (e) {
          /* ignore */
        }
      });
    });
    var initial = (location.hash || "").replace("#", "");
    var match = initial && document.querySelector('.filter[data-filter="' + initial + '"]');
    if (match) match.click();
  }

  /* ---- footer year ---- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
