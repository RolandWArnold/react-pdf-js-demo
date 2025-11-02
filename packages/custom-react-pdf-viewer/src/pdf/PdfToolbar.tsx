// packages/custom-react-pdf-viewer/src/pdf/PdfToolbar.tsx
import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import type { FunctionComponent } from 'react';
import type { ToolbarProps } from './ToolbarInterface';
// 1. Import the RENAMED CSS module
import styles from '../css/PdfToolbar.module.css';

export const PdfToolbar: FunctionComponent<ToolbarProps> = ({
  showFileName,
  fileName,
  pdfManager,
  jumpToPage,
}) => {
  const [numPages, setNumPages] = useState(1);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [canGoToPreviousPage, setCanGoToPreviousPage] = useState(true);
  const [canGoToNextPage, setCanGoToNextPage] = useState(true);
  const [currentScale, setCurrentScale] = useState(100);
  const [canZoomOut, setCanZoomOut] = useState(true);
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [isToolbarRendered, setIsToolbarRendered] = useState<boolean>(false);
  const zoomRef = useRef<HTMLDivElement | null>(null);

  // 2. ALL find bar refs are REMOVED

  const [inputValue, setInputValue] = useState(`${currentPageNumber}`);

  const toolbarRefInDom = useCallback((node: HTMLDivElement | null) => {
    setIsToolbarRendered(false);
    if (node !== null) {
      setIsToolbarRendered(true);
      zoomRef.current = node;
    }
  }, []);

  useEffect(() => {
    pdfManager?.registerHandlers({
      setNumPages,
      setCurrentPageNumber,
      setCanGoToPreviousPage,
      setCanGoToNextPage,
      setCurrentScale,
      setCanZoomOut,
      setCanZoomIn,
    });
  }, [pdfManager, fileName]);

  useEffect(() => {
    setCurrentPageNumber(1);
    setCurrentScale(100);
  }, [pdfManager, fileName]);

  useEffect(() => {
    setCanGoToPreviousPage(currentPageNumber > 1);
    setCanGoToNextPage(currentPageNumber < numPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageNumber, numPages]);

  useEffect(() => {
    setCanZoomIn(currentScale < 200);
    setCanZoomOut(currentScale > 25);
  }, [currentScale]);

  useEffect(() => {
    const isNumber = parseInt(inputValue);
    if (isNaN(isNumber)) {
      setCurrentPageNumber(0);
      return;
    }
    setCurrentPageNumber(isNumber);
  }, [inputValue]);

  useEffect(() => {
    if (jumpToPage && typeof jumpToPage === 'number' && !isNaN(jumpToPage)) {
      pdfManager?.handleGoToPage(jumpToPage);
      setCurrentPageNumber(jumpToPage);
    }
  }, [jumpToPage, pdfManager]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (zoomRef.current && pdfManager?.isPdfLoaded) {
        setCurrentScale(100);
        pdfManager?.resetZoom();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToolbarRendered, pdfManager]);

  // 3. The useEffect to create PDFFindBar is REMOVED

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = parseInt(inputValue, 10);
      if (!isNaN(value) && value > 0) {
        pdfManager?.handleGoToPage(value);
      }
    }
  };

  const handleZoomIn = () => {
    pdfManager?.handleZoomIn();
    setCurrentScale(Math.ceil(100 * 0.25 + currentScale));
  };

  const handleZoomOut = () => {
    pdfManager?.handleZoomOut();
    setCurrentScale(Math.ceil(currentScale - 100 * 0.25));
  };

  const handleToggleFindBar = () => { console.log('toggle click', pdfManager); pdfManager?.toggleFindBar(); };

  return (
    <div className={styles.toolbarContainer} ref={toolbarRefInDom}>
      <div className={styles.toolbarMain}>
        <div className={styles.toolbarFileInfo}>
          <span title={fileName}>
            {showFileName ? fileName : ''}
          </span>
        </div>

        {numPages > 0 && (
          <>
            <div className={styles.toolbarControl}>
              <button onClick={pdfManager?.handlePreviousPage} disabled={!canGoToPreviousPage}>
                Prev
              </button>
              <input
                value={currentPageNumber <= 0 ? '' : `${currentPageNumber}`}
                type="number"
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
              <span>/ {numPages}</span>
              <button onClick={pdfManager?.handleNextPage} disabled={!canGoToNextPage}>
                Next
              </button>
            </div>

            <div className={styles.toolbarZoomControl}>
              <button onClick={handleZoomOut} disabled={!canZoomOut}>
                -
              </button>
              <span>{currentScale}%</span>
              <button onClick={handleZoomIn} disabled={!canZoomIn}>
                +
              </button>
            </div>
            <div className={styles.toolbarRight}>
              <button
                onClick={handleToggleFindBar}
                className={styles.toolbarFindToggle}
                title="Find in Document"
              >
                <span>Find</span>
              </button>
            </div>
          </>
        )}
      </div>
     </div>
   );
 };