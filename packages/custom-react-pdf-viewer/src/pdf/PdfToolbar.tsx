// packages/custom-react-pdf-viewer/src/pdf/PdfToolbar.tsx
import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import type { FunctionComponent } from 'react';
import type { ToolbarProps } from './ToolbarInterface';
// 1. Import the RENAMED CSS module
import styles from '../css/PdfToolbar.module.css';

const ZOOM_OPTIONS = [
  { value: 'auto', label: 'Automatic Zoom' },
  { value: 'page-actual', label: 'Actual Size' },
  { value: 'page-fit', label: 'Page Fit' },
  { value: 'page-width', label: 'Page Width' },
  { value: 'custom', label: '---', disabled: true }, // Divider
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100%' },
  { value: 125, label: '125%' },
  { value: 150, label: '150%' },
  { value: 200, label: '200%' },
  { value: 300, label: '300%' },
  { value: 400, label: '400%' },
];

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
  const [scaleValue, setScaleValue] = useState<string | number>('auto');
  const [currentScale, setScale] = useState(100);
  const [canZoomOut, setCanZoomOut] = useState(true);
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [isToolbarRendered, setIsToolbarRendered] = useState<boolean>(false);
  const zoomRef = useRef<HTMLDivElement | null>(null);

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
      setScale: setScaleValue,
      setCanZoomOut,
      setCanZoomIn,
    });
  }, [pdfManager, fileName]);

  useEffect(() => {
    setCurrentPageNumber(1);
    setScale(100);
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
        // only refit if user hasn’t manually set a numeric zoom
        if (pdfManager?.pdfViewer?.currentScaleValue === 'page-width') {
          pdfManager.setScale(100);
        }
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

  const onScaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    // Check if value is a number-string ("100") or a preset ("page-fit")
    const numeric = parseFloat(val);
    if (isNaN(numeric)) {
      // It's a string preset
      pdfManager?.setScale(val);
      setScaleValue(val);
    } else {
      // It's a percentage
      pdfManager?.setScale(numeric);
      setScaleValue(numeric);
    }
  };

  // Updated zoom handlers (manager handles the math now)
  const handleZoomIn = () => pdfManager?.handleZoomIn();
  const handleZoomOut = () => pdfManager?.handleZoomOut();

  const handleToggleFindBar = () => { console.log('toggle click', pdfManager); pdfManager?.toggleFindBar(); };

  // Helper: If the current scaleValue isn't in our list (e.g. 117%),
  // we should arguably add it dynamically or just let the select show "custom".
  // For simplicity, we just pass the value. The browser will show the value
  // if it matches an option, or blank if it doesn't.
  // To fix "blank", we can append the current value to the list if missing.

  // Create render options, ensuring current value is visible
  const renderOptions = [...ZOOM_OPTIONS];
  const isPreset = ZOOM_OPTIONS.some(z => z.value == scaleValue);

  if (!isPreset && typeof scaleValue === 'number') {
    // Add a temporary option for the weird zoom level (e.g. "117%")
    renderOptions.push({ value: scaleValue, label: `${scaleValue}%` });
    // Sort numbers so it looks nice? Optional.
    renderOptions.sort((a, b) => {
       if (typeof a.value === 'string') return -1;
       if (typeof b.value === 'string') return 1;
       return (a.value as number) - (b.value as number);
    });
  }

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
              <button onClick={handleZoomOut} disabled={!canZoomOut} title="Zoom Out">
                -
              </button>

              <select
                className={styles.zoomSelect}
                value={scaleValue}
                onChange={onScaleChange}
                aria-label="Zoom"
              >
                {renderOptions.map((opt, idx) => (
                  <option
                    key={`${opt.value}-${idx}`}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>

              <button onClick={handleZoomIn} disabled={!canZoomIn} title="Zoom In">
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