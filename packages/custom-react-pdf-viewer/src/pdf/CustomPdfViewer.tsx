import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFViewer, EventBus, PDFLinkService, PDFFindController } from 'pdfjs-dist/web/pdf_viewer.mjs';
import { PdfToolbar } from './PdfToolbar';
import { PdfFindBar } from './PdfFindBar';
import type { ToolbarProps } from './ToolbarInterface';
import PdfManager, { ViewerConfig } from './PdfManager';
import styles from '../css/CustomPdfViewer.module.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

// === Simplified Adapter Interface ===
// The ID is now curried into the implementation by the parent.
export interface StateAdapter {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

export interface CustomPdfViewerProps {
  fileName?: string;
  file: Blob | null;
  highlightInfo?: { [key: number]: string } | null;
  jumpToPage?: number | null;

  // === Persistence ===
  stateAdapter?: StateAdapter;
}

export const CustomPdfViewer: FC<CustomPdfViewerProps> = ({
  fileName,
  file,
  highlightInfo,
  jumpToPage,
  stateAdapter,
}) => {
  const [pdfManager] = useState(() => new PdfManager());
  const viewerRef = useRef<HTMLDivElement>(null);
  const [eventBus, setEventBus] = useState<any>(null);
  const [internalIsLoading, setInternalIsLoading] = useState(true);
  const [internalBlobUrl, setInternalBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setInternalIsLoading(true);
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setInternalBlobUrl(blobUrl);
    return () => {
      URL.revokeObjectURL(blobUrl);
      setInternalBlobUrl(null);
    };
  }, [file]);

  useEffect(() => {
    if (!viewerRef.current || !internalBlobUrl) {
      return;
    }

    // === Hydration ===
    // Config is clean. We just ask the adapter.
    const config: ViewerConfig = {};

    // DISABLED FOR NOW
    if (stateAdapter && false) {
        // config.pageNumber = stateAdapter.get<number>('page');
        // config.scale = stateAdapter.get<string | number>('scale');
        // config.rotation = stateAdapter.get<number>('rotation');
    }

    // Query params override stored state
    const queryParams = new URLSearchParams(window.location.search);
    const qPage = Number(queryParams.get('page'));
    if (qPage && !isNaN(qPage)) {
        config.pageNumber = qPage;
    }

    pdfManager.initViewer(
        viewerRef.current,
        EventBus,
        PDFLinkService,
        PDFFindController,
        PDFViewer,
        internalBlobUrl,
        config
    );

    if (pdfManager.eventBus) {
        setEventBus(pdfManager.eventBus);

        const onPagesLoaded = () => setInternalIsLoading(false);
        pdfManager.eventBus.on('pagesloaded', onPagesLoaded);

        // === Persistence Listeners ===
        const handlePageChange = (evt: any) => {
            stateAdapter?.set('page', evt.pageNumber);
        };

        const handleScaleChange = (evt: any) => {
             const val = evt.presetValue || evt.scale;
             stateAdapter?.set('scale', val);
        };

        const handleRotationChange = (evt: any) => {
             stateAdapter?.set('rotation', evt.pagesRotation);
        };

        // DISABLED FOR NOW
        if (stateAdapter && false) {
            // pdfManager.eventBus.on('pagechanging', handlePageChange);
            // pdfManager.eventBus.on('scalechanging', handleScaleChange);
            // pdfManager.eventBus.on('rotationchanging', handleRotationChange);
        }

        return () => {
           pdfManager.eventBus?.off('pagesloaded', onPagesLoaded);
           pdfManager.eventBus?.off('pagechanging', handlePageChange);
           pdfManager.eventBus?.off('scalechanging', handleScaleChange);
           pdfManager.eventBus?.off('rotationchanging', handleRotationChange);
           pdfManager.unmount();
           setEventBus(null);
        };
    }

    return () => {
      pdfManager?.unmount();
      setEventBus(null);
    };
  }, [internalBlobUrl, pdfManager, stateAdapter]);

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
      {eventBus && <PdfFindBar eventBus={eventBus} />}
      {internalIsLoading && (
        <>
          <div className={styles.loader}>
            <div className={styles.loaderBar} />
          </div>
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
          </div>
        </>
      )}
      <div className={`${styles.viewer} pdfViewer`} ref={viewerRef} />
    </div>
  );
};