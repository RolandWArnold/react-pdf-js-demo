// packages/custom-react-pdf-viewer/src/pdf/PdfManager.ts
import { PDFViewer, EventBus, PDFLinkService, PDFPageView, PDFFindController } from 'pdfjs-dist/web/pdf_viewer.mjs';
import * as pdfjsLib from 'pdfjs-dist';
import type { Dispatch, SetStateAction } from 'react';
type EventBus = typeof EventBus;
type PDFLinkService = typeof PDFLinkService;
type PDFViewer = typeof PDFViewer;
type PDFPageView = typeof PDFPageView;
type PDFFindController = typeof PDFFindController;

const RESIZE_DEBOUNCE_TIME_MS = 50;

interface PdfData {
  eventBus?: EventBus;
  linkService?: PDFLinkService;
  findController?: PDFFindController;
  pdfViewer?: PDFViewer;
  loadingTask?: pdfjsLib.PDFDocumentLoadingTask;
  viewerElement?: Element;
  blobUrl?: string;
  initialPageNo?: number;
  cancelInit?: ReturnType<typeof setTimeout>;
  numPages?: number;
  activeHighlight?: { [key: number]: string } | null;
  scrollingInProgress?: boolean;
  originalScale?: number;
  setNumPages?: Dispatch<SetStateAction<number>>;
  setCurrentPageNumber?: Dispatch<SetStateAction<number>>;
  setCanGoToPreviousPage?: Dispatch<SetStateAction<boolean>>;
  setCanGoToNextPage?: Dispatch<SetStateAction<boolean>>;
  setCurrentScale?: Dispatch<SetStateAction<number>>;
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
    initialPageNo: number
  ) => {
    console.log('#######initViewer called');
    const eventBus = this.data?.eventBus || new EventConstructor();
    const linkService = this.data?.linkService || new LinkServiceConstructor({ eventBus });
    const findController = this.data?.findController || new findControllerConstructor({ eventBus, linkService: linkService, updateMatchesCountOnProgress: true });

    // The PDFViewer *must* be new if the container is new, or if it doesn't exist, but it should re-use the other services.
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
      initialPageNo,
      cancelInit: setTimeout(this.loadPdf, 1),
    };
  };

  setActiveHighlight = (highlightInfo: { [key: number]: string } | null | undefined) => {
    console.log(highlightInfo);
    if (this.data) {
      this.data.activeHighlight = highlightInfo;
      if (highlightInfo) {
        if (this.pdfViewer && Object.keys(highlightInfo).length !== 0) {
          const pageNumber = Math.min(...Object.keys(highlightInfo).map(Number)) + 1;
          console.log(`pageNumber: ${pageNumber}`);
          this.pdfViewer.currentPageNumber = pageNumber;
          this.data.scrollingInProgress = true;
          this.pdfViewer?.refresh();
        } else {
          console.log('Clause not aligned');
          this.pdfViewer?.refresh();
        }
      } else {
        this.pdfViewer?.refresh();
      }
    }
  };

  loadPdf = async () => {
    console.log('#######loadPdf called');
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

    window.addEventListener('resize', this.handleResize);
  };

  public toggleFindBar = () => {
    this.eventBus?.dispatch('findbar-toggle');
  };

  unmount = () => {
    console.log('#######unmount called');
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
  };

  registerHandlers = ({
    setNumPages,
    setCurrentPageNumber,
    setCanGoToPreviousPage,
    setCanGoToNextPage,
    setCurrentScale,
    setCanZoomOut,
    setCanZoomIn,
  }: {
    setNumPages: Dispatch<SetStateAction<number>> | undefined;
    setCurrentPageNumber: Dispatch<SetStateAction<number>> | undefined;
    setCanGoToPreviousPage: Dispatch<SetStateAction<boolean>> | undefined;
    setCanGoToNextPage: Dispatch<SetStateAction<boolean>> | undefined;
    setCurrentScale: Dispatch<SetStateAction<number>> | undefined;
    setCanZoomOut: Dispatch<SetStateAction<boolean>> | undefined;
    setCanZoomIn: Dispatch<SetStateAction<boolean>> | undefined;
  }) => {
    console.log('registerHandlers callled.....');
    if (!this.data) {
      this.data = {};
    }

    setNumPages && (this.data.setNumPages = setNumPages);
    setCurrentPageNumber && (this.data.setCurrentPageNumber = setCurrentPageNumber);
    setCanGoToPreviousPage && (this.data.setCanGoToPreviousPage = setCanGoToPreviousPage);
    setCanGoToNextPage && (this.data.setCanGoToNextPage = setCanGoToNextPage);
    setCurrentScale && (this.data.setCurrentScale = setCurrentScale);
    setCanZoomOut && (this.data.setCanZoomOut = setCanZoomOut);
    setCanZoomIn && (this.data.setCanZoomIn = setCanZoomIn);

    this.data.numPages && setNumPages && setNumPages(this.data.numPages);
  };

  get eventBus() {
    if (!this.data) return undefined;
    return this.data.eventBus;
  }

  get linkService() {
    if (!this.data) return undefined;
    return this.data.linkService;
  }

  get pdfViewer() {
    if (!this.data) return undefined;
    return this.data.pdfViewer;
  }

  get findController() {
    if (!this.data) return undefined;
    return this.data.findController;
  }

  get activeHighlight() {
    if (!this.data) return undefined;
    return this.data.activeHighlight;
  }

  get viewerElement() {
    return this.data?.viewerElement;
  }

  get blobUrl() {
    if (!this.data) return undefined;
    return this.data.blobUrl;
  }

  get cancelInit() {
    return this.data?.cancelInit;
  }

  get isPdfLoaded() {
    return !!this.data;
  }

  handleResize = () => {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout(() => {
      if (this.pdfViewer) {
        this.pdfViewer.currentScaleValue = 'page-width';
      }
    }, RESIZE_DEBOUNCE_TIME_MS);
  };

  // @ts-ignore
  onPageRendered = ({ source, pageNumber }: { source: PDFPageView; pageNumber: number }) => {
    console.log(`pagerendered: ${pageNumber}`);
    this.eventBus!.off('pagerendered', this.onPageRendered);
  };

  onPageChanging = ({ source, pageNumber, pageLabel, previous }: { source: any; pageNumber: number; pageLabel: string; previous: any }) => {
    console.log('onPageChanging', source, pageNumber, pageLabel, previous);
    this.data?.setCurrentPageNumber && this.data.setCurrentPageNumber(pageNumber);
  };

  onPagesInit = ({ source }: { source: PDFViewer }) => {
    this.pdfViewer!.currentScaleValue = 'page-width';
    const { pagesCount } = source;
    console.log('pagesCount', pagesCount);
    this.data?.setNumPages && this.data.setNumPages(pagesCount);
    this.data && (this.data.numPages = pagesCount);
    this.eventBus!.off('pagesinit', this.onPagesInit);
  };

  onPagesDestroy = () => {
    console.log('#######pagesdestroy called');
    this.cancelInit && clearTimeout(this.cancelInit);
  };

  onPagesLoaded = () => {
    console.log(`pagesloaded`);
    if (this.pdfViewer!.currentScaleValue !== 'page-width') {
      this.pdfViewer!.currentScaleValue = 'page-width';
    }
    this.viewerElement?.scrollTop && (this.viewerElement.scrollTop = 0);
    this.data?.initialPageNo && this.handleGoToPage(this.data?.initialPageNo);
    this.eventBus!.off('pagesloaded', this.onPagesLoaded);
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
    // @ts-ignore
    console.log('onTextLayerRendered: ');
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
        console.log(`scrollIntoView set to true`);
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
    this.pdfViewer?.decreaseScale({ scaleFactor: 1 });
  };

  handleZoomIn = () => {
    this.pdfViewer?.increaseScale({ scaleFactor: 1 });
  };

  resetZoom = () => {
    if (this.pdfViewer?.currentScaleValue) {
      this.pdfViewer.currentScaleValue = 'page-width';
    }
  };

  setCurrentScale(scale: number): void {
    if (this.data?.pdfViewer) {
      if (scale === 100) {
        this.data.pdfViewer.currentScaleValue = 'page-width';
      } else {
        this.data.pdfViewer.currentScale = scale;
        this.data.originalScale = scale;
      }
    }
  }
}

export default PdfManager;