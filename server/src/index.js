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

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

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

  if (!url || !format_id)
    return res.status(400).send("Missing URL or format_id");

  const safeFilename = `video_${Date.now()}.mp4`;
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename}"`
  );
  res.setHeader("Content-Type", "video/mp4");

  const format =
    typeof format_id === "string" && format_id.trim()
      ? format_id.trim()
      : "best[ext=mp4]/best";

  const args = ["-f", format, "-o", "-", url];

  const ytdlp = spawn("yt-dlp", args);

  ytdlp.stdout.pipe(res); // stream output to client browser

  ytdlp.stderr.on("data", (data) => {
    console.error(`[yt-dlp error]: ${data}`);
  });

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      console.error(`yt-dlp exited with code ${code}`);
      // res.end() is likely already called; consider error handling with middleware/logging
    }
  });
});

app.get("/", (req, res) => {
  res.send("Home Page");
});

app.listen(process.env.PORT, () =>
  console.log(`server was listning on ${process.env.PORT}`)
);
