import { useState } from "react";
import { Search } from "lucide-react";
import { downloadVideo, getVideoFormats } from "../api/processUrl-api";
import { FaLink } from "react-icons/fa";
import CustomDropdown from "./common/CustomDropdown";
import YouTubeEmbed from "./YouTubeEmbed";
import { calculateTotalSize } from "./utils/sizeUtils";

export default function URLSearchBar() {
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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

  const handleClick = async () => {
    console.log("Selected Video URL1", selectedFormat);
    return await downloadVideo(selectedFormat);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-center text-white">
        URL Analyzer
      </h2>

      <div className="mb-6">
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden shadow-sm">
          <FaLink size={20} className="text-[#AAAAAA] ml-4 font-extralight" />
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
                  className="bg-[#5244f7] hover:bg-[#A68FFF] text-white px-6 py-3 w-3/5 rounded-md"
                  onClick={handleClick}
                >
                  Download
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
