import { PDFViewer, EventBus, PDFLinkService, PDFPageView, PDFFindController } from 'pdfjs-dist/web/pdf_viewer.mjs';
import * as pdfjsLib from 'pdfjs-dist';
import type { Dispatch, SetStateAction } from 'react';

type EventBus = typeof EventBus;
type PDFLinkService = typeof PDFLinkService;
type PDFViewer = typeof PDFViewer;
type PDFPageView = typeof PDFPageView;
type PDFFindController = typeof PDFFindController;

const RESIZE_DEBOUNCE_TIME_MS = 50;

// === Viewer Configuration ===
// This object defines the "State" of the viewer at any given moment.
export interface ViewerConfig {
  pageNumber?: number;
  scale?: number | string;
  rotation?: number;
}

interface PdfData {
  eventBus?: EventBus;
  linkService?: PDFLinkService;
  findController?: PDFFindController;
  pdfViewer?: PDFViewer;
  loadingTask?: pdfjsLib.PDFDocumentLoadingTask;
  viewerElement?: Element;
  blobUrl?: string;

  // The configuration applied on init
  config?: ViewerConfig;

  cancelInit?: ReturnType<typeof setTimeout>;
  numPages?: number;
  activeHighlight?: { [key: number]: string } | null;
  scrollingInProgress?: boolean;
  originalScale?: number;
  setNumPages?: Dispatch<SetStateAction<number>>;
  setCurrentPageNumber?: Dispatch<SetStateAction<number>>;
  setCanGoToPreviousPage?: Dispatch<SetStateAction<boolean>>;
  setCanGoToNextPage?: Dispatch<SetStateAction<boolean>>;
  setScale?: Dispatch<SetStateAction<number | string>>;
  setCanZoomOut?: Dispatch<SetStateAction<boolean>>;
  setCanZoomIn?: Dispatch<SetStateAction<boolean>>;
}

interface CharTrackInfo {
  startDivIndex: number;
  startCharOffset: number;
  endDivIndex: number;
  endCharOffset: number;
}

class PdfManager {
  private data: PdfData | undefined;
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  public constructor() {}

  initViewer = (
    viewerElement: HTMLDivElement,
    EventConstructor: typeof EventBus = EventBus,
    LinkServiceConstructor: typeof PDFLinkService = PDFLinkService,
    findControllerConstructor: typeof PDFFindController = PDFFindController,
    ViewerConstructor: typeof PDFViewer = PDFViewer,
    blobUrl: string,
    config: ViewerConfig = {}
  ) => {
    const eventBus = this.data?.eventBus || new EventConstructor();
    const linkService = this.data?.linkService || new LinkServiceConstructor({ eventBus });
    const findController = this.data?.findController || new findControllerConstructor({ eventBus, linkService: linkService, updateMatchesCountOnProgress: true });

    const pdfViewer = this.data?.pdfViewer && this.data.viewerElement === viewerElement
      ? this.data.pdfViewer
      : new ViewerConstructor({ eventBus, container: viewerElement, linkService, findController, viewer: viewerElement });
    linkService.setViewer(pdfViewer);

    this.cancelInit && clearTimeout(this.cancelInit);
    this.data = {
      ...this.data,
      eventBus,
      linkService,
      pdfViewer,
      findController,
      viewerElement,
      blobUrl,
      config,
      cancelInit: setTimeout(this.loadPdf, 1),
    };
  };

  setActiveHighlight = (highlightInfo: { [key: number]: string } | null | undefined) => {
    if (this.data) {
      this.data.activeHighlight = highlightInfo;
      if (highlightInfo && this.pdfViewer && Object.keys(highlightInfo).length !== 0) {
          const pageNumber = Math.min(...Object.keys(highlightInfo).map(Number)) + 1;
          this.pdfViewer.currentPageNumber = pageNumber;
          this.data.scrollingInProgress = true;
          this.pdfViewer.refresh();
      } else {
        this.pdfViewer?.refresh();
      }
    }
  };

