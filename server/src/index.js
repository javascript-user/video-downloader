require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const cors = require("cors");

const app = express();
const cookiesPath = path.resolve(__dirname, "../bin/cookies.txt");

const cookiesBase64 = process.env.COOKIES_BASE64;
// const cookiesPath = path.join(__dirname, "bin", "cookies.txt");

if (cookiesBase64) {
  fs.mkdirSync(path.dirname(cookiesPath), { recursive: true });
  fs.writeFileSync(cookiesPath, Buffer.from(cookiesBase64, "base64"));
  console.log("cookies.txt written from base64 env");
}
const ytDlpPath = path.resolve(__dirname, "../bin/yt-dlp");

const {
  parseYTDLP,
  filterFormats,
  buildAudioResponse,
  buildVideoResponse,
  buildMergedResponse,
  filterMuxedRes,
  buildYTDLArgs,
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
    const args = buildYTDLArgs(url, ["-j"]);
    console.log("Cookies exists:", fs.existsSync(cookiesPath));
    console.log("Args:", args);
    const json = await parseYTDLP(args);
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

  function streamDownload(selectedFormat, isFallback = false) {
    const args = ["-f", selectedFormat, "-o", "-", url];

    if (fs.existsSync(cookiesPath)) {
      args.unshift("--cookies", cookiesPath);
    } else {
      console.warn("cookies.txt missing — may hit 429 errors.");
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

        if (!isFallback) {
          console.log("Falling back to best format...");
          streamDownload(fallbackFormat, true); // Retry with fallback
        } else {
          res.status(500).send("Video download failed.");
        }
      }
    });
  }

  // Kick off initial download
  streamDownload(format || fallbackFormat, false);
});

app.listen(process.env.PORT, () =>
  console.log(`server was listning on ${process.env.PORT}`)
);
