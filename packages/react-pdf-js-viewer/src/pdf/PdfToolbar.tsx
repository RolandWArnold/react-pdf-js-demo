import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import type { FunctionComponent } from 'react';
import type { ToolbarProps } from './ToolbarInterface';
import '../css/PdfToolbar.css';
import { PDFFindBar } from './PdfFindBar'; // Import the class

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

  const findButtonRef = useRef<HTMLButtonElement>(null);
  const findBarRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const findPreviousRef = useRef<HTMLButtonElement>(null);
  const findNextRef = useRef<HTMLButtonElement>(null);
  const highlightAllRef = useRef<HTMLInputElement>(null);
  const matchCaseRef = useRef<HTMLInputElement>(null);
  const matchDiacriticsRef = useRef<HTMLInputElement>(null);
  const entireWordRef = useRef<HTMLInputElement>(null);
  const findResultsCountRef = useRef<HTMLSpanElement>(null);
  const findMsgRef = useRef<HTMLSpanElement>(null);
  const findBarInstanceRef = useRef<PDFFindBar | null>(null);

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

  // This effect creates and destroys the PDFFindBar instance
  useEffect(() => {
    // We now wait for pdfManager.eventBus to exist.
    // This ensures initViewer() has run.
    if (pdfManager
      && pdfManager.eventBus
      && findBarRef.current
      && findButtonRef.current
      && findInputRef.current
      && findPreviousRef.current
      && findNextRef.current
      && highlightAllRef.current
      && matchCaseRef.current
      && matchDiacriticsRef.current
      && entireWordRef.current
      && findResultsCountRef.current
      && findMsgRef.current) {

      const options = {
        bar: findBarRef.current,
        toggleButton: findButtonRef.current,
        findField: findInputRef.current,
        highlightAllCheckbox: highlightAllRef.current,
        caseSensitiveCheckbox: matchCaseRef.current,
        entireWordCheckbox: entireWordRef.current,
        findMsg: findMsgRef.current,
        findResultsCount: findResultsCountRef.current,
        findPreviousButton: findPreviousRef.current,
        findNextButton: findNextRef.current,
        matchDiacriticsCheckbox: matchDiacriticsRef.current,
      };

      const findBar = new PDFFindBar(options, pdfManager.eventBus);
      findBarInstanceRef.current = findBar;
      pdfManager.registerFindBar(findBar);

      return () => {
        pdfManager.unregisterFindBar();
        findBar.destroy();
        findBarInstanceRef.current = null;
      };
    }
  }, [pdfManager, numPages]);



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

  return (
    // This container is now relative, allowing the findbar
    // to be positioned absolutely inside it.
    <div className="pdf-viewer-toolbar-container" ref={toolbarRefInDom}>
      <div className="pdf-viewer-toolbar-main">
        <div className="pdf-viewer-toolbar-file-info">
          <span title={fileName}>
            {showFileName ? fileName : ''}
          </span>
        </div>

        {numPages > 0 && (
          <>
            <div className="pdf-viewer-toolbar-control">
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

            <div className="pdf-viewer-toolbar-zoom-control">
              <button onClick={handleZoomOut} disabled={!canZoomOut}>
                -
              </button>
              <span>{currentScale}%</span>
              <button onClick={handleZoomIn} disabled={!canZoomIn}>
                +
              </button>
            </div>
            <div className="pdf-viewer-toolbar-right">
              <button
                ref={findButtonRef}
                className="pdf-viewer-toolbar-find-toggle"
                title="Find in Document"
              >
                <span>Find</span>
              </button>
            </div>
          </>
        )}
      </div>
      <div id="findbar" className="hidden doorHanger" ref={findBarRef}>
        <div id="findbarInputContainer">
          <span className="loadingInput end">
            <input
              ref={findInputRef}
              className="toolbarField" /* This class is styled by pdf_viewer.css */
              title="Find"
              placeholder="Find in document…"
              data-l10n-id="pdfjs-find-input"
              aria-invalid="false"
            />
          </span>
          <div className="splitToolbarButton">
            <button
              ref={findPreviousRef}
              className="toolbarButton" /* This class is styled by pdf_viewer.css */
              title="Find the previous occurrence of the phrase"
              data-l10n-id="pdfjs-find-previous-button"
            >
              <span>Previous</span>
            </button>
            <div className="splitToolbarButtonSeparator"></div>
            <button
              ref={findNextRef}
              className="toolbarButton" /* This class is styled by pdf_viewer.css */
              title="Find the next occurrence of the phrase"
              data-l10n-id="pdfjs-find-next-button"
            >
              <span>Next</span>
            </button>
          </div>
        </div>

        <div id="findbarOptionsOneContainer">
          <input type="checkbox" id="pdf-viewer-find-highlight-all" ref={highlightAllRef} className="toolbarField" />
          <label
            htmlFor="pdf-viewer-find-highlight-all"
            className="toolbarLabel"
            data-l10n-id="pdfjs-find-highlight-checkbox"
          >
            Highlight All
          </label>
          <input type="checkbox" id="pdf-viewer-find-match-case" ref={matchCaseRef} className="toolbarField" />
          <label
            htmlFor="pdf-viewer-find-match-case"
            className="toolbarLabel"
            data-l10n-id="pdfjs-find-match-case-checkbox-label"
          >
            Match Case
          </label>
        </div>
        <div id="findbarOptionsTwoContainer">
          <input type="checkbox" id="pdf-viewer-find-match-diacritics" ref={matchDiacriticsRef} className="toolbarField" />
          <label
            htmlFor="pdf-viewer-find-match-diacritics"
            className="toolbarLabel"
            data-l10n-id="pdfjs-find-match-diacritics-checkbox-label"
          >
            Match Diacritics
          </label>
          <input type="checkbox" id="pdf-viewer-find-entire-word" ref={entireWordRef} className="toolbarField" />
          <label
            htmlFor="pdf-viewer-find-entire-word"
            className="toolbarLabel"
            data-l10n-id="pdfjs-find-entire-word-checkbox-label"
          >
            Whole Words
          </label>
        </div>

        <div id="findbarMessageContainer" aria-live="polite">
          <span
            ref={findResultsCountRef}
            className="findResultsCount toolbarLabel" /* Use class from pdf_viewer.css */
          ></span>
          <span ref={findMsgRef} className="findMsg toolbarLabel"></span> {/* Use class from pdf_viewer.css */ }
        </div>
      </div>
    </div>
  );
};

