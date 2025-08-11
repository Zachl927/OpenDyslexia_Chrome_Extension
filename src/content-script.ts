console.log('OpenDyslexic content script loaded and listening.');

import { buildCss } from './content/styles';

let styleEl: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;
let pending = false;

// Store current style values so the observer can access them.
const current = {
  fontSize: 1,
  spacing: 0,
  lineHeight: 1.4,
};

function applyStyles(fontSize: number, spacing: number, lineHeight: number) {
  if (styleEl) {
    // If styles are already applied, update them instead of creating a new element.
    updateStyles(fontSize, spacing, lineHeight);
    return;
  }
  styleEl = document.createElement('style');
  styleEl.textContent = buildCss(fontSize, spacing, lineHeight);
  document.head.appendChild(styleEl);

  // Store current values and start the observer.
  current.fontSize = fontSize;
  current.spacing = spacing;
  current.lineHeight = lineHeight;
  startObserver();
}

function updateStyles(fontSize: number, spacing: number, lineHeight: number) {
  // Store the latest values.
  current.fontSize = fontSize;
  current.spacing = spacing;
  current.lineHeight = lineHeight;

  if (!styleEl) {
    // If styles are not applied, apply them now.
    applyStyles(fontSize, spacing, lineHeight);
    return;
  }
  styleEl.textContent = buildCss(fontSize, spacing, lineHeight);

  // After updating CSS text, force inline override for elements whose computed font is still not OpenDyslexic.
  // This is for elements with inline style="font-family: ...", which has higher specificity.
  // We run this during an idle period to avoid impacting performance.
  requestIdleCallback(forceInlineOverrides);
}

function isExcluded(el: Element): boolean {
  const tagName = el.tagName.toUpperCase();
  if (['SVG', 'CANVAS', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'META', 'LINK'].includes(tagName)) {
    return true;
  }

  const classList = el.classList;
  if (!classList || classList.length === 0) {
    return false;
  }

  const excludedClasses = ['MathJax', 'katex', 'material-icons', 'fa', 'fas', 'far', 'fab'];

  if (excludedClasses.some(cls => classList.contains(cls))) {
    return true;
  }

  // Check for [class*="fa-"] for Font Awesome
  for (let i = 0; i < classList.length; i++) {
    if (classList[i].startsWith('fa-')) {
      return true;
    }
  }

  return false;
}

function forceInlineOverrides() {
  // Use a targeted selector for performance.
  // Then, iterate and check if the element's computed font is not OpenDyslexic.
  Array.from(document.querySelectorAll('p, div, span, a, li, h1, h2, h3, h4, h5, h6, td, th, label, input, textarea, button')).forEach(el => {
    if (isExcluded(el as Element)) {
      return;
    }

    const cs = window.getComputedStyle(el as Element);

    // Only act if the font isn't OpenDyslexic and it's not inheriting from a styled parent.
    // This avoids redundant checks on child elements.
    if (cs.fontFamily && !cs.fontFamily.toLowerCase().includes('opendyslexic') && cs.fontFamily !== 'inherit') {
      (el as HTMLElement).style.setProperty('font-family', 'OpenDyslexic, ' + cs.fontFamily, 'important');
    }
  });
}

function removeStyles() {
  stopObserver();
  styleEl?.remove();
  styleEl = null;
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => {
    // For performance, just re-run updateStyles (CSS re-inserts) after a short debounce.
    if (!styleEl) return;
    if (pending) return;
    pending = true;
    requestIdleCallback(
      () => {
        if (styleEl) {
          updateStyles(current.fontSize, current.spacing, current.lineHeight);
        }
        pending = false;
      },
      { timeout: 200 },
    );
  });

  // The content script runs at document_end, so body should be available.
  // We add a listener as a fallback.
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        observer!.observe(document.body, { childList: true, subtree: true });
      }
    });
  }
}

function stopObserver() {
  observer?.disconnect();
  observer = null;
}

function getOrigin(): string {
  return location.hostname.toLowerCase();
}

// Listen for messages from the background script to dynamically update styles
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.action) {
    case 'SET_FONT':
      if (msg.enabled) {
        applyStyles(msg.fontSize, msg.spacing, msg.lineHeight);
      } else {
        removeStyles();
      }
      sendResponse({ status: 'ok' });
      break;
    case 'UPDATE_STYLE':
      updateStyles(msg.fontSize, msg.spacing, msg.lineHeight);
      sendResponse({ status: 'ok' });
      break;
  }
  // Keep the message channel open for async response
  return true;
});

// On initial content script load, get the settings for the current site
chrome.runtime.sendMessage(
  { action: 'GET_SETTINGS', site: getOrigin() },
  (res: {
    enabled: boolean;
    fontSize: number;
    spacing: number;
    lineHeight: number;
  }) => {
    if (chrome.runtime.lastError) {
      // console.error(`Could not get settings: ${chrome.runtime.lastError.message}`);
      return;
    }
    if (res?.enabled) {
      applyStyles(res.fontSize, res.spacing, res.lineHeight);
    }
  },
);

// The message listener below is for the bridge to communicate with the page's main world context.
// It is separate from the extension's internal messaging.
window.addEventListener('message', event => {
  // We only accept messages from ourselves
  if (event.source !== window || !event.data.type) {
    return;
  }

  const { type, payload } = event.data;

  switch (type) {
    case 'APPLY_STYLES':
      applyStyles(payload.fontSize, payload.spacing, payload.lineHeight);
      break;
    case 'UPDATE_STYLES':
      updateStyles(payload.fontSize, payload.spacing, payload.lineHeight);
      break;
    case 'REMOVE_STYLES':
      removeStyles();
      break;
  }
});

// Inject the bridge script into the main world
const script = document.createElement('script');
script.src = chrome.runtime.getURL('bridge.js');
(document.head || document.documentElement).appendChild(script);

script.onload = () => {
  script.remove();
};

if (import.meta.env.DEV) {
  window.applyStyles = applyStyles;
  window.updateStyles = updateStyles;
  window.removeStyles = removeStyles;
}
