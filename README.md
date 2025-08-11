# OpenDyslexic for Chrome

This is a Chrome extension that applies the OpenDyslexic font to all web pages, making them more readable for users with dyslexia. The extension allows users to enable or disable the font on the fly and customize settings.

## Features

- Applies OpenDyslexic font to all text on websites.
- Simple popup to toggle the font on/off.
- Options page to configure settings (coming soon).
- Lightweight and fast.

## Getting Started

### Installation

1. Clone this repository or download the source code as a ZIP file.
2. Unzip the file if you downloaded it.
3. Open Google Chrome and navigate to `chrome://extensions`.
4. Enable "Developer mode" using the toggle in the top-right corner.
5. Click on the "Load unpacked" button.
6. Select the `dist` directory inside the project folder.
7. The extension should now be installed and visible in your extensions list.

### Usage

1. Click on the extension icon in the Chrome toolbar.
2. Use the popup to toggle the OpenDyslexic font on or off.

## Development

This project uses Vite, React, and TypeScript.

1. Clone the repository:
   ```bash
   git clone https://github.com/Zachl927/OpenDyslexia_Chrome_Extension.git
   ```
2. Navigate to the project directory:
   ```bash
   cd OpenDyslexia_Chrome_Extension
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. To build the extension for production, run:
   ```bash
   npm run build
   ```
   This will create a `dist` folder, which can be loaded as an unpacked extension in Chrome.
