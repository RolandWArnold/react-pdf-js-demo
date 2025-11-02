// packages/custom-react-pdf-viewer/src/pdf/PdfFindBar.tsx
import React, { useState, useEffect, useRef, useId } from 'react';
import type { FunctionComponent } from 'react';
import styles from '../css/PdfFindBar.module.css';
import { EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs';

const MATCHES_COUNT_LIMIT = 1000;
const FindState = {
  FOUND: 0,
  NOT_FOUND: 1,
  WRAPPED: 2,
  PENDING: 3,
};

interface PdfFindBarProps {
  eventBus: InstanceType<typeof EventBus>;
}

export const PdfFindBar: FunctionComponent<PdfFindBarProps> = ({ eventBus }) => {
  // === State for the Find Bar UI ===
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightAll, setHighlightAll] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchDiacritics, setMatchDiacritics] = useState(false);
  const [entireWord, setEntireWord] = useState(false);
  const [findMessage, setFindMessage] = useState('');
  const [matchesCount, setMatchesCount] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState('');

  const findFieldRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(isOpen);

  // Generate unique IDs for this component instance
  const baseId = useId();
  const findHighlightAllId = `${baseId}-find-highlight-all`;
  const findMatchCaseId = `${baseId}-find-match-case`;
  const findMatchDiacriticsId = `${baseId}-find-match-diacritics`;
  const findEntireWordId = `${baseId}-find-entire-word`;

  // Effect for global keydown listeners (Ctrl+F and Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check for Escape key
      if (e.key === 'Escape') {
        setIsOpen(false);
      }

      // Check for Ctrl+F (Windows/Linux) or Cmd+F (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault(); // Prevent browser's default find
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [eventBus, query, caseSensitive, entireWord, highlightAll, matchDiacritics]);

  // Effect to subscribe to all PDF.js events
  useEffect(() => {
    // Listen for the toggle event from the toolbar
    const toggleFindBar = () => setIsOpen(open => !open);

    // Listen for state updates from the find controller
    const handleUpdateState = (data: {
      state: number,
      previous: string,
      matchesCount: { total: number }
    }) => {
       let msg = '';
      let newStatus = '';
      switch (data.state) {
        case FindState.FOUND:
          break;
        case FindState.PENDING:
          newStatus = 'pending';
          break;
        case FindState.NOT_FOUND:
          msg = 'Phrase not found';
          newStatus = 'notFound';
          break;
        case FindState.WRAPPED:
          msg = `Reached ${data.previous ? 'top' : 'bottom'} of document`;
          break;
      }
      setFindMessage(msg);
      setStatus(newStatus);
      if (data.matchesCount) {
        setMatchesCount(mc => ({ ...mc, total: data.matchesCount.total }));
      }
    };

    // Listen for match count updates
    const handleUpdateMatches = (data: { matchesCount: { current: number, total: number } }) => {
      setMatchesCount(data.matchesCount);
      setStatus(data.matchesCount.total === 0 ? 'notFound' : '');
    };

    // Subscribe
    eventBus.on('findbar-toggle', toggleFindBar);
    eventBus.on('updatefindcontrolstate', handleUpdateState);
    eventBus.on('updatefindmatchescount', handleUpdateMatches);

    // Unsubscribe on unmount
    return () => {
      eventBus.off('findbar-toggle', toggleFindBar);
      eventBus.off('updatefindcontrolstate', handleUpdateState);
      eventBus.off('updatefindmatchescount', handleUpdateMatches);
    };
  }, [eventBus]);

  // Effect to handle *only* what happens when isOpen changes
  useEffect(() => {
    // Check if it JUST opened (prev was false, current is true)
    if (isOpen && !prevIsOpenRef.current) {
      findFieldRef.current?.select();
      findFieldRef.current?.focus();
    }

    // Check if it JUST closed (prev was true, current is false)
    if (!isOpen && prevIsOpenRef.current) {
      // Dispatch 'barclose' to clear state and all highlights
      eventBus.dispatch('find', {
        source: 'PdfFindBar',
        type: 'barclose',
      });
      // Reset our local React state (but not the query)
      setFindMessage('');
      setMatchesCount({ current: 0, total: 0 });
      setStatus('');
    }

    // Update the ref *after* the logic
    prevIsOpenRef.current = isOpen;
  }, [isOpen, eventBus]); // <-- Minimal dependency array breaks the loop!

  // === Findbar Event Handlers ===

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Manually dispatch 'find' with the NEW query
    eventBus.dispatch('find', {
      source: 'PdfFindBar',
      type: 'find',
      query: newQuery, // <-- Use newQuery, not the stale state
      caseSensitive: caseSensitive,
      entireWord: entireWord,
      highlightAll: highlightAll,
      findPrevious: false,
      matchDiacritics: matchDiacritics,
    });

    // Reset UI state if query is cleared
    if (!newQuery) {
      setFindMessage('');
      setMatchesCount({ current: 0, total: 0 });
      setStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Manually dispatch 'again'
      eventBus.dispatch('find', {
        source: 'PdfFindBar',
        type: 'again',
        query,
        caseSensitive,
        entireWord,
        highlightAll,
        findPrevious: e.shiftKey, // Use shiftKey
        matchDiacritics,
      });
      e.preventDefault();
    }
    // Escape key is handled by the global listener
  };

  // Handlers for checkboxes
  const onHighlightAll = () => {
    setHighlightAll(h => {
      const next = !h;
      eventBus.dispatch('find', {
        source: 'PdfFindBar',
        type: 'highlightallchange',
        query,
        caseSensitive,
        entireWord,
        highlightAll: next,
        findPrevious: false,
        matchDiacritics,
      });
      return next;
    });
  };

  const onCaseSensitive = () => {
    setCaseSensitive(c => {
      const next = !c;
      eventBus.dispatch('find', {
        source: 'PdfFindBar',
        type: 'casesensitivitychange',
        query,
        caseSensitive: next,
        entireWord,
        highlightAll,
        findPrevious: false,
        matchDiacritics,
      });
      return next;
    });
  };

  const onMatchDiacritics = () => {
    setMatchDiacritics(m => {
      const next = !m;
      eventBus.dispatch('find', {
        source: 'PdfFindBar',
        type: 'diacriticmatchingchange',
        query,
        caseSensitive,
        entireWord,
        highlightAll,
        findPrevious: false,
        matchDiacritics: next,
      });
      return next;
    });
  };

  const onEntireWord = () => {
    setEntireWord(w => {
      const next = !w;
      eventBus.dispatch('find', {
        source: 'PdfFindBar',
        type: 'entirewordchange',
        query,
        caseSensitive,
        entireWord: next,
        highlightAll,
        findPrevious: false,
        matchDiacritics,
      });
      return next;
    });
  };

  // Handlers for next/prev buttons
  const onFindPrevious = () => {
    eventBus.dispatch('find', {
      source: 'PdfFindBar',
      type: 'again',
      query,
      caseSensitive,
      entireWord,
      highlightAll,
      findPrevious: true,
      matchDiacritics,
    });
  };

  const onFindNext = () => {
    eventBus.dispatch('find', {
      source: 'PdfFindBar',
      type: 'again',
      query,
      caseSensitive,
      entireWord,
      highlightAll,
      findPrevious: false,
      matchDiacritics,
    });
  };

  // === Render Logic ===
  let matchesCountText = '';
  if (matchesCount.total > 0) {
    if (matchesCount.total > MATCHES_COUNT_LIMIT) {
      matchesCountText = 'More than 1,000 matches';
    } else {
      matchesCountText = `${matchesCount.current} of ${matchesCount.total} matches`;
    }
  }

  // Combine find message and match count
  const message = findMessage ? findMessage : matchesCountText;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`${styles.findbar} ${styles.doorHanger}`}
      aria-live="polite"
    >
      <div className={styles.findbarInputContainer}>
        <span className={`${styles.loadingInput} ${status === 'pending' ? styles.pending : ''}`}>
          <input
            ref={findFieldRef}
            className={styles.toolbarField}
            title="Find"
            placeholder="Find in document…"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            data-status={status}
          />
        </span>
        <div className={styles.splitToolbarButton}>
          <button
            className={styles.toolbarButton}
            title="Find the previous occurrence of the phrase"
            onClick={onFindPrevious}
          >
            <span>Previous</span>
          </button>
          <div className={styles.splitToolbarButtonSeparator}></div>
          <button
            className={styles.toolbarButton}
            title="Find the next occurrence of the phrase"
            onClick={onFindNext}
          >
            <span>Next</span>
          </button>
        </div>
      </div>

      <div className={styles.findbarOptionsOneContainer}>
        <input
          type="checkbox"
          id={findHighlightAllId}
          className={styles.toolbarField}
          checked={highlightAll}
          onChange={onHighlightAll}
        />
        <label
          htmlFor={findHighlightAllId}
          className={styles.toolbarLabel}
        >
          Highlight All
        </label>
        <input
          type="checkbox"
          id={findMatchCaseId}
          className={styles.toolbarField}
          checked={caseSensitive}
          onChange={onCaseSensitive}
        />
        <label
          htmlFor={findMatchCaseId}
          className={styles.toolbarLabel}
        >
          Match Case
        </label>
      </div>
      <div className={styles.findbarOptionsTwoContainer}>
        <input
          type="checkbox"
          id={findMatchDiacriticsId}
          className={styles.toolbarField}
          checked={matchDiacritics}
          onChange={onMatchDiacritics}
        />
        <label
          htmlFor={findMatchDiacriticsId}
          className={styles.toolbarLabel}
        >
          Match Diacritics
        </label>
        <input
          type="checkbox"
          id={findEntireWordId}
          className={styles.toolbarField}
          checked={entireWord}
          onChange={onEntireWord}
        />
        <label
          htmlFor={findEntireWordId}
          className={styles.toolbarLabel}
        >
          Whole Words
        </label>
      </div>

      <div className={styles.findbarMessageContainer}>
        <span className={styles.findResultsCount} data-status={status}>
          {message}
        </span>
      </div>
    </div>
  );
};