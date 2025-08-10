/// <reference types="vite/client" />

interface Window {
  applyStyles: (fontSize: number, spacing: number, lineHeight: number) => void;
  updateStyles: (fontSize: number, spacing: number, lineHeight: number) => void;
  removeStyles: () => void;
}
