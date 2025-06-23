import axios from "axios";
const domain = import.meta.env.VITE_API_URL_PROD;

const getVideoFormats = async (url) => {
  console.log(url);
  try {
    const response = await axios.get(`${domain}/api/formats`, {
      params: { url, type: "both" },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching video formats:", error);
    throw error;
  }
};

const downloadVideo = async (data) => {
  try {
    const response = await axios.get(`${domain}/api/download`, {
      params: data,
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "video/mp4" });
    console.log(blob);
    return blob;
  } catch (err) {
    console.error("Download failed:", err);
  }
};

export { getVideoFormats, downloadVideo };
