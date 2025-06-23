require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const cors = require("cors");

const app = express();
const ytDlpPath = path.resolve(__dirname, "../bin/yt-dlp");
const cookiesPath = path.resolve(__dirname, "./cookies.txt");

const {
  parseYTDLP,
  filterFormats,
  buildAudioResponse,
  buildVideoResponse,
  buildMergedResponse,
  filterMuxedRes,
} = require("./utils/ytUtils");

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Home Page");
});

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

// Route to handle video download requests
app.get("/api/download", (req, res) => {
  const { url, format } = req.query;
  if (!url) return res.status(400).send("Missing video URL");

  const fallbackFormat =
    "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";

  function streamDownload(selectedFormat) {
    const args = ["-f", selectedFormat, "-o", "-", url];

    if (fs.existsSync(cookiesPath)) {
      args.unshift("--cookies", cookiesPath);
    }

    const dlProc = spawn(ytDlpPath, args);
    let stderr = "";

    dlProc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    dlProc.stdout.on("error", (err) => {
      console.error("stdout error:", err);
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="download.${
        selectedFormat.includes("audio") ? "m4a" : "mp4"
      }"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    dlProc.stdout.pipe(res);

    res.on("close", () => {
      dlProc.kill("SIGKILL");
    });

    dlProc.on("error", (err) => {
      console.error("yt-dlp spawn failed:", err);
      res.status(500).send("Internal server error");
    });

    dlProc.on("close", (code) => {
      if (code !== 0) {
        console.warn(`yt-dlp exited with code ${code}`);
        console.warn("stderr:", stderr);

        if (selectedFormat !== fallbackFormat) {
          console.log("Falling back to best format...");
          streamDownload(fallbackFormat); // Retry with fallback
        } else {
          res.status(500).send("Video download failed.");
        }
      }
    });
  }

  // Kick off initial download
  streamDownload(format || fallbackFormat);
});

app.listen(process.env.PORT, () =>
  console.log(`server was listning on ${process.env.PORT}`)
);
