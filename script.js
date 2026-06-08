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
      // transition added after first paint to avoid a load flash.
      // NOTE: only clip the vertical axis so the table can still scroll
      // horizontally on mobile (overflow-x is left to Webflow's own CSS).
      '.' + SLIDE_CLASS + '{transition:height .35s ease;overflow-y:hidden;}';
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

    // initial state WITHOUT animation (slide class added after first paint).
    // Only clip vertically so horizontal scroll (mobile) keeps working.
    instance.style.overflowY = 'hidden';
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

/* Tooltips
 *
 * Markup built in Webflow (positioning + styling are Webflow's job):
 *
 *   .tooltip-wrap            (position: relative)
 *     .tooltip-trigger       (the hover/tap target)
 *     .tooltip-content       (the bubble, hidden by default)
 *
 * This script only toggles classes:
 *   - .tooltip-content gets `is-visible`
 *   - .tooltip-wrap    gets `is-open`
 * Style the visible state in Webflow off either of those.
 *
 * Behaviour: hover on devices that support it; tap-to-toggle on touch
 * devices (with outside-tap + Escape to close). Keyboard focus also opens.
 * Auto-wires every .tooltip-wrap on the page, including ones injected later
 * (e.g. Finsweet table rows).
 *
 * ES5 only (var / no arrow functions) for browser compatibility.
 */
