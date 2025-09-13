import { useEffect, useState } from "react";
import CustomPdfViewer from "./pdf/CustomPdfViewer";

export default function App() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      // Fetch and create a blob: URL so URL.revokeObjectURL is valid on unmount
      const res = await fetch("/sample.pdf");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      revoke = url;
      setBlobUrl(url);
      setLoading(false);
    })();

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, []);

  if (!blobUrl) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <CustomPdfViewer
        uniqueIdentifier="demo-viewer"
        fileName="sample.pdf"
        blobUrl={blobUrl}
        isLoading={loading}
        // optional:
        // jumpToPage={3}
        // highlightInfo={{ 0: "some text to highlight on page 1" }}
      />
    </div>
  );
}
