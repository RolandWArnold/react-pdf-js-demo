import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFViewer, EventBus, PDFLinkService, PDFFindController } from 'pdfjs-dist/web/pdf_viewer.mjs';
import { PdfToolbar } from './PdfToolbar';
import type { ToolbarProps } from './ToolbarInterface';
import PdfManager from './PdfManager';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// #isSameScale(newScale) {
//   return newScale === this._currentScale || Math.abs(newScale - this._currentScale) < 1e-15;
// }

interface CustomPdfViewerProps {
  // uniqueIdentifier: string;
  fileName?: string;
  blobUrl: string;
  isLoading?: boolean;
  highlightInfo?: { [key: number]: string } | null;
  jumpToPage?: number | null;
}

export const CustomPdfViewer: FC<CustomPdfViewerProps> = ({
  isLoading = true,
  // uniqueIdentifier,
  fileName,
  blobUrl,
  highlightInfo,
  jumpToPage,
}) => {
  const [pdfManager] = useState(() => new PdfManager());
  const viewerRef = useRef<HTMLDivElement>(null);
  const [pdfFileName, setPdfFileName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!viewerRef.current || !blobUrl) return;
    let initialPageNo = 1;
    const queryParams = new URLSearchParams(window.location.search);
    const qPage = Number(queryParams.get('page'));
    if (qPage && !isNaN(qPage)) {
      initialPageNo = qPage;
    }
    pdfManager.initViewer(viewerRef.current, EventBus, PDFLinkService, PDFFindController, PDFViewer, blobUrl, initialPageNo);
    setPdfFileName(fileName);

    return () => {
      pdfManager?.unmount();
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl, pdfManager]);

  useEffect(() => {
    if (!viewerRef.current || !blobUrl) return;
    pdfManager.setActiveHighlight(highlightInfo);
  }, [highlightInfo, blobUrl, pdfManager]);

  const toolbarProps: ToolbarProps = { showFileName: false, fileName: pdfFileName, pdfManager, jumpToPage };

  return (
    <div className="pdf-viewer-container">
      <PdfToolbar {...toolbarProps} />
      {isLoading ? (
        <div className="pdf-viewer-loader">
          <div className="pdf-viewer-loader-bar" />
        </div>
      ) : (
        <div className="pdfViewer" ref={viewerRef} />
      )}
    </div>
  );
};

export default CustomPdfViewer;
