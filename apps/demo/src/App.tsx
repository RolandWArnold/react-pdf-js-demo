import { useEffect, useState, useMemo } from "react";
import { CustomPdfViewer, createLocalStorageAdapter } from "custom-react-pdf-viewer";
import "./App.css";

const DOCUMENTS = [
  { id: 1, title: "Attention Is All You Need", fileName: "1-NIPS-2017-attention-is-all-you-need.pdf" },
  { id: 2, title: "To Build a Fire (Jack London)", fileName: "2-To-Build-a-Fire-by-Jack-London.pdf" },
  { id: 3, title: "Mutual Disclosure Agreement", fileName: "3-Template-CDA-Mutual-Disclosure.pdf" },
  { id: 4, title: "Business Proposal Template", fileName: "4-Business-proposal-template.pdf" },
  { id: 5, title: "Lorem Ipsum Test", fileName: "5-Lorem-ipsum.pdf" },
];

const GITHUB_BASE_URL = "https://raw.githubusercontent.com/RolandWArnold/custom-react-pdf-viewer/main/apps/demo/public";

export default function App() {
  const [selectedDocId, setSelectedDocId] = useState<number>(DOCUMENTS[0].id);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDoc = DOCUMENTS.find((d) => d.id === selectedDocId) || DOCUMENTS[0];

  // === The "Currying" Pattern ===
  // This is disabled for now until the persistence logic is fully implemented and tested.
  // We use the helper to create an adapter specific to this document.
  // When activeDoc changes, we get a NEW adapter that writes to a NEW key.
  // const stateAdapter = useMemo(() => {
  //   // We can just use the filename, or combine it with a view ID if needed.
  //   return createLocalStorageAdapter(activeDoc.fileName);
  // }, [activeDoc.fileName]);

  useEffect(() => {
    let isMounted = true;
    const fetchDocument = async () => {
      setError(null);
      setFileBlob(null);
      try {
        const res = await fetch(`${GITHUB_BASE_URL}/${activeDoc.fileName}`);
        if (!res.ok) {
          throw new Error(`Could not load ${activeDoc.fileName} - Status: ${res.status}`);
        }
        const blob = await res.blob();
        if (isMounted) {
          setFileBlob(blob);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError("Failed to load document from GitHub. Please check internet connection or URL.");
        }
      }
    };
    fetchDocument();
    return () => { isMounted = false; };
  }, [activeDoc]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Documents</h2>
        </div>
        <nav className="doc-list">
          {DOCUMENTS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDocId(doc.id)}
              className={`doc-item ${selectedDocId === doc.id ? "active" : ""}`}
            >
              <span className="doc-icon">📄</span>
              <span className="doc-title">{doc.title}</span>
              <span className="doc-filename">{doc.fileName}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        {error && (
          <div className="status-message error">
            <p>⚠️ {error}</p>
          </div>
        )}

        {!error && (
          <div className="viewer-wrapper">
            <CustomPdfViewer
              fileName={activeDoc.fileName}
              file={fileBlob}
            />
          </div>
        )}
      </main>
    </div>
  );
}