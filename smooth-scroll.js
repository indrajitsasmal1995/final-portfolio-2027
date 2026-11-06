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
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) { e.preventDefault(); lenis.scrollTo(0); return; }
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      // images that load during the glide push the section down, so re-aim until it lands
      var tries = 0;
      (function go() {
        lenis.scrollTo(target, { offset: -24, onComplete: function () {
          var top = target.getBoundingClientRect().top;
          var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
          if (Math.abs(top - 24) > 4 && !atEnd && ++tries < 4) go();
        } });
      })();
      history.replaceState(null, '', id);
    });
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
