import 'pdfjs-dist/web/pdf_viewer.css';

// Export the component
export { CustomPdfViewer } from './pdf/CustomPdfViewer';

// Export the State Adapter Helper
export { createLocalStorageAdapter } from './adapters/createLocalStorageAdapter';

// Export the Context Adapter Helper
export { createContextAdapter } from './adapters/createContextAdapter';

// TODO: update serialization/deserialization of PDF state. Fix at very least the drop-down for the scaling. Ideally have proper scaling options to match PDF.js.
// Fix the precise location of the scrolling/etc. when restoring state.