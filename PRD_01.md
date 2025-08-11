# PRD — OpenDyslexic Page Reader (Chrome/Chromium Extension)
Stage: MVP build (font swap only; paid features deferred)
Platforms: Chromium-based browsers (Chrome, Edge, Brave, Arc).
Modes: Light/Dark mirrors system.

## 1) Problem & Goals

*Problem*
Dyslexic readers (esp. students/educators) often struggle with default web typography. Manually adjusting per site is tedious, and accessibility features are inconsistent.

*Goal (MVP)*
One-click readability: Click the extension → convert all readable text on the current page to OpenDyslexic (Regular/Bold/Italic), with revert support and quick sizing/spacing controls. Works across typical content sites without breaking UI or iconography.

*Non-Goals (MVP)*
- No AI features (summarization, quizzes) in MVP UI or code path.
- No account/auth, billing, or backend yet.
- No Firefox/Safari yet.



## 2) Personas & Use Cases
- Student (primary): Reads articles, PDFs in HTML viewers, learning platforms. Wants quick toggle per page and per-site persistence.
- Educator (secondary): Demonstrates or recommends to students; needs predictable, non-breaking behavior.


### Top tasks
- Toggle font to OpenDyslexic on a page.
- Adjust font size, letter spacing, and line height.
- Persist preference per-site and globally.
- Revert easily if layout breaks.



## 3) Scope & Feature Set (MVP)

### 3.1 Core: Font Override
- *Action:* Clicking toolbar icon toggles ON/OFF for the active tab.
- *When ON:* Inject CSS + runtime logic to convert readable text to OpenDyslexic.
- *Controls:* Popup mini menu
    - Font size: -/default/+
    - Letter spacing: Normal / +0.02em / +0.04em
    - Line height: 1.4 / 1.6 / 1.8
- *Persistence:*
    - Global default (OFF initially).
    - Per-site remembered state (on/off) + last used size/spacing for that site.
- *Exclusions:* Do not change fonts for icon sets (Font Awesome, Material Icons), emojis, logos, <code>/<pre>, math (MathJax/LaTeX), SVG/canvas text.
- *Dynamic pages:* MutationObserver keeps new nodes styled.


### 3.2 Typography Assets
- Bundled fonts: OpenDyslexic Regular, Italic, Bold (woff2) packaged in extension.
- CSS: @font-face with fallback stack.
- Selection: Always prefer OpenDyslexic; fall back to system fonts if load fails.

### 3.3 Site Management
- Per-site toggle in popup.
- *Options page:*
    - Global default state (OFF/ON).
    - Manage site allow/block list.
    - Default size/spacing/line-height.
    - “Reset all settings.”

