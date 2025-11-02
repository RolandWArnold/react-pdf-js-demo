# custom-react-pdf-viewer

[![npm version](https://img.shields.io/npm/v/custom-react-pdf-viewer.svg)](https://www.npmjs.com/package/custom-react-pdf-viewer)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A lightweight React wrapper around PDF.js that includes a fully featured toolbar and find bar.

This package provides a `CustomPdfViewer` component that handles rendering, page navigation, zoom, and text search, with sane defaults and CSS custom properties for easy styling.

## Features

* **Full Toolbar:** Page navigation, page number input, and zoom controls.
* **Find Bar:** `Ctrl+F` support, "Highlight All," "Match Case," and other standard find controls.
* **Simple API:** Just pass a `blobUrl` to the component.
* **Custom Styling:** Use CSS custom properties to override default styles.
* **TypeScript:** Written in TypeScript with types included.

## Screenshot

![custom-react-pdf-viewer demo](https://raw.githubusercontent.com/RolandWArnold/custom-react-pdf-viewer/refs/heads/main/assets/screenshot-1.png)

## Installation

```bash
npm install custom-react-pdf-viewer pdfjs-dist
```

This package lists `react`, `react-dom`, and `pdfjs-dist` as peer dependencies. You must install them yourself. This package is tested with `pdfjs-dist@4.2.67`.

Usage
You must import the component.

```typescript
// src/App.tsx
import { useEffect, useState } from "react";
import { CustomPdfViewer } from "custom-react-pdf-viewer";

export default function App() {
  // We just need to store the blob itself, or null
  const [file, setFile] = useState<Blob | null>(null);

  useEffect(() => {
    (async () => {
      // Fetch and get the blob
      const res = await fetch("/sample.pdf");
      const blob = await res.blob();
      setFile(blob);
    })();
  }, []);

  if (!file) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <CustomPdfViewer
        fileName="sample.pdf"
        file={file}
      />
    </div>
  );
}
```

## Component Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| **`file`** | `Blob | null` | **Required.** The `File` or `Blob` object of the PDF. The component will handle creating and revoking the blob URL. |
| `fileName` | `string` | Optional. The name to display in the toolbar. |
| `isLoading` | `boolean` | Optional. Set to `true` to display the loading bar. Set to `false` when the `blobUrl` is ready. |

## Styling

You can override the default colors and styles by setting these CSS custom properties in your own stylesheet:

```css
/* Example styling overrides */
:root {
  /* Toolbar */
  --rpjv-toolbar-bg: #f9f9fa;
  --rpjv-toolbar-border-color: #b8b8b8;
  --rpjv-main-color: #181819;

  /* Find Bar */
  --rpjv-findbar-bg: #f9f9fa;
  --rpjv-findbar-border-color: #b8b8b8;

  /* Buttons */
  --rpjv-button-hover-color: #ddd;
  --rpjv-toggled-btn-bg: #00000033;
  --rpjv-toggled-btn-color: #000;

  /* Form Fields */
  --rpjv-field-border-color: #bbb;
  --rpjv-field-bg-color: white;
  --rpjv-field-color: #060606;

  /* Viewer */
  --rpjv-container-bg: #f2f2f2;
  --rpjv-viewer-bg: #f1f5f9;
}
```

---

## 📜 License

This project is licensed under the Apache License, Version 2.0.

---