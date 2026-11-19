/* Smooth scrolling for the case studies: the same Lenis setup as the homepage.
   Wheel and trackpad scrolls ease into place; in-page links glide to their section.
   Off for anyone who prefers reduced motion. */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function start() {
    if (!window.Lenis || window.__lenis) return;
    var lenis = window.__lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    // lists that scroll on their own (the section rail) keep their native scroll
    document.querySelectorAll('.toc__list').forEach(function (el) { el.setAttribute('data-lenis-prevent', ''); });
    function unpin() { if (window.__tocPin) { window.__tocPin = null; dispatchEvent(new Event('scroll')); } }
    ['wheel', 'touchstart', 'keydown'].forEach(function (t) { addEventListener(t, unpin, { passive: true }); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) { e.preventDefault(); lenis.scrollTo(0); return; }
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      // where the section's first line of text lands: 28px below the fixed header, the same spot for
      // every section, whatever padding sits above its heading
      var land = function () {
        var hdr = document.querySelector('.site-header');
        var first = [].slice.call(target.querySelectorAll('h1,h2,h3,p,.act__label,.z-row__label,.kicker'))
          .filter(function (el) { return el.getBoundingClientRect().height > 0; })[0];
        var gap = first ? first.getBoundingClientRect().top - target.getBoundingClientRect().top : 0;
        return Math.round((hdr ? hdr.getBoundingClientRect().height : 0) + 28 - gap);
      };
      // the menu keeps the clicked section marked until the reader scrolls on their own
      window.__tocPin = id;
      dispatchEvent(new Event('scroll'));
      // images that load during the glide push the section down, so re-aim until it lands
      var tries = 0;
      (function go() {
        var at = land();
        lenis.scrollTo(target, { offset: -at, onComplete: function () {
          var top = target.getBoundingClientRect().top;
          var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
          if (Math.abs(top - at) > 4 && !atEnd && ++tries < 4) go();
        } });
      })();
      history.replaceState(null, '', id);
    });
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
