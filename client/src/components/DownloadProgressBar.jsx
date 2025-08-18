import React, { useEffect, useState, useRef } from "react";

export default function DownloadProgressBar({
  downloadId,
  onDownloadComplete,
  onDownloadError,
}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Connecting...");
  const [progressDetails, setProgressDetails] = useState("");
  const [error, setError] = useState("");
  const eventSourceRef = useRef(null); // Ref to hold the EventSource instance

  const API_BASE_URL = import.meta.env.VITE_API_URL_DEV;

  useEffect(() => {
    if (!downloadId) {
      setError("No download ID provided.");
      return;
    }

    // Close any existing connection before opening a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Initialize EventSource for the specific downloadId
    eventSourceRef.current = new EventSource(
      `${API_BASE_URL}/api/download/progress?downloadId=${downloadId}`
    );

    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Ensure the message is for the current downloadId
      if (data.downloadId !== downloadId) {
        return;
      }

      switch (data.type) {
        case "status":
          setStatus(data.message);
          if (data.percent !== undefined) {
            setProgress(data.percent);
          }
          break;
        case "progress":
          setProgress(data.percent);
          setProgressDetails(
            `Size: ${data.size}, Speed: ${data.speed}, ETA: ${data.eta}`
          );
          setStatus("Downloading...");
          if (data.percent >= 100) {
            setStatus("Download complete");
            setProgressDetails("");
            onDownloadComplete && onDownloadComplete();
            eventSourceRef.current.close();
          }
          break;
        case "complete":
          setProgress(100);
          setStatus(data.message);
          setProgressDetails("");
          onDownloadComplete && onDownloadComplete(); // Notify parent
          eventSourceRef.current.close();
          break;
        case "error":
          setError(`Download Error: ${data.message}`);
          setStatus("Download failed.");
          setProgress(0); // Reset progress on error
          setProgressDetails("");
          onDownloadError && onDownloadError(data.message); // Notify parent
          eventSourceRef.current.close();
          break;
      }
    };

    eventSourceRef.current.onerror = (err) => {
      console.error("EventSource failed:", err);
      setStatus("Connection to progress updates lost or failed.");
      setError(
        "Failed to get live progress updates. Download might still be in progress."
      );
      onDownloadError && onDownloadError("SSE connection lost."); // Notify parent
      eventSourceRef.current.close();
    };

    // Cleanup function: close EventSource when component unmounts or downloadId changes
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [downloadId, API_BASE_URL, onDownloadComplete, onDownloadError]); // Re-run effect if downloadId changes

  return (
    <div className="mb-4">
      <h4 className="font-semibold text-white">Download Progress:</h4>
      <div className="w-full bg-gray-700 rounded-full h-6 my-2 overflow-hidden">
        <div
          className="bg-green-500 h-6 text-xs font-medium text-white text-center p-0.5 leading-none rounded-full"
          style={{ width: `${progress}%` }}
        >
          {progress.toFixed(1)}%
        </div>
      </div>
      <p className="text-gray-300 text-sm">{status}</p>
      {progressDetails && (
        <p className="text-gray-400 text-xs">{progressDetails}</p>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