  loadPdf = async () => {
    const loadingTask = pdfjsLib.getDocument(this.blobUrl!);
    this.data!.loadingTask = loadingTask;
    const pdfDoc = await loadingTask.promise;
    this.pdfViewer!.setDocument(pdfDoc);
    this.linkService!.setDocument(pdfDoc);
    this.findController!.setDocument(pdfDoc);

    this.eventBus!.on('pagesinit', this.onPagesInit);
    this.eventBus!.on('pagerendered', this.onPageRendered);
    this.eventBus!.on('pagesloaded', this.onPagesLoaded);
    this.eventBus!.on('pagesdestroy', this.onPagesDestroy);
    this.eventBus!.on('pagechanging', this.onPageChanging);
    this.eventBus!.on('textlayerrendered', this.onTextLayerRendered);
    this.eventBus!.on('scalechanging', this.onScaleChanging);

    window.addEventListener('resize', this.handleResize);
  };

  public toggleFindBar = () => {
    this.eventBus?.dispatch('findbar-toggle');
  };

  unmount = () => {
    this.cancelInit && clearTimeout(this.cancelInit);
    this.eventBus?.off('textlayerrendered', this.onTextLayerRendered);
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.eventBus?.off('pagesdestroy', this.onPagesDestroy);

    this.data?.loadingTask?.destroy();
    this.pdfViewer?.pdfDocument?.destroy();
    this.eventBus?.off('pagesinit', this.onPagesInit);
    this.eventBus?.off('pagerendered', this.onPageRendered);
    this.eventBus?.off('pagesloaded', this.onPagesLoaded);
    this.eventBus?.off('pagechanging', this.onPageChanging);
    this.eventBus?.off('scalechanging', this.onScaleChanging);
  };

  registerHandlers = ({
    setNumPages,
    setCurrentPageNumber,
    setCanGoToPreviousPage,
    setCanGoToNextPage,
    setScale,
    setCanZoomOut,
    setCanZoomIn,
  }: {
    setNumPages: Dispatch<SetStateAction<number>> | undefined;
    setCurrentPageNumber: Dispatch<SetStateAction<number>> | undefined;
    setCanGoToPreviousPage: Dispatch<SetStateAction<boolean>> | undefined;
    setCanGoToNextPage: Dispatch<SetStateAction<boolean>> | undefined;
    setScale: Dispatch<SetStateAction<number | string>> | undefined;
    setCanZoomOut: Dispatch<SetStateAction<boolean>> | undefined;
    setCanZoomIn: Dispatch<SetStateAction<boolean>> | undefined;
  }) => {
    if (!this.data) {
      this.data = {};
    }

    setNumPages && (this.data.setNumPages = setNumPages);
    setCurrentPageNumber && (this.data.setCurrentPageNumber = setCurrentPageNumber);
    setCanGoToPreviousPage && (this.data.setCanGoToPreviousPage = setCanGoToPreviousPage);
    setCanGoToNextPage && (this.data.setCanGoToNextPage = setCanGoToNextPage);
    setScale && (this.data.setScale = setScale);
    setCanZoomOut && (this.data.setCanZoomOut = setCanZoomOut);
    setCanZoomIn && (this.data.setCanZoomIn = setCanZoomIn);

    this.data.numPages && setNumPages && setNumPages(this.data.numPages);
  };

  get eventBus() { return this.data?.eventBus; }
  get linkService() { return this.data?.linkService; }
  get pdfViewer() { return this.data?.pdfViewer; }
  get findController() { return this.data?.findController; }
  get activeHighlight() { return this.data?.activeHighlight; }
  get viewerElement() { return this.data?.viewerElement; }
  get blobUrl() { return this.data?.blobUrl; }
  get cancelInit() { return this.data?.cancelInit; }
  get isPdfLoaded() { return !!this.data; }

