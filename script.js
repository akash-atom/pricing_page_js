/* Pricing page - "Compare plans" accordion
 *
 * The collapsible table divs each carry id="pricing-table" (yes, the same id
 * repeats on every table). They sit as siblings, each one immediately after a
 * .table-section-header:
 *
 *   <div class="table-section-header"> ... <img class="table-dropdown-icon"></div>
 *   <div id="pricing-table" class="fs-table-*_instance"> ...table... </div>   <- collapsible
 *
 * So we select every [id="pricing-table"] element and treat its previous
 * sibling header as the toggle. Clicking the header slides the table open/shut.
 *
 * Behaviour: first category open on load, rest collapsed. Independent
 * toggling (multiple categories can be open at once).
 *
 * Tables may be injected at runtime by Finsweet, so we also watch for new
 * ones (observer + polling).
 *
 * ES5 only (var / no arrow functions) for browser compatibility.
 */
(function () {
  'use strict';

  var INSTANCE_SELECTOR = '[id="pricing-table"]'; // duplicate id, select them all
  var HEADER_SELECTOR = '.table-section-header';
  var ICON_SELECTOR = '.table-dropdown-icon';
  var INIT_FLAG = 'awAccordionBound';
  var SLIDE_CLASS = 'aw-slide';
  var DURATION = 350; // ms, keep in sync with the injected CSS transition

  var boundInstances = []; // collapsible table elements we control

  // ---- one-time CSS injection ------------------------------------------
  function injectStyles() {
    if (document.getElementById('aw-accordion-styles')) return;
    var css =
      '.table-section-header{cursor:pointer;}' +
      ICON_SELECTOR + '{transition:transform .35s ease;}' +
      '.table-section-header.is-open ' + ICON_SELECTOR + '{transform:rotate(180deg);}' +
      // transition added after first paint to avoid a load flash
      '.' + SLIDE_CLASS + '{transition:height .35s ease;overflow:hidden;}';
    var style = document.createElement('style');
    style.id = 'aw-accordion-styles';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  // ---- helpers ----------------------------------------------------------
  function matches(el, selector) {
    if (!el || el.nodeType !== 1) return false;
    var fn =
      el.matches ||
      el.webkitMatchesSelector ||
      el.msMatchesSelector ||
      el.mozMatchesSelector;
    return fn ? fn.call(el, selector) : false;
  }

  // The header that controls an instance = its previous sibling header.
  function findHeader(instance) {
    var node = instance.previousElementSibling;
    while (node) {
      if (matches(node, HEADER_SELECTOR)) return node;
      if (matches(node, INSTANCE_SELECTOR)) return null; // hit another table
      node = node.previousElementSibling;
    }
    return null;
  }

  function getIcon(header) {
    return header.querySelector(ICON_SELECTOR);
  }

  function expand(instance) {
    instance.style.height = instance.scrollHeight + 'px';
    // after the slide finishes, release to auto so it stays responsive
    window.setTimeout(function () {
      if (instance.getAttribute('data-aw-open') === '1') {
        instance.style.height = 'auto';
      }
    }, DURATION);
  }

  function collapse(instance) {
    // from auto -> fixed px, force reflow, then to 0 so it animates
    instance.style.height = instance.scrollHeight + 'px';
    instance.offsetHeight; // reflow
    instance.style.height = '0px';
  }

  function setOpen(header, instance, open) {
    instance.setAttribute('data-aw-open', open ? '1' : '0');
    header.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      if (header.className.indexOf('is-open') === -1) header.className += ' is-open';
      expand(instance);
    } else {
      header.className = header.className.replace(/\s*\bis-open\b/g, '');
      collapse(instance);
    }
  }

  function toggle(header, instance) {
    setOpen(header, instance, instance.getAttribute('data-aw-open') !== '1');
  }

  // ---- wire up one instance + its header -------------------------------
  function bindInstance(instance, startOpen) {
    if (instance[INIT_FLAG]) return false;
    var header = findHeader(instance);
    if (!header) return false; // no controlling header (e.g. overview table)

    instance[INIT_FLAG] = true;
    boundInstances.push(instance);

    // accessibility
    if (!header.getAttribute('role')) header.setAttribute('role', 'button');
    if (!header.hasAttribute('tabindex')) header.setAttribute('tabindex', '0');

    // initial state WITHOUT animation (slide class added after first paint)
    instance.style.overflow = 'hidden';
    if (startOpen) {
      instance.setAttribute('data-aw-open', '1');
      header.setAttribute('aria-expanded', 'true');
      if (header.className.indexOf('is-open') === -1) header.className += ' is-open';
      instance.style.height = 'auto';
    } else {
      instance.setAttribute('data-aw-open', '0');
      header.setAttribute('aria-expanded', 'false');
      instance.style.height = '0px';
    }

    header.addEventListener('click', function () {
      toggle(header, instance);
    });
    header.addEventListener('keydown', function (e) {
      var key = e.key || e.keyCode;
      if (key === 'Enter' || key === ' ' || key === 13 || key === 32) {
        e.preventDefault();
        toggle(header, instance);
      }
    });

    return true;
  }

  // ---- (re)scan for instances ------------------------------------------
  var slideEnabled = false;
  function enableSlide() {
    if (slideEnabled) return;
    for (var i = 0; i < boundInstances.length; i++) {
      var el = boundInstances[i];
      if (el.className.indexOf(SLIDE_CLASS) === -1) el.className += ' ' + SLIDE_CLASS;
    }
    slideEnabled = true;
  }

  function scan() {
    var instances = document.querySelectorAll(INSTANCE_SELECTOR);
    var boundAny = false;
    var firstUnbound = true;
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      var wasBound = !!inst[INIT_FLAG];
      // only the FIRST togglable table starts open, the rest collapsed
      var ok = bindInstance(inst, firstUnbound && !wasBound);
      if (ok) boundAny = true;
      if (ok || wasBound) firstUnbound = false;
    }
    if (boundAny) {
      // turn transitions on after the initial paint so load is flash-free
      window.requestAnimationFrame
        ? window.requestAnimationFrame(function () {
            window.requestAnimationFrame(enableSlide);
          })
        : window.setTimeout(enableSlide, 60);
    }
    return boundAny;
  }

  // ---- bootstrap --------------------------------------------------------
  function bootstrap() {
    injectStyles();
    scan();

    var first = document.querySelector(INSTANCE_SELECTOR);
    var root = (first && first.parentNode) || document.body;
    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        scan();
      });
      observer.observe(root, { childList: true, subtree: true });
    }

    // polling fallback (stops once every instance is paired)
    var tries = 0;
    var poll = window.setInterval(function () {
      tries++;
      scan();
      var instances = document.querySelectorAll(INSTANCE_SELECTOR);
      var allBound = instances.length > 0;
      for (var i = 0; i < instances.length; i++) {
        if (!instances[i][INIT_FLAG] && findHeader(instances[i])) {
          allBound = false;
          break;
        }
      }
      if (allBound || tries > 40) window.clearInterval(poll); // ~20s max
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
