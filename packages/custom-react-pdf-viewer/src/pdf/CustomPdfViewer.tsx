// packages/custom-react-pdf-viewer/src/pdf/CustomPdfViewer.tsx
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFViewer, EventBus, PDFLinkService, PDFFindController } from 'pdfjs-dist/web/pdf_viewer.mjs';
import { PdfToolbar } from './PdfToolbar';
import { PdfFindBar } from './PdfFindBar';
import type { ToolbarProps } from './ToolbarInterface';
import PdfManager from './PdfManager';
import styles from '../css/CustomPdfViewer.module.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface CustomPdfViewerProps {
  fileName?: string;
  file: Blob | null;
  highlightInfo?: { [key: number]: string } | null;
  jumpToPage?: number | null;
}

export const CustomPdfViewer: FC<CustomPdfViewerProps> = ({
  fileName,
  file, // Use the new prop
  highlightInfo,
  jumpToPage,
}) => {
  const [pdfManager] = useState(() => new PdfManager());
  const viewerRef = useRef<HTMLDivElement>(null);

  const [internalIsLoading, setInternalIsLoading] = useState(true);
  const [internalBlobUrl, setInternalBlobUrl] = useState<string | null>(null);

  // This effect manages the blob URL lifecycle
  useEffect(() => {
    if (!file) {
      setInternalIsLoading(true);
      return;
    }

    setInternalIsLoading(false);

    const blobUrl = URL.createObjectURL(file);
    setInternalBlobUrl(blobUrl);

    return () => {
      URL.revokeObjectURL(blobUrl);
      setInternalBlobUrl(null); // Clear the URL
    };
  }, [file]); // Re-run whenever the file prop changes

  // This effect initializes the PdfManager
  useEffect(() => {
    // Wait for the internalBlobUrl to be set
    if (internalIsLoading || !viewerRef.current || !internalBlobUrl) {
      return;
    }

    let initialPageNo = 1;
    const queryParams = new URLSearchParams(window.location.search);
    const qPage = Number(queryParams.get('page'));
    if (qPage && !isNaN(qPage)) {
      initialPageNo = qPage;
    }

    pdfManager.initViewer(viewerRef.current, EventBus, PDFLinkService, PDFFindController, PDFViewer, internalBlobUrl, initialPageNo);

    // Tell the manager the PDF is ready
    setInternalIsLoading(false);

    return () => {
      pdfManager?.unmount();
    };
  }, [internalBlobUrl, pdfManager, internalIsLoading]); // Depend on internal state

  useEffect(() => {
    if (internalIsLoading || !viewerRef.current || !internalBlobUrl) {
      return;
    }
    pdfManager.setActiveHighlight(highlightInfo);
  }, [highlightInfo, pdfManager, internalIsLoading, internalBlobUrl]);

  const toolbarProps: ToolbarProps = { showFileName: false, fileName, pdfManager, jumpToPage };

  return (
    <div className={styles.container}>
      <PdfToolbar {...toolbarProps} />
      {pdfManager.eventBus && <PdfFindBar eventBus={pdfManager.eventBus} />}

      {/* Use internal loading state */}
      {internalIsLoading ? (
        <div className={styles.loader}>
          <div className={styles.loaderBar} />
        </div>
      ) : (
        <div className={`${styles.viewer} pdfViewer`} ref={viewerRef} />
      )}
    </div>
  );
};