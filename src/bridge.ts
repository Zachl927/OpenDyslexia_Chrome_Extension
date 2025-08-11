// This script is injected into the main world to bridge the gap between the
// page's context and the content script's isolated world.

// Define a global interface to keep TypeScript happy
declare global {
  interface Window {
    applyStyles: (fontSize: number, spacing: number, lineHeight: number) => void;
    updateStyles: (fontSize: number, spacing: number, lineHeight: number) => void;
    removeStyles: () => void;
  }
}

// Expose the functions to the main world
window.applyStyles = (fontSize, spacing, lineHeight) => {
  window.postMessage({ type: 'APPLY_STYLES', payload: { fontSize, spacing, lineHeight } }, '*');
};

window.updateStyles = (fontSize, spacing, lineHeight) => {
  window.postMessage({ type: 'UPDATE_STYLES', payload: { fontSize, spacing, lineHeight } }, '*');
};

window.removeStyles = () => {
  window.postMessage({ type: 'REMOVE_STYLES' }, '*');
};

