import { useState } from "react";
import { Search } from "lucide-react";
import { getVideoFormats } from "../api/processUrl-api"; // We'll modify this to no longer directly download
import { FaLink } from "react-icons/fa";
import { IoMdDownload } from "react-icons/io";
import CustomDropdown from "./common/CustomDropdown";
import YouTubeEmbed from "./YouTubeEmbed";
import { calculateTotalSize } from "./utils/sizeUtils";
import Loading from "./common/Loading";
import DownloadProgressBar from "./DownloadProgressBar"; // Import the new component

export default function URLSearchBar() {
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false); // Renamed from 'download' for clarity
  const [currentDownloadId, setCurrentDownloadId] = useState(null); // New state for download ID
  const [downloadError, setDownloadError] = useState(""); // For errors from the download process itself

  const API_BASE_URL = import.meta.env.VITE_API_URL_DEV;

  const validateURL = (input) => {
    try {
      new URL(input);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null); // Clear previous results
    setSelectedFormat(null); // Clear selected format
    setIsDownloading(false); // Reset download state
    setCurrentDownloadId(null); // Reset download ID
    setDownloadError(""); // Clear download errors

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!validateURL(url)) {
      setError("Please enter a valid URL (include http:// or https://)");
      return;
    }

    setLoading(true);
    try {
      const formatData = await getVideoFormats(url);

      // Convert formatData into options for dropdown
      const videoOptions = formatData.map((el) => ({
        format_id: el.isMuxed
          ? el.format_id
          : `${String(el.audio_id)}+${String(el.video_id)}`,
        resolution: el.resolution,
        isMuxed: el.isMuxed,
        url,
        filesize: calculateTotalSize(
          el.isMuxed ? el.filesize : el.filesize_video + el.filesize_audio
        ),
        totalSize: el.isMuxed
          ? el.filesize
          : el.filesize_video + el.filesize_audio,
        format: el.format,
        label: el.label,
      }));

      setResult({ formatData, videoOptions });
      setLoading(false);
    } catch (err) {
      setError("Failed to process URL. Please try again.");
      setResult(null);
      setLoading(false);
    }
  };

  const handleSelect = (selectedOption) => {
    setSelectedFormat(selectedOption);
  };

  const handleDownloadClick = async () => {
    if (!selectedFormat) {
      setError("Please select a format to download.");
      return;
    }

    setError(""); // Clear general errors
    setDownloadError(""); // Clear specific download errors
    setIsDownloading(true);

    // Generate a unique download ID for this session
    const newDownloadId =
      Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    setCurrentDownloadId(newDownloadId);

    try {
      console.log("Initiating download for format:", selectedFormat);

      // Construct the download URL including the format and the new downloadId
      const downloadUrl = `${API_BASE_URL}/api/download?url=${encodeURIComponent(
        url
      )}&format=${encodeURIComponent(selectedFormat.format_id)}&totalSize=${
        selectedFormat.totalSize || ""
      }&downloadId=${newDownloadId}`;

      // Trigger the file download by redirecting the browser
      // This will cause the browser to open the download dialog
      window.location.href = downloadUrl;

      // The rest of the download progress will be handled by the SSE in DownloadProgressBar
      // We don't wait for a blob here.
    } catch (err) {
      console.error("Error initiating client-side download:", err);
      setDownloadError(
        "An error occurred while preparing the download. Please try again."
      );
      setIsDownloading(false);
      setCurrentDownloadId(null);
    }
  };

  // Callback for DownloadProgressBar to reset UI on completion/error
  const handleProgressComplete = () => {
    setIsDownloading(false);
    setCurrentDownloadId(null);
    setDownloadError("");
    console.log(
      "Download process finished (either complete or external trigger)"
    );
    // Optionally, clear the selected format or result after download
    // setSelectedFormat(null);
    // setResult(null);
  };

  const handleProgressError = (message) => {
    setDownloadError(message);
    setIsDownloading(false);
    setCurrentDownloadId(null);
    console.log("Download process encountered an error via SSE:", message);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center text-white">
        YouTube Video Downloader
      </h2>

      <div className="mb-6">
        <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden shadow-sm bg-gray-800">
          <FaLink size={20} className="text-gray-400 ml-4 font-extralight" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube video URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
            className="flex-grow px-4 py-3 text-sm text-white bg-gray-800 focus:outline-none placeholder:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || isDownloading}
            className="bg-[#6C4CFF] hover:bg-[#A68FFF] text-white px-6 py-3 flex items-center transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <Search size={20} className="mr-2" />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>

        {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
      </div>

      {result && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          {result.videoOptions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <YouTubeEmbed src={url} />
                <div className="flex flex-col gap-4">
                  <CustomDropdown
                    options={result.videoOptions}
                    onSelect={handleSelect}
                    disabled={isDownloading} // Disable dropdown during download
                  />
                  {selectedFormat && (
                    <p className="text-gray-400 text-sm">
                      Selected: {selectedFormat.label} (Total Size:{" "}
                      {selectedFormat.filesize || "N/A"})
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  className="bg-[#5244f7] hover:bg-[#A68FFF] text-white px-6 py-3 w-full md:w-3/6 rounded-md flex justify-center items-center gap-2 transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDownloading || !selectedFormat} // Disable if downloading or no format selected
                  onClick={handleDownloadClick}
                >
                  {isDownloading ? (
                    <Loading /> // Or a "Preparing Download..." text
                  ) : (
                    <>
                      <IoMdDownload size={25} />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <p className="text-white">No downloadable formats available.</p>
          )}
        </div>
      )}

      {isDownloading && currentDownloadId && (
        <div className="mt-6">
          <DownloadProgressBar
            downloadId={currentDownloadId}
            onDownloadComplete={handleProgressComplete}
            onDownloadError={handleProgressError}
          />
        </div>
      )}

      {downloadError && (
        <div className="mt-2 text-red-500 text-sm">{downloadError}</div>
      )}

      <div className="mt-6 text-sm text-gray-400 text-center">
        <p>
          Enter a YouTube video URL to fetch available formats and download your
          desired resolution.
        </p>
      </div>
    </div>
  );
}
