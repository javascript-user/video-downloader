require("dotenv").config();
const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const cors = require("cors");
const {
  parseYTDLP,
  filterFormats,
  buildAudioResponse,
  buildVideoResponse,
  buildMergedResponse,
  filterMuxedRes,
} = require("./utils/data");

app.use(cors());

app.use(express.json());

app.get("/api/formats", async (req, res) => {
  const { url, type } = req.query;

  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const json = await parseYTDLP(url);
    // console.log(json);
    const formats = json.formats || [];
    const { videoOnly, audioOnly, muxed } = filterFormats(formats);

    let responseFormats = [];

    switch (type) {
      case "audio":
        responseFormats = buildAudioResponse(audioOnly);
        break;
      case "video":
        responseFormats = buildVideoResponse(videoOnly);
        break;
      case "both":
      default:
        responseFormats = buildMergedResponse(videoOnly, audioOnly, muxed);
        break;
    }
    const filtered = filterMuxedRes(responseFormats);
    res.send(filtered);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.get("/api/download", (req, res) => {
  const { url, format_id } = req.query;

  // Set up file name and path to OS Downloads dir
  const safeFilename = `video_${Date.now()}.mp4`;
  const downloadsDir = path.join(os.homedir(), "Downloads");
  const filePath = path.join(downloadsDir, safeFilename);

  // Choose correct args based on muxed vs separate
  const args = ["-f", format_id, "-o", filePath, url];

  const ytdlp = spawn("yt-dlp", args);

  ytdlp.stdout.on("data", (data) => {
    console.log(`[yt-dlp]: ${data}`);
  });

  ytdlp.stderr.on("data", (data) => {
    console.error(`[yt-dlp error]: ${data}`);
  });

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      console.error(`yt-dlp exited with code ${code}`);
      return res.status(500).send("Download failed.");
    }

    // Successfully downloaded to OS Downloads
    return res.json({
      success: true,
      message: "Downloaded successfully.",
      path: filePath,
      filename: safeFilename,
    });
  });
});

app.get("/", (req, res) => {
  res.send("Home Page");
});

app.listen(process.env.PORT, () =>
  console.log(`server was listning on ${process.env.PORT}`)
);