  handleResize = () => {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      if (this.pdfViewer && (this.pdfViewer.currentScaleValue === 'page-width' || this.pdfViewer.currentScaleValue === 'auto')) {
        this.pdfViewer.currentScaleValue = 'page-width';
      }
    }, RESIZE_DEBOUNCE_TIME_MS);
  };

  // @ts-ignore
  onPageRendered = ({ source, pageNumber }: { source: PDFPageView; pageNumber: number }) => {
    this.eventBus!.off('pagerendered', this.onPageRendered);
  };

  onPageChanging = ({ pageNumber }: { source: any; pageNumber: number; pageLabel: string; previous: any }) => {
    this.data?.setCurrentPageNumber && this.data.setCurrentPageNumber(pageNumber);
  };

  onPagesInit = ({ source }: { source: PDFViewer }) => {
    const { pagesCount } = source;
    this.data?.setNumPages && this.data.setNumPages(pagesCount);
    this.data && (this.data.numPages = pagesCount);

    // === Apply Configuration ===
    const config = this.data?.config || {};

    if (this.pdfViewer) {
        const { scale, rotation } = config;

        if (scale) {
             this.pdfViewer.currentScaleValue = scale.toString();
        } else {
             this.pdfViewer.currentScaleValue = 'page-width';
        }

        if (rotation !== undefined) {
            this.pdfViewer.pagesRotation = rotation;
        }
    }

    this.eventBus!.off('pagesinit', this.onPagesInit);
  };

  onPagesDestroy = () => {
    this.cancelInit && clearTimeout(this.cancelInit);
  };

  onPagesLoaded = () => {
    if (this.pdfViewer && !this.data?.config?.scale && this.pdfViewer.currentScaleValue !== 'page-width') {
       this.pdfViewer.currentScaleValue = 'page-width';
    }

    this.viewerElement?.scrollTop && (this.viewerElement.scrollTop = 0);

    // Handle Page Number separately as it requires the document to be layout-ready
    if (this.data?.config?.pageNumber) {
        this.handleGoToPage(this.data.config.pageNumber);
    }

    this.eventBus!.off('pagesloaded', this.onPagesLoaded);
  };

  onScaleChanging = (evt: { scale: number; presetValue: string }) => {
    if (this.data?.setScale) {
      // If there is a preset (like 'page-fit'), use that.
      // Otherwise use the numeric scale (converted to percentage int).
      if (evt.presetValue) {
        this.data.setScale(evt.presetValue);
      } else {
        this.data.setScale(Math.floor(evt.scale * 100));
      }
    }
  };

  trackCharCounts = (divs: any[], firstChar: string, firstCharCount: number, lastChar: string, lastCharCount: number) => {
    let currentFirstCharCount = 0;
    let currentLastCharCount = 0;
    let charInfo: CharTrackInfo = { startDivIndex: -1, startCharOffset: -1, endDivIndex: -1, endCharOffset: -1 };

    for (const [index, div] of divs.entries()) {
      for (let i = 0; i < div.textContent.length; i++) {
        if (div.textContent[i] === firstChar) {
          currentFirstCharCount++;
          if (currentFirstCharCount === firstCharCount) {
            charInfo.startDivIndex = index;
            charInfo.startCharOffset = i;
          }
        }
        if (div.textContent[i] === lastChar) {
          currentLastCharCount++;
          if (currentLastCharCount === lastCharCount) {
            charInfo.endDivIndex = index;
            charInfo.endCharOffset = i;
          }
        }
        if (charInfo.startDivIndex !== -1 && charInfo.endDivIndex !== -1) break;
      }
      if (charInfo.startDivIndex !== -1 && charInfo.endDivIndex !== -1) break;
    }

    return charInfo;
  };

  onTextLayerRendered = ({
    source,
    pageNumber,
    // @ts-ignore
    numTextDivs,
    // @ts-ignore
    error,
  }: {
    source: PDFPageView;
    pageNumber: number;
    numTextDivs: number;
    error: Error;
  }) => {
    const { textLayer } = source;
    if (textLayer) {
      textLayer?.highlighter?.textDivs.forEach((div: any) => {
        if (div.textContent) {
          div.textContent = div.textContent.replace(/<span class="highlight">|<\/span>/g, '');
        }
      });
    }
    if (textLayer && this.activeHighlight && pageNumber - 1 in this.activeHighlight) {
      // let scrollIntoView = false;
      const firstPageNumber = Math.min(...Object.keys(this.activeHighlight).map(Number)) + 1;
      if (this.data && this.data.scrollingInProgress && firstPageNumber === pageNumber) {
        this.data.scrollingInProgress = false;
        // scrollIntoView = true;
      }
      const textToHighlight = this.activeHighlight[pageNumber - 1];
      let needleText = textToHighlight.replace(/[^a-zA-Z]/g, '');
      let includeNums = false;
      if (needleText === '' && /\d/.test(textToHighlight)) {
        needleText = textToHighlight.replace(/[^a-zA-Z0-9]/g, '');
        includeNums = true;
      }
      if (!needleText) return;
      const firstChar = needleText[0];
      const lastChar = needleText[needleText.length - 1];
      const haystackText = textLayer.textDivs
        .map((div: any) => div.textContent || '')
        .join('')
        .split('')
        .filter((char: any) => (includeNums ? char.match(/[a-zA-Z0-9]/) : char.match(/[a-zA-Z]/)))
        .join('');
      const matchIndex = haystackText.indexOf(needleText);
      if (matchIndex === -1) return;
      const firstCharCount = haystackText.slice(0, matchIndex + 1).split(firstChar).length - 1;
      const lastCharCount = haystackText.slice(0, matchIndex + 1 + needleText.length).split(lastChar).length - 1;

      const charTrackInfo = this.trackCharCounts(textLayer.textDivs, firstChar, firstCharCount, lastChar, lastCharCount);

      if (charTrackInfo.startDivIndex === -1 || charTrackInfo.endDivIndex === -1) return;

      if (charTrackInfo.startDivIndex === charTrackInfo.endDivIndex) {
        const textContent = textLayer.textDivs[charTrackInfo.startDivIndex].textContent || '';
        const beforeText = textContent.substring(0, charTrackInfo.startCharOffset);
        const afterText = textContent.substring(charTrackInfo.endCharOffset);
        const highlightText = textContent.substring(charTrackInfo.startCharOffset, charTrackInfo.endCharOffset);
        textLayer.textDivs[charTrackInfo.startDivIndex].innerHTML =
          `${beforeText}<span class="highlight">${highlightText}</span>${afterText}`;
        textLayer.textDivs[charTrackInfo.startDivIndex].scrollIntoViewIfNeeded();
      } else {
        for (let i = charTrackInfo.startDivIndex; i <= charTrackInfo.endDivIndex; i++) {
          if (i === charTrackInfo.startDivIndex) {
            const textContent = textLayer.textDivs[charTrackInfo.startDivIndex].textContent || '';
            const beforeText = textContent.substring(0, charTrackInfo.startCharOffset);
            const highlightText = textContent.substring(charTrackInfo.startCharOffset);
            textLayer.textDivs[charTrackInfo.startDivIndex].innerHTML = `${beforeText}<span class="highlight">${highlightText}</span>`;
            textLayer.textDivs[charTrackInfo.startDivIndex].scrollIntoViewIfNeeded();
          } else if (i === charTrackInfo.endDivIndex) {
            const textContent = textLayer.textDivs[charTrackInfo.endDivIndex].textContent || '';
            const highlightText = textContent.substring(0, charTrackInfo.endCharOffset + 1);
            const afterText = textContent.substring(charTrackInfo.endCharOffset + 1);
            textLayer.textDivs[charTrackInfo.endDivIndex].innerHTML = `<span class="highlight">${highlightText}</span>${afterText}`;
          } else {
            const textContent = textLayer.textDivs[i].textContent || ''; // Ensure we have a string
            textLayer.textDivs[i].innerHTML = `<span class="highlight">${textContent}</span>`;
          }
        }
      }
    }
  };

  handlePreviousPage = () => {
    this.pdfViewer!.previousPage();
  };

  handleNextPage = () => {
    this.pdfViewer!.nextPage();
  };

  handleGoToPage = (index: number) => {
    this.pdfViewer?.scrollPageIntoView({ pageNumber: index });
  };

  handleZoomOut = () => {
    this.data?.pdfViewer?.decreaseScale();
  };

  handleZoomIn = () => {
    this.data?.pdfViewer?.increaseScale();
  };

  resetZoom = () => {
    if (this.pdfViewer?.currentScaleValue) {
      this.pdfViewer.currentScaleValue = 'page-width';
    }
  };

  setScale = (value: number | string): void => {
    if (!this.data?.pdfViewer) return;

    if (typeof value === 'string') {
      // Handle presets: "auto", "page-fit", "page-width", "page-actual"
      this.data.pdfViewer.currentScaleValue = value;
    } else {
      // Handle numeric percentage: 150 -> 1.5
      this.data.pdfViewer.currentScale = value / 100;
    }
  };
}

export default PdfManager;