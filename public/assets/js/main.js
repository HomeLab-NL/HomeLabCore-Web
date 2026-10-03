/* HomeLabCore — minimal vanilla JS.
   No dependencies, no trackers. Progressive enhancement only. */

(function () {
  "use strict";

  // Responsive navigation toggle.
  var toggle = document.querySelector(".nav__toggle");
  var links = document.getElementById("nav-links");

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close the menu after following an in-page link on small screens.
    links.addEventListener("click", function (event) {
      if (event.target.tagName === "A" && links.classList.contains("is-open")) {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

    // Close on Escape for keyboard users.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && links.classList.contains("is-open")) {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  // Current year in the footer.
  var year = document.querySelector("[data-year]");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
})();
