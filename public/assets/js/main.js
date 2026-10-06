/* HomeLabCore — minimal vanilla JS.
   No dependencies, no trackers. Progressive enhancement only: without JS the
   menu is always visible and the theme stays light. The saved theme itself is
   applied by an inline script in <head>, before first paint. */

(function () {
  "use strict";

  var root = document.documentElement;
  var STORAGE_KEY = "hlc-theme";
  var THEME_COLOR = { light: "#fafaf7", dark: "#0b0d10" };

  // ---- responsive navigation ----
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("nav-menu");

  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (toggle && menu) {
    toggle.hidden = false;
    toggle.addEventListener("click", function () {
      setMenu(!menu.classList.contains("is-open"));
    });
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a") && menu.classList.contains("is-open")) setMenu(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  // ---- theme toggle ----
  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
  }

  var themeButtons = document.querySelectorAll("[data-theme-toggle]");
  for (var i = 0; i < themeButtons.length; i++) {
    themeButtons[i].hidden = false;
    themeButtons[i].addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* storage unavailable: the choice lasts for this page only */
      }
    });
  }
  applyTheme(currentTheme());

  // ---- current year in the footer ----
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
