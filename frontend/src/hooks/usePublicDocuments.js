import { useEffect, useState } from "react";
import { listPublicDocuments } from "../services/documents";

export default function usePublicDocuments({ domain, category, size = 50 }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const loadDocuments = () => {
      const currentRequestId = ++requestId;
      setLoading(true);
      listPublicDocuments({
        domain: domain || undefined,
        category: category || undefined,
        size,
      })
        .then((data) => {
          if (active && currentRequestId === requestId) {
            setDocuments(data.items || []);
            setError(false);
          }
        })
        .catch((err) => {
          if (active && currentRequestId === requestId) {
            console.error("Error loading public notices:", err);
            setError(true);
          }
        })
        .finally(() => {
          if (active && currentRequestId === requestId) setLoading(false);
        });
    };

    loadDocuments();
    window.addEventListener("focus", loadDocuments);
    return () => {
      active = false;
      window.removeEventListener("focus", loadDocuments);
    };
  }, [domain, category, size]);

  return { documents, loading, error };
}