### 3.4 Safety & Recovery
- Safe mode: “Exclude this site” quick action in popup if the page breaks.
- Keyboard shortcut: Alt+D toggle (user-changeable in chrome://extensions/shortcuts).
- No content leaves device (MVP).

### 3.5 Performance
- Inject within <150 ms after DOM ready on typical news/article pages.
- Keep CPU usage trivial during idle; throttle MutationObserver updates.

## 4) Phase 2 (Deferred) — Paid AI Features (Design Spec Only)
Not shipped in MVP, but documenting now for coherence.

### 4.1 Summarization
- Provider: Gemini.
- Scope: Main article content only (via Readability extraction).
- Output: 5–10 bullets + TL;DR; in page language; local-only history; privacy guardrails (confirm send, domain blacklist).
- Key mgmt: TBD (proxy vs. local).
- Cost controls: Token caps; caching per URL.

### 4.2 Reading Quiz
- Question types: Multiple Choice + True/False (no trick questions).
- Count: 5–10 based on text length (longer → more).
- Target: Comprehension (not vocabulary puzzles).
- Grading: Auto-grade; show explanations referencing source sentences.
- Data: No account storage; local-only.

### 4.3 Monetization (future)
- Model: One-time $5 for font swap; monthly subscription for AI features (Stripe).
- Auth: Google Sign-In.
- Note: Chrome Web Store no longer processes payments → use external site + license entitlements.

## 5) User Experience

### 5.1 Popup (Toolbar)
- Header: On/Off toggle + current domain.
- *Controls:*
    - Font Size: Small / Default / Large (e.g., 0.95x / 1.0x / 1.1x / 1.2x via stepper).
    - Letter Spacing: 0 / +0.02em / +0.04em.
    - Line Height: 1.4 / 1.6 / 1.8.
- Links: “Exclude this site,” “Options,” “Report issue.”


### 5.2 Options Page
- Global default (OFF/ON).
- Per-site list (toggle, remove).
- Defaults for size, spacing, line height.
- Reset all.
- Theme: mirrors system (light/dark).


### 5.3 States
- ON (site): Badge tinted; popup shows site is ON.
- OFF (site): Badge normal.
- Excluded: Badge shows small strike indicator; popup shows “Excluded.”

## 6) Functional Requirements (MVP)

### 6.1 Manifest & Permissions
- Manifest v3
- Permissions: storage, scripting, activeTab
- Host permissions: "<all_urls>" (to support per-site persistence and auto-apply).
- Optional: declarativeContent (if used for auto-apply rules).

### 6.2 Content Injection
- *Approach:*
    1. Inject @font-face CSS for bundled OpenDyslexic.
    2. Apply font-family: "OpenDyslexic", system-ui, sans-serif !important; broadly.
    3. Exclusion selectors and heuristics to avoid icons/code.
    4. MutationObserver to restyle added nodes (throttled to 60–120ms with requestIdleCallback fallback).
- *Selectors (starting point):*
    - Base: html, body, body *:not(svg):not(canvas)
    - Exclude likely icon classes/attributes:
        - [class*="fa-"], .fa, .fas, .far, .fab, .material-icons, .icon, [aria-hidden="true"]
    - Exclude code/math: code, pre, kbd, samp, .MathJax, .katex
    - Exclude inputs/buttons if they break layout? → Do not force on form controls by default; apply to labels/placeholders only.
- *Heuristic checks:*
    - Skip elements whose computed font family is an icon font.
    - Skip zero-width / decorative pseudo-elements.

### 6.3 Shadow DOM & iFrames
- Shadow DOM: Try adoptedStyleSheets for open shadows when accessible.
- iFrames: Same-origin → inject; cross-origin → best-effort (limited by Chrome security).
- Fallback: Don’t error; mark as “partially styled.”

### 6.4 Persistence
- Storage: chrome.storage.sync for settings + per-site map { origin: { enabled, size, spacing, lineHeight } }.
- Global default: OFF.
- Apply logic:
    - On tab update/activated: check site preference; auto-inject if enabled.

### 6.5 Accessibility
- Screen readers: No ARIA changes in MVP; fonts shouldn’t affect SR output.
- Contrast: Respect page colors; do not forcibly recolor (MVP).
- Reduced motion: No animations in core actions.

### 6.6 Error Handling
- If CSS injection fails, show non-blocking toast in popup with “Try again / Exclude site.”
- Record minimal error info locally (no PII) for “Report issue” prefill.

## 7) Technical Architecture
- *Stack:* TypeScript, MV3, Vite (or Webpack), React for popup & options.
- *Modules:*
    - background (service worker): manages site state, tab lifecycle.
    - content-script: CSS injection, mutation observer, exclusions.
    - ui (popup/options): React + local state.
    - storage: typed wrapper over chrome.storage.sync.
    - telemetry (stub, disabled by default; add opt-in later).
- *Build & Release:*
    - GitHub repo with Actions: lint, typecheck, build, zip artifact.
    - Release channels: manual upload to Chrome Web Store; test via developer mode zips.
- *Performance Budgets:*
    - Injection <150ms post-DOM ready on medium pages.
    - MutationObserver callback ≤3ms average per batch.

## 8) QA Plan

### 8.1 Test Matrix
- *Sites:*
    - News/articles (NYT, BBC clones), blogs (Medium-like), LMS pages, Google Docs (view mode), Wikipedia, GitHub (code pages to verify exclusions), icon-heavy dashboards.
- *Browsers:* Latest Chrome, Edge, Brave, Arc (current stable).
- *Themes:* Light/Dark system.
- *Locales*:* English + at least one RTL page (Hebrew/Arabic) to validate layout.

### 8.2 Scenarios
1. Toggle ON/OFF on same page; ensure revert restores original fonts.
2. Adjust size/spacing/line-height; persist per-site.
3. Navigate within same origin; ensure auto-apply works.
4. Refresh; ensure settings persist.
5. Icon sets remain unchanged; code blocks remain monospace.
6. Dynamic content (infinite scroll) retains font.
7. Cross-origin iframe → extension should not hang or error.
8. “Exclude this site” prevents auto-apply; badge indicates state.

### 8.3 Acceptance Criteria (MVP)
- AC1: Toggling ON applies OpenDyslexic to ≥95% of readable text nodes on typical article pages without altering icons/logos/code.
- AC2: Revert fully removes extension styling with no residual overrides.
- AC3: Size/spacing/line-height changes apply immediately and persist for site.
- AC4: Auto-apply per-site works after reload and on same-origin navigations.
- AC5: Injection time meets budget on test pages.
- AC6: No content leaves device; no network calls in MVP.
- AC7: No console errors in happy path.

## 9) Privacy & Security (MVP)
- Data flow: All logic runs locally; no remote calls.
- Storage: Minimal settings in chrome.storage.sync.
- Reporting: “Report issue” composes a prefilled email/text blob; no automatic upload.
- Future (AI): Add explicit confirmation before sending content; maintain domain blacklist; allow “Sensitive sites exclusion” toggle.

## 10) Monetization & Licensing
- MVP: You can ship free to build traction or charge one-time $5 for the font feature. (If charging at MVP: implement a lightweight license gate using Stripe + hosted web checkout; store local license token; do entitlement check with a tiny backend or local signed token.)
- Note: Chrome Web Store no longer supports in-store payments → you must handle Stripe externally.

## 11) Telemetry (Deferred)
- Start with no telemetry in MVP.
- Later add opt-in anonymous metrics (feature usage/error counts) via a privacy-respecting tool or self-hosted PostHog. Provide “Delete all data” button.

## 12) Risks & Mitigations
- Risk: Breaking site layouts (icon fonts, web apps).
    - Mitigation: Conservative exclusion selectors; easy “Exclude this site”; quick revert.
- Risk: Performance regressions on script-heavy pages.
    - Mitigation: Throttled observers; batched updates.
- Risk: Cross-origin iframes unstyled → uneven look.
    - Mitigation: Best-effort note; don’t block.
- Risk: RTL pages / CJK typography quirks.
    - Mitigation: Test sample pages; consider per-language overrides later.

## 13) Open Questions
- Name & icon (branding).
- Default behavior on first run: Show a 1-screen onboarding or stay silent?
- Exact size/spacing steps: Are the proposed increments comfortable for you?
- Form controls: Do you want fonts applied to inputs/buttons or keep system UI?
- MVP pricing: Free vs. one-time $5 at launch? (You set $5; confirm for first release.)
- Accessibility audits: Any target to test with NVDA/VoiceOver?
- Content boundaries for AI (when built): domains to always block?

## 14) Implementation Plan (MVP)
- Part 1
    - Project scaffold (MV3 + TS + React + Vite).
    - Popup & options skeleton; storage module; manifest.
    - Bundle OpenDyslexic woff2.
- Part 2
    - Content script: CSS injection, exclusions, mutation observer.
    - Popup controls wiring; site state management in background.
    - Keyboard shortcut; per-site persistence.
- Part 3
    - Options page (lists & defaults).
    - Safe-mode / Exclude site flow.
    - Performance tuning & basic QA matrix.
- Part 4
    - Beta testing on 20–30 varied pages.
    - Fixes, polish, store assets (listing, screenshots, description).
    - Ship to Chrome Web Store (manual review).

## 15) Engineering Notes & Pseudocode Snippets

### Inject CSS (simplified)
// content-script
const css = `
@font-face {
  font-family: 'OpenDyslexic';
  src: url('${chrome.runtime.getURL('fonts/OpenDyslexic-Regular.woff2')}') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
/* add bold/italic similarly */

html, body, body *:not(svg):not(canvas):not(code):not(pre):not(.MathJax):not(.katex):not(.material-icons):not(.icon):not([class*="fa-"]):not(.fa):not(.fas):not(.far):not(.fab) {
  font-family: 'OpenDyslexic', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif !important;
}
`;

### Mutation Observer (throttled)
const queue = new Set<Node>();
const observer = new MutationObserver(muts => {
  for (const m of muts) for (const n of m.addedNodes) queue.add(n);
  schedule();
});
function schedule() {
  if ((schedule as any).pending) return;
  (schedule as any).pending = true;
  requestIdleCallback(() => {
    // walk queued nodes, apply exclusions, set inline font-family if needed
    queue.clear();
    (schedule as any).pending = false;
  }, { timeout: 120 });
}
observer.observe(document.documentElement, { childList: true, subtree: true });


## 16) Store Listing (Draft)
- *Title:* OpenDyslexic Page Reader — One-Click Dyslexia Font
- *Short description:* Instantly switch any page to the OpenDyslexic typeface. Adjustable size & spacing. One click to read with ease.
- *Long description (highlights):*
    - One-click ON/OFF with per-site memory
    - Bundled OpenDyslexic (Regular/Bold/Italic)
    - Quick controls for size, spacing, line height
    - Safe on icons, code, math, logos
    - *Privacy-friendly:* all local, no data sent
        - Screenshots: Popup, options, before/after on article page.
        - Privacy: No data collection in MVP.

## 17) Definition of Done (MVP)
- Font swap & revert work reliably on test matrix
- Popup controls functional and persist per-site/global
- Exclusions prevent icon/code breakage
- Performance budget met
- No network calls; privacy statement accurate
- Store assets prepared; extension passes review

# TL;DR
Build an MV3 Chromium extension that toggles OpenDyslexic across pages with quick size/spacing controls, per-site memory, solid exclusions (icons/code/math), <150ms inject time, and local-only privacy. Paid AI features (Gemini summaries + MCQ/T-F quizzes) are specified for Phase 2 but not in MVP.