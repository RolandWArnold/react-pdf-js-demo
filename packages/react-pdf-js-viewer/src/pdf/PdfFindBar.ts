import { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs';

const MATCHES_COUNT_LIMIT = 1000;

const FindState = {
  FOUND: 0,
  NOT_FOUND: 1,
  WRAPPED: 2,
  PENDING: 3,
};

interface findBarProps {
  bar: any;
  toggleButton: any;
  findField: any;
  highlightAllCheckbox: any;
  caseSensitiveCheckbox: any;
  matchDiacriticsCheckbox: any;
  entireWordCheckbox: any;
  findMsg: any;
  findResultsCount: any;
  findPreviousButton: any;
  findNextButton: any;
}

/**
 * Creates a "search bar" given a set of DOM elements that act as controls
 * for searching or for setting search preferences in the UI. This object
 * also sets up the appropriate events for the controls. Actual searching
 * is done by PDFFindController.
 */
class PDFFindBar {
  resizeObserver = new ResizeObserver(this.resizeObserverCallback.bind(this));
  private opened: boolean;
  private bar;
  private toggleButton;
  private findField;
  private highlightAll;
  private caseSensitive;
  private matchDiacritics;
  private entireWord;
  private findMsg;
  private findResultsCount;
  private findPreviousButton;
  private findNextButton;
  private eventBus;

  constructor(options?: findBarProps, eventBus?: typeof EventBus) {
    this.opened = false;

    this.bar = options?.bar;
    this.toggleButton = options?.toggleButton;
    this.findField = options?.findField;
    this.highlightAll = options?.highlightAllCheckbox;
    this.caseSensitive = options?.caseSensitiveCheckbox;
    this.matchDiacritics = options?.matchDiacriticsCheckbox;
    this.entireWord = options?.entireWordCheckbox;
    this.findMsg = options?.findMsg;
    this.findResultsCount = options?.findResultsCount;
    this.findPreviousButton = options?.findPreviousButton;
    this.findNextButton = options?.findNextButton;
    this.eventBus = eventBus;

    // Add event listeners using bound class methods
    this.toggleButton?.addEventListener('click', this.toggle);
    this.findField?.addEventListener('input', this.onFindInput);

    // *** MODIFIED ***
    // Attach keydown listener directly to the find field
    this.findField?.addEventListener('keydown', this.onFindKeydown);
    // *** END MODIFIED ***

    this.findPreviousButton?.addEventListener('click', this.onFindPrevious);
    this.findNextButton?.addEventListener('click', this.onFindNext);
    this.highlightAll?.addEventListener('click', this.onHighlightAll);
    this.caseSensitive?.addEventListener('click', this.onCaseSensitive);
    this.entireWord?.addEventListener('click', this.onEntireWord);
    this.matchDiacritics?.addEventListener('click', this.onMatchDiacritics);
  }

  reset() {
    this.updateUIState();
  }

  dispatchEvent(type: string, findPrev = false) {
    this.eventBus.dispatch('find', {
      source: this,
      type,
      query: this.findField.value.trim(),
      caseSensitive: this.caseSensitive.checked,
      entireWord: this.entireWord.checked,
      highlightAll: this.highlightAll.checked,
      findPrevious: findPrev,
      matchDiacritics: this.matchDiacritics.checked,
    });
  }

  updateUIState(state?: number, previous?: string, matchesCount?: object) {
    const { findField, findMsg } = this;
    let findMsgId = '',
      status = '';

    switch (state) {
      case FindState.FOUND:
        break;
      case FindState.PENDING:
        status = 'pending';
        break;
      case FindState.NOT_FOUND:
        findMsgId = 'pdfjs-find-not-found';
        status = 'notFound';
        break;
      case FindState.WRAPPED:
        findMsgId = `pdfjs-find-reached-${previous ? 'top' : 'bottom'}`;
        break;
    }
    findField.setAttribute('data-status', status);
    findField.setAttribute('aria-invalid', state === FindState.NOT_FOUND);

    findMsg.setAttribute('data-status', status);
    if (findMsgId) {
      findMsg.setAttribute('data-l10n-id', findMsgId);
    } else {
      findMsg.removeAttribute('data-l10n-id');
      findMsg.textContent = '';
    }

    matchesCount && this.updateResultsCount(matchesCount);
  }

  updateResultsCount({ current = 0, total = 0 }) {
    const { findResultsCount } = this;

    if (total > 0) {
      const limit = MATCHES_COUNT_LIMIT;

      findResultsCount.setAttribute('data-l10n-id', `pdfjs-find-match-count${total > limit ? '-limit' : ''}`);
      findResultsCount.setAttribute('data-l10n-args', JSON.stringify({ limit, current, total }));
      if (total < MATCHES_COUNT_LIMIT) findResultsCount.textContent = `${current} of ${total} matches`;
      else findResultsCount.textContent = `More than 1,000 matches`;
    } else if (total === 0 && current === 0 && this.findField.value) {
      findResultsCount.removeAttribute('data-l10n-id');
      findResultsCount.textContent = 'Phrase not found';
    } else {
      findResultsCount.removeAttribute('data-l10n-id');
      findResultsCount.textContent = '';
    }
  }

  open() {
    if (!this.opened) {
      // Potentially update the findbar layout, row vs column, when:
      //  - The width of the viewer itself changes.
      //  - The width of the findbar changes, by toggling the visibility
      //    (or localization) of find count/status messages.
      this.resizeObserver.observe(this.bar.parentNode);
      this.resizeObserver.observe(this.bar);

      this.opened = true;
      this.toggleExpandedBtn(this.toggleButton, true, this.bar);
    }
    this.findField.select();
    this.findField.focus();
  }

  toggleExpandedBtn(button: HTMLElement, toggle: boolean, view: HTMLElement) {
    button.classList.toggle('toggled', toggle);
    button.setAttribute('aria-expanded', JSON.stringify(toggle));

    view?.classList.toggle('hidden', !toggle);
  }

  close() {
    if (!this.opened) {
      return;
    }
    this.resizeObserver.disconnect();

    this.opened = false;
    this.toggleExpandedBtn(this.toggleButton, false, this.bar);
  }

  resizeObserverCallback() {
    const { bar } = this;
    // The find bar has an absolute position and thus the browser extends
    // its width to the maximum possible width once the find bar does not fit
    // entirely within the window anymore (and its elements are automatically
    // wrapped). Here we detect and fix that.
    bar.classList.remove('wrapContainers');

    const findbarHeight = bar.clientHeight;
    const inputContainerHeight = bar.firstElementChild.clientHeight;

    if (findbarHeight > inputContainerHeight) {
      // The findbar is taller than the input container, which means that
      // the browser wrapped some of the elements. For a consistent look,
      // wrap all of them to adjust the width of the find bar.
      bar.classList.add('wrapContainers');
    }
  }

  destroy() {
    this.toggleButton?.removeEventListener('click', this.toggle);
    this.findField?.removeEventListener('input', this.onFindInput);
    this.findField?.removeEventListener('keydown', this.onFindKeydown);
    this.findPreviousButton?.removeEventListener('click', this.onFindPrevious);
    this.findNextButton?.removeEventListener('click', this.onFindNext);
    this.highlightAll?.removeEventListener('click', this.onHighlightAll);
    this.caseSensitive?.removeEventListener('click', this.onCaseSensitive);
    this.entireWord?.removeEventListener('click', this.onEntireWord);
    this.matchDiacritics?.removeEventListener('click', this.onMatchDiacritics);
    this.resizeObserver.disconnect();
  }

  private onFindInput = () => {
    this.dispatchEvent('');
  };

  private onFindKeydown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        // Find next (or previous on shift-enter)
        this.dispatchEvent('again', e.shiftKey);
        e.preventDefault();
        break;
      case 'Escape':
        // Close the find bar
        this.close();
        e.preventDefault();
        break;
    }
  };

  private onFindPrevious = () => {
    this.dispatchEvent('again', true);
  };

  private onFindNext = () => {
    this.dispatchEvent('again', false);
  };

  private onHighlightAll = () => {
    this.dispatchEvent('highlightallchange');
  };

  private onCaseSensitive = () => {
    this.dispatchEvent('casesensitivitychange');
  };

  private onEntireWord = () => {
    this.dispatchEvent('entirewordchange');
  };

  private onMatchDiacritics = () => {
    this.dispatchEvent('diacriticmatchingchange');
  };

  toggle = () => {
    if (this.opened) {
      this.close();
    } else {
      this.open();
    }
  };
}

export { PDFFindBar };