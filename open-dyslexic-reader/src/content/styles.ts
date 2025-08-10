export function buildCss(
  fontSize = 1.0,          // multiplier
  spacing = 0,             // px
  lineHeight = 1.4         // multiplier
): string {
  const base = chrome.runtime.getURL;
  return `
    /* 1) Register fonts */
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('${base('fonts/OpenDyslexic-Regular.woff2')}') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('${base('fonts/OpenDyslexic-Bold.woff2')}') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'OpenDyslexic';
      src: url('${base('fonts/OpenDyslexic-Italic.woff2')}') format('woff2');
      font-weight: 400;
      font-style: italic;
      font-display: swap;
    }

    /* 2) Apply to readable text, exclude icons/code/math */
    html, body, body *:not(svg):not(canvas):not(code):not(pre)
                       :not(.MathJax):not(.katex)
                       :not(.material-icons):not([class*="fa-"])
                       :not(.fa):not(.fas):not(.far):not(.fab) {
      font-family: 'OpenDyslexic', system-ui, -apple-system, Arial, sans-serif !important;
      font-size: ${fontSize}em !important;
      line-height: ${lineHeight}em !important;
      letter-spacing: ${spacing}px !important;
    }
  `;
}