(function () {
  'use strict';

  var WRAP_SELECTOR = '.tooltip-wrap';
  var TRIGGER_SELECTOR = '.tooltip-trigger';
  var CONTENT_SELECTOR = '.tooltip-content';
  var VISIBLE_CLASS = 'is-visible';
  var OPEN_CLASS = 'is-open';
  var INIT_FLAG = 'awTooltipBound';
  // grace period (ms) for the cursor to travel from the trigger across any
  // gap onto the bubble before it closes — lets users reach links inside.
  var HIDE_DELAY = 250;

  // We decide hover vs tap per interaction using the real pointer type (see
  // bind), not a media query — many touch devices report hover-capable, which
  // made a tap open then instantly close on the synthesized mouseleave.

  var uid = 0;

  function matches(el, selector) {
    if (!el || el.nodeType !== 1) return false;
    var fn =
      el.matches ||
      el.webkitMatchesSelector ||
      el.msMatchesSelector ||
      el.mozMatchesSelector;
    return fn ? fn.call(el, selector) : false;
  }

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if (matches(el, selector)) return el;
      el = el.parentNode;
    }
    return null;
  }

  function addClass(el, cls) {
    if (el && el.className.indexOf(cls) === -1) el.className += ' ' + cls;
  }

  function removeClass(el, cls) {
    if (el) {
      el.className = el.className.replace(
        new RegExp('\\s*\\b' + cls + '\\b', 'g'),
        ''
      );
    }
  }

  // The bubble is usually .tooltip-content, but some instances use styled
  // variants (e.g. .tooltip-content-in-outcome in the second pricing tab).
  // Fall back to the wrap's first element child that isn't the trigger so the
  // same script drives every variant without needing each class name listed.
  function getContent(wrap) {
    var c = wrap.querySelector(CONTENT_SELECTOR);
    if (c) return c;
    var kids = wrap.children;
    for (var i = 0; i < kids.length; i++) {
      if (!matches(kids[i], TRIGGER_SELECTOR)) return kids[i];
    }
    return null;
  }

  function hide(wrap) {
    if (!wrap) return;
    removeClass(getContent(wrap), VISIBLE_CLASS);
    removeClass(wrap, OPEN_CLASS);
    var trigger = wrap.querySelector(TRIGGER_SELECTOR);
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function hideAll(except) {
    var open = document.querySelectorAll(WRAP_SELECTOR + '.' + OPEN_CLASS);
    for (var i = 0; i < open.length; i++) {
      if (open[i] !== except) hide(open[i]);
    }
  }

  function show(wrap) {
    hideAll(wrap); // one at a time
    addClass(getContent(wrap), VISIBLE_CLASS);
    addClass(wrap, OPEN_CLASS);
    var trigger = wrap.querySelector(TRIGGER_SELECTOR);
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  function toggle(wrap) {
    if (wrap.className.indexOf(OPEN_CLASS) === -1) show(wrap);
    else hide(wrap);
  }

  // delayed-close helpers so the cursor can cross the gap onto the bubble
  function cancelHide(wrap) {
    if (wrap.awHideTimer) {
      window.clearTimeout(wrap.awHideTimer);
      wrap.awHideTimer = null;
    }
  }

  function scheduleHide(wrap) {
    cancelHide(wrap);
    wrap.awHideTimer = window.setTimeout(function () {
      wrap.awHideTimer = null;
      hide(wrap);
    }, HIDE_DELAY);
  }

  function bind(wrap) {
    if (wrap[INIT_FLAG]) return;
    var trigger = wrap.querySelector(TRIGGER_SELECTOR);
    var content = getContent(wrap);
    if (!trigger || !content) return; // incomplete markup, skip for now

    wrap[INIT_FLAG] = true;

    // accessibility wiring
    if (!content.id) content.id = 'aw-tip-' + ++uid;
    content.setAttribute('role', 'tooltip');
    trigger.setAttribute('aria-describedby', content.id);
    trigger.setAttribute('aria-expanded', 'false');
    var tag = trigger.tagName;
    if (!trigger.hasAttribute('tabindex') && tag !== 'BUTTON' && tag !== 'A') {
      trigger.setAttribute('tabindex', '0');
    }

    // Mouse: hover to open (with a grace delay so the cursor can travel onto
    // the bubble). Touch/pen: tap the trigger to toggle. We branch on the live
    // pointer type so a touch tap never triggers the hover path (whose
    // synthesized mouseleave would close the bubble the instant it opened).
    var lastPointerType = 'mouse';
    var pointerActed = false; // a pointer just acted -> a following focus isn't keyboard

    function isMouse(e) {
      return (e.pointerType || 'mouse') === 'mouse';
    }

    if (window.PointerEvent) {
      wrap.addEventListener('pointerdown', function (e) {
        lastPointerType = e.pointerType || 'mouse';
        pointerActed = true;
        window.setTimeout(function () {
          pointerActed = false;
        }, 400);
      });
      wrap.addEventListener('pointerenter', function (e) {
        if (!isMouse(e)) return; // hover is a mouse-only affordance
        cancelHide(wrap);
        show(wrap);
      });
      wrap.addEventListener('pointerleave', function (e) {
        if (!isMouse(e)) return;
        scheduleHide(wrap);
      });
    } else {
      // legacy fallback (no Pointer Events): mark touch via touchstart so the
      // mouse hover handlers below can ignore touch-synthesized mouse events.
      wrap.addEventListener(
        'touchstart',
        function () {
          lastPointerType = 'touch';
          pointerActed = true;
        },
        true
      );
      wrap.addEventListener('mouseenter', function () {
        if (lastPointerType !== 'mouse') return;
        cancelHide(wrap);
        show(wrap);
      });
      wrap.addEventListener('mouseleave', function () {
        if (lastPointerType !== 'mouse') return;
        scheduleHide(wrap);
      });
    }

    // tap-to-toggle for touch/pen; mouse is driven by hover above
    trigger.addEventListener('click', function (e) {
      if (lastPointerType === 'mouse') return;
      e.stopPropagation(); // don't trip the outside-tap handler
      cancelHide(wrap);
      toggle(wrap);
    });

    // keyboard focus opens; skip when the focus came from a pointer so a tap
    // doesn't both focus-show and click-toggle the bubble back shut.
    wrap.addEventListener('focusin', function () {
      if (pointerActed) return;
      show(wrap);
    });
    wrap.addEventListener('focusout', function (e) {
      var to = e.relatedTarget;
      if (!to || !wrap.contains(to)) hide(wrap);
    });
  }

  function scan(root) {
    var wraps = (root || document).querySelectorAll(WRAP_SELECTOR);
    for (var i = 0; i < wraps.length; i++) bind(wraps[i]);
  }

  function init() {
    scan(document);

    // outside click/tap closes any open tooltip. Harmless for mouse (hover
    // already closed it on leave); a tap on a trigger calls stopPropagation so
    // it never reaches here, and a click inside a wrap is ignored by closest().
    document.addEventListener('click', function (e) {
      if (!closest(e.target, WRAP_SELECTOR)) hideAll(null);
    });

    // Escape closes any open tooltip
    document.addEventListener('keydown', function (e) {
      var key = e.key || e.keyCode;
      if (key === 'Escape' || key === 'Esc' || key === 27) hideAll(null);
    });

    // wire up tooltips injected after load (e.g. Finsweet table rows)
    if (window.MutationObserver) {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (!node || node.nodeType !== 1) continue;
            if (matches(node, WRAP_SELECTOR)) bind(node);
            if (node.querySelectorAll) scan(node);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* FAQ deep-link opener
 *
 * Some hash links (CTAs etc.) scroll the page down to the FAQ section. To stop
 * the fixed navbar from covering the targeted question, the scroll target is
 * set in Webflow to the FAQ *above* the one we actually want to read (Webflow
 * scroll-spy interactions can't add a scroll offset). So when one of those
 * links is clicked, we open the NEXT FAQ dropdown after the scroll target.
 *
 * FAQs are Webflow native dropdowns:
 *   .faq_dd (.w-dropdown)
 *     .faq_dd_toggle (.w-dropdown-toggle)   <- the clickable bar
 *     .faq_dd_list   (.w-dropdown-list)     <- the answer
 *
 * We open one by replaying mousedown/mouseup/click on the toggle so Webflow's
 * own dropdown handler runs and keeps its internal open/closed state in sync —
 * the user can then still collapse it with a single click. Simply forcing the
 * `w--open` class would desync that state.
 *
 * ES5 only (var / no arrow functions) for browser compatibility.
 */
(function () {
  'use strict';

  var FAQ_SELECTOR = '.faq_dd';
  var TOGGLE_SELECTOR = '.faq_dd_toggle';
  var SECTION_SELECTOR = '.faq-section';
  var OPEN_CLASS = 'w--open';
  // let the link's own click finish first — Webflow closes any open dropdown on
  // an outside click, so opening on the next tick avoids being closed instantly.
  var OPEN_DELAY = 80; // ms

  function matches(el, selector) {
    if (!el || el.nodeType !== 1) return false;
    var fn =
      el.matches ||
      el.webkitMatchesSelector ||
      el.msMatchesSelector ||
      el.mozMatchesSelector;
    return fn ? fn.call(el, selector) : false;
  }

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if (matches(el, selector)) return el;
      el = el.parentNode;
    }
    return null;
  }

  // First FAQ dropdown that appears AFTER the scroll target in document order.
  // If the target is itself a FAQ, this returns the one below it; if the target
  // is inside a FAQ, the FAQ containing it is skipped (it "contains", doesn't
  // "follow"), so we still land on the next one.
  function firstFollowingFaq(target) {
    var faqs = document.querySelectorAll(FAQ_SELECTOR);
    for (var i = 0; i < faqs.length; i++) {
      // 4 = Node.DOCUMENT_POSITION_FOLLOWING
      if (target.compareDocumentPosition(faqs[i]) & 4) return faqs[i];
    }
    return null;
  }

  function fire(el, type) {
    var ev;
    try {
      ev = new MouseEvent(type, { bubbles: true, cancelable: true, view: window });
    } catch (e) {
      ev = document.createEvent('MouseEvents');
      ev.initEvent(type, true, true);
    }
    el.dispatchEvent(ev);
  }

  function openFaq(faq) {
    if (!faq) return;
    var toggle = faq.querySelector(TOGGLE_SELECTOR);
    if (!toggle) return;
    if (toggle.className.indexOf(OPEN_CLASS) !== -1) return; // already open
    fire(toggle, 'mousedown');
    fire(toggle, 'mouseup');
    fire(toggle, 'click');
  }

  function resolveTarget(hash) {
    if (!hash || hash.charAt(0) !== '#' || hash === '#') return null;
    var id = hash.slice(1);
    return document.getElementById(id);
  }

  function onClick(e) {
    var link = closest(e.target, 'a[href^="#"]');
    if (!link) return;
    var target = resolveTarget(link.getAttribute('href'));
    if (!target) return;
    // only react to links that scroll into the FAQ area
    if (!matches(target, FAQ_SELECTOR) && !closest(target, SECTION_SELECTOR)) return;
    var faq = firstFollowingFaq(target);
    if (!faq) return;
    window.setTimeout(function () {
      openFaq(faq);
    }, OPEN_DELAY);
  }

  document.addEventListener('click', onClick, false);
})();
