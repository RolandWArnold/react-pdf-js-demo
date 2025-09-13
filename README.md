# Custom PDF Viewer (React + Vite + pdf.js)

A small, self-contained demo that renders PDFs with Mozilla pdf.js and a custom toolbar
(Prev/Next, page jump, zoom, and find bar) in React + TypeScript.

## Quick start
```bash
yarn install
yarn dev
# open the printed URL
```

## Build / Preview
```bash
yarn build && yarn preview
# then open http://localhost:4173
```

## Key files

- `src/pdf/CustomPdfViewer.tsx` — React wrapper + pdf.js worker config
- `src/pdf/PdfManager.ts` — pdf.js wiring (EventBus, Viewer, LinkService, FindController)
- `src/pdf/PdfToolbar.tsx` — toolbar controls
- `src/assets/*` — viewer icons from pdf.js
- `public/sample.pdf` — demo document (replace with your own as needed)

## License

Apache-2.0 © 2025 Roland Arnold (see LICENSE).
This project bundles Apache-2.0 components from Mozilla PDF.js (see NOTICE).
See THIRD_PARTY_LICENSES.md for other dependencies.