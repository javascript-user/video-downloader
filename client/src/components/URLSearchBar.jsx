import { useState } from "react";
import { Search } from "lucide-react";
import { downloadVideo, getVideoFormats } from "../api/processUrl-api";
import { FaLink } from "react-icons/fa";
import { IoMdDownload } from "react-icons/io";
import CustomDropdown from "./common/CustomDropdown";
import YouTubeEmbed from "./YouTubeEmbed";
import { calculateTotalSize } from "./utils/sizeUtils";
import Loading from "./common/Loading";

export default function URLSearchBar() {
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [download, setDownload] = useState(false);

  const validateURL = (input) => {
    console.log(url);
    try {
      new URL(input);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleSubmit = async () => {
    setError("");
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
        format: el.format,
        label: el.label,
      }));

      setResult({ formatData, videoOptions }); // store both raw data and dropdown options
      // console.log(result);
      setLoading(false);
    } catch (err) {
      setError("Failed to process URL. Please try again.");
      setResult(null);
      setLoading(false);
    }
  };

  const handleSelect = (selectedOption) => {
    setSelectedFormat(selectedOption);
    console.log("Selected Video URL2:", selectedOption);
  };

  const handleDownloadClick = async () => {
    if (!selectedFormat) {
      setError("Please select a format to download.");
      return;
    }

    setError(""); // Clear previous errors
    setDownload(true);

    try {
      console.log("Initiating download for format:", selectedFormat);
      const blob = await downloadVideo(selectedFormat);

      if (blob) {
        // Extract filename from selectedFormat if available, otherwise fallback
        const suggestedFilename = selectedFormat.label
          ? `${selectedFormat.label.replace(/[^a-zA-Z0-9.-]/g, "_")}.mp4`
          : "downloaded_video.mp4";

        // Create a temporary URL for the Blob
        const url = window.URL.createObjectURL(blob);

        // Create a hidden link element
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedFilename; // Set the filename for download
        document.body.appendChild(a); // Append to body (required for Firefox for programmatic click)
        a.click(); // Programmatically click the link to trigger the download

        // Clean up the temporary URL and the link element
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a); // Clean up the element after clicking

        // Provide success feedback
        setError(""); // Clear any previous errors if successful
        console.log(`Download triggered for: ${suggestedFilename}`);
      } else {
        setError("Download failed: No data received.");
        console.error("Download failed: downloadVideo did not return a blob.");
      }
    } catch (err) {
      console.error("Error during client-side download process:", err);
      setError(
        "An error occurred while preparing the download. Please try again."
      );
    } finally {
      setDownload(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-center text-white">
        URL Analyzer
      </h2>

      <div className="mb-6">
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          <FaLink
            size={20}
            className="text-[#AAAAAA] ml-4 font-extralight hover:animate-loading"
          />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste URL (e.g., https://example.com)"
            className="flex-grow px-4 py-3 text-sm text-white focus:outline-none placeholder:text-[#AAAAAA] placeholder:bg-black"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#6C4CFF] hover:bg-[#A68FFF] text-white px-6 py-3 flex items-center transition-colors"
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

        {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
      </div>

      {result && (
        <div className="bg-[#0d0d0d] p-4 rounded-lg border border-gray-200">
          {/* <h3 className="font-semibold text-lg mb-2">Available Formats</h3> */}

          {result.videoOptions.length > 0 ? (
            <>
              <div className="grid grid-cols-2 items-baseline-end ">
                <YouTubeEmbed src={url} />
                <CustomDropdown
                  options={result.videoOptions}
                  onSelect={handleSelect}
                />
              </div>
              <div className="flex justify-end">
                <button
                  className="bg-[#5244f7] hover:bg-[#A68FFF] text-white px-6 py-3 w-3/6 rounded-md flex justify-center"
                  disabled={download}
                  onClick={handleDownloadClick}
                >
                  {download ? (
                    <Loading />
                  ) : (
                    <div className="flex justify-center gap-4">
                      <IoMdDownload size={25} className="" />
                      <span>Download</span>
                    </div>
                  )}
                </button>
              </div>
            </>
          ) : (
            <p>No downloadable formats available.</p>
          )}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p>
          Enter any URL to analyze it. The URL will be sent to the backend for
          processing.
        </p>
      </div>
    </div>
  );
}
