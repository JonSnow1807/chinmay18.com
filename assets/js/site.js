/* chinmay18.com — theme toggle, command palette, scroll reveal, copy buttons, filters.
   No dependencies. The theme is applied before first paint by the inline script in <head>. */
(function () {
  "use strict";

  var root = document.documentElement;
  var THEMES = ["system", "light", "dark"];

  function announce(id, text) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.textContent = text;
    }
  }

  /* ---- theme: system → light → dark, remembered per browser ---- */
  function storedTheme() {
    try {
      var t = localStorage.getItem("theme");
      return THEMES.indexOf(t) >= 0 ? t : "system";
    } catch (e) {
      return "system";
    }
  }

  var currentTheme = storedTheme();
  var toggle = document.getElementById("theme-toggle");

  function applyTheme(t) {
    currentTheme = t;
    if (t === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", t);
    }
    try {
      if (t === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch (e) {
      /* storage unavailable: the theme still applies for this view */
    }
    if (toggle) {
      var label = toggle.querySelector(".theme-label");
      if (label) label.textContent = t;
    }
  }

  if (toggle) {
    applyTheme(currentTheme);
    toggle.addEventListener("click", function () {
      applyTheme(THEMES[(THEMES.indexOf(currentTheme) + 1) % THEMES.length]);
    });
  }

  /* ---- keyboard hint: ⌘K on Apple platforms, Ctrl K elsewhere ---- */
  var isApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform || "");
  document.querySelectorAll(".btn-kbd kbd").forEach(function (k) {
    k.textContent = isApple ? "⌘K" : "Ctrl K";
  });

  /* ---- new-tab links: say so to assistive tech ---- */
  document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
    var s = document.createElement("span");
    s.className = "sr-only";
    s.textContent = " (opens in a new tab)";
    a.appendChild(s);
  });

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
    var timer = null;
    var idle = btn.textContent;
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = "copied";
        announce("copy-status", (btn.getAttribute("aria-label") || "Copied") + ": copied to the clipboard");
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.textContent = idle;
        }, 1400);
      };
      var fallback = function () {
        var range = document.createRange();
        var target = btn.parentNode;
        range.selectNodeContents(target.firstElementChild || target);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        announce("copy-status", "Clipboard unavailable; the text is selected, press Ctrl or Command C to copy");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  });

  /* ---- command palette: a native <dialog> (focus containment, Escape, focus return) ---- */
  var palette = document.getElementById("palette");
  var input = document.getElementById("palette-input");
  var list = document.getElementById("palette-list");
  var empty = document.getElementById("palette-empty");
  var openers = document.querySelectorAll("[data-open-palette]");
  var items = [];
  var shownItems = [];
  var selected = 0;
  var dialogSupported = palette && typeof palette.showModal === "function";

  function collect() {
    items = [];
    document.querySelectorAll("[data-cmd]").forEach(function (el) {
      var href = el.getAttribute("href") || el.getAttribute("data-href") || "#";
      items.push({
        label: el.getAttribute("data-cmd"),
        kind: el.getAttribute("data-kind") || "",
        href: href,
        external: /^https?:/.test(href)
      });
    });
  }

  function render(q) {
    if (!list) return;
    var query = (q || "").trim().toLowerCase();
    shownItems = items.filter(function (it) {
      return !query || (it.label + " " + it.kind).toLowerCase().indexOf(query) >= 0;
    });
    list.innerHTML = "";
    if (!shownItems.length) {
      if (empty) empty.hidden = false;
      if (input) input.removeAttribute("aria-activedescendant");
      return;
    }
    if (empty) empty.hidden = true;
    selected = Math.min(Math.max(selected, 0), shownItems.length - 1);
    shownItems.forEach(function (it, i) {
      var li = document.createElement("li");
      li.id = "palette-opt-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === selected ? "true" : "false");
      var a = document.createElement("a");
      a.href = it.href;
      a.tabIndex = -1;
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
      li.addEventListener("mousemove", function () {
        if (selected !== i) {
          selected = i;
          render(input ? input.value : "");
        }
      });
      list.appendChild(li);
    });
    if (input) input.setAttribute("aria-activedescendant", "palette-opt-" + selected);
    var active = list.children[selected];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
  }

  function open() {
    if (!palette) return;
    collect();
    selected = 0;
    if (dialogSupported) {
      if (!palette.open) palette.showModal();
    } else {
      palette.setAttribute("open", "");
    }
    document.body.style.overflow = "hidden";
    if (input) {
      input.value = "";
      render("");
      input.focus();
    }
  }

  function close() {
    if (!palette) return;
    if (dialogSupported) {
      if (palette.open) palette.close();
    } else {
      palette.removeAttribute("open");
    }
    document.body.style.overflow = "";
  }

  function activate() {
    var el = list && list.querySelector('[aria-selected="true"] a');
    if (el) el.click();
  }

  openers.forEach(function (b) {
    b.addEventListener("click", open);
  });

  if (palette) {
    palette.addEventListener("close", function () {
      document.body.style.overflow = "";
    });
    palette.addEventListener("click", function (e) {
      if (e.target === palette) close();
    });
  }

  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "k") {
      e.preventDefault();
      if (palette && palette.open) close();
      else open();
      return;
    }
    if (!palette || !palette.open) return;
    if (e.key === "Escape" && !dialogSupported) {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selected = Math.min(selected + 1, Math.max(shownItems.length - 1, 0));
      render(input ? input.value : "");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selected = Math.max(0, selected - 1);
      render(input ? input.value : "");
    } else if (e.key === "Enter") {
      e.preventDefault();
      activate();
    }
  });

  if (input) {
    input.addEventListener("input", function () {
      selected = 0;
      render(input.value);
    });
  }

  /* ---- project filters (projects.html) ---- */
  var filters = document.querySelectorAll(".filter");
  if (filters.length) {
    var applyFilter = function (btn, pushHash) {
      filters.forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      var f = btn.getAttribute("data-filter");
      var count = 0;
      document.querySelectorAll(".proj").forEach(function (card) {
        var kinds = (card.getAttribute("data-kinds") || "").split(" ");
        var show = f === "all" || kinds.indexOf(f) >= 0;
        card.hidden = !show;
        if (show) count++;
      });
      announce("filter-status", count + (count === 1 ? " project shown" : " projects shown"));
      if (pushHash) {
        try {
          history.replaceState(null, "", location.pathname + location.search + (f === "all" ? "" : "#" + f));
        } catch (err) {
          /* ignore */
        }
      }
    };
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyFilter(btn, true);
      });
    });
    var initial = "";
    try {
      initial = decodeURIComponent((location.hash || "").slice(1));
    } catch (err) {
      initial = "";
    }
    var match = null;
    filters.forEach(function (b) {
      if (b.getAttribute("data-filter") === initial) match = b;
    });
    if (match) applyFilter(match, false);
    window.addEventListener("hashchange", function () {
      var h = "";
      try {
        h = decodeURIComponent((location.hash || "").slice(1));
      } catch (err) {
        h = "";
      }
      var target = null;
      filters.forEach(function (b) {
        if (b.getAttribute("data-filter") === (h || "all")) target = b;
      });
      if (target) applyFilter(target, false);
    });
  }

  /* ---- footer year ---- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
