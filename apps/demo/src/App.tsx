import { useEffect, useState } from "react";
import { CustomPdfViewer } from "custom-react-pdf-viewer";

export default function App() {
  // We just need to store the blob itself, or null
  const [file, setFile] = useState<Blob | null>(null);

  useEffect(() => {
    (async () => {
      // Fetch and get the blob
      const res = await fetch("/sample.pdf");
      const blob = await res.blob();
      setFile(blob);
    })();
  }, []);

  if (!file) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <CustomPdfViewer
        fileName="sample.pdf"
        file={file}
      />
    </div>
  );
}