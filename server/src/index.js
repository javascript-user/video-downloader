// require("dotenv").config();
// const express = require("express");
// const fs = require("fs");
// const path = require("path");
// const { spawn } = require("child_process");
// const cors = require("cors");

// const app = express();
// const secretPath = "/etc/secrets/COOKIES_BASE64";
// // const cookiesPath = path.resolve(__dirname, "../bin/cookies.txt");
// const cookiesPath = "/tmp/yt-cookies.txt";

// if (fs.existsSync(secretPath)) {
//   const base64 = fs.readFileSync(secretPath, "utf8").trim();
//   const decoded = Buffer.from(base64, "base64").toString("utf8");

//   fs.mkdirSync(path.dirname(cookiesPath), { recursive: true });
//   fs.writeFileSync(cookiesPath, decoded);
//   console.log("cookies.txt written from secret file");
// } else {
//   console.warn("COOKIES_BASE64 secret file not found");
// }

// const ytDlpPath = path.resolve(__dirname, "../bin/yt-dlp");

// const {
//   parseYTDLP,
//   filterFormats,
//   buildAudioResponse,
//   buildVideoResponse,
//   buildMergedResponse,
//   filterMuxedRes,
//   buildYTDLArgs,
// } = require("./utils/ytUtils");

// app.use(
//   cors({
//     origin: true,
//     credentials: true,
//   })
// );
// app.use(express.json());

// app.get("/", (req, res) => {
//   res.send("Home Page");
// });

// app.get("/api/formats", async (req, res) => {
//   const { url, type } = req.query;

//   if (!url) return res.status(400).json({ error: "Missing URL" });

//   try {
//     const args = buildYTDLArgs(url, ["-j"]);
//     const json = await parseYTDLP(args);
//     const formats = json.formats || [];
//     const { videoOnly, audioOnly, muxed } = filterFormats(formats);

//     let responseFormats = [];

//     switch (type) {
//       case "audio":
//         responseFormats = buildAudioResponse(audioOnly);
//         break;
//       case "video":
//         responseFormats = buildVideoResponse(videoOnly);
//         break;
//       case "both":
//       default:
//         responseFormats = buildMergedResponse(videoOnly, audioOnly, muxed);
//         break;
//     }
//     const filtered = filterMuxedRes(responseFormats);
//     res.send(filtered);
//   } catch (err) {
//     res.status(500).json({ error: err.toString() });
//   }
// });

// // Route to handle video download requests
// app.get("/api/download", (req, res) => {
//   const { url, format, totalSize } = req.query;
//   if (!url) return res.status(400).send("Missing video URL");

//   const fallbackFormat =
//     "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";

//   function streamDownload(selectedFormat, isFallback = false) {
//     const args = ["-f", selectedFormat, "-o", "-", url];

//     if (fs.existsSync(cookiesPath)) {
//       args.unshift("--cookies", cookiesPath);
//     } else {
//       console.warn("cookies.txt missing — may hit 429 errors.");
//     }

//     const dlProc = spawn(ytDlpPath, args);
//     let stderr = "";

//     dlProc.stderr.on("data", (data) => {
//       stderr += data.toString();
//     });

//     let downloadedBytes = 0;

//     dlProc.stdout.on("data", (chunk) => {
//       downloadedBytes += chunk.length;
//       console.log(
//         `Downloaded chunk: ${chunk.length}, Total: ${downloadedBytes}`
//       );
//     });

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="download.${
//         selectedFormat.includes("audio") ? "m4a" : "mp4"
//       }"`
//     );
//     res.setHeader("Content-Type", "application/octet-stream");

//     dlProc.stdout.pipe(res);

//     res.on("close", () => {
//       dlProc.kill("SIGKILL");
//     });

//     dlProc.on("error", (err) => {
//       console.error("yt-dlp spawn failed:", err);
//       res.status(500).send("Internal server error");
//     });

//     dlProc.on("close", (code) => {
//       if (code !== 0) {
//         console.warn(`yt-dlp exited with code ${code}`);
//         console.warn("stderr:", stderr);

//         if (!isFallback) {
//           console.log("Falling back to best format...");
//           streamDownload(fallbackFormat, true); // Retry with fallback
//         } else {
//           res.status(500).send("Video download failed.");
//         }
//       }
//     });
//   }

//   // Kick off initial download
//   streamDownload(format || fallbackFormat, false);
// });

// app.listen(process.env.PORT, () =>
//   console.log(`server was listning on ${process.env.PORT}`)
// );

require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const cors = require("cors");
const readline = require("readline");

const app = express();
const secretPath = "/etc/secrets/COOKIES_BASE64";
const cookiesPath = "/tmp/yt-cookies.txt";

if (fs.existsSync(secretPath)) {
  const base64 = fs.readFileSync(secretPath, "utf8").trim();
  const decoded = Buffer.from(base64, "base64").toString("utf8");

  fs.mkdirSync(path.dirname(cookiesPath), { recursive: true });
  fs.writeFileSync(cookiesPath, decoded);
  console.log("cookies.txt written from secret file");
} else {
  console.warn("COOKIES_BASE64 secret file not found");
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
    const json = await parseYTDLP(args);
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

// Store active download processes to send progress updates
const activeDownloads = new Map(); // Map<downloadId, { progressStream: Response, dlProc: ChildProcess }>

app.get("/api/download", (req, res) => {
  const { url, format, totalSize, downloadId } = req.query;
  if (!url) return res.status(400).send("Missing video URL");
  if (!downloadId) return res.status(400).send("Missing download ID");

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
    let stderrBuffer = ""; // Use a buffer to accumulate stderr data for parsing

    // Store the process for potential later kill if client disconnects
    if (activeDownloads.has(downloadId)) {
      // If a download process already exists for this ID, kill the old one
      // This handles cases where a client might re-request the same ID before previous completion
      const existingDl = activeDownloads.get(downloadId);
      if (existingDl.dlProc) {
        existingDl.dlProc.kill("SIGKILL");
      }
      // Update the existing entry with the new process
      activeDownloads.get(downloadId).dlProc = dlProc;
    } else {
      // This case should ideally not happen for the download endpoint as the SSE endpoint
      // should create the entry first. However, good to have a fallback.
      activeDownloads.set(downloadId, { dlProc: dlProc, progressStream: null });
    }

    // Set up readline interface to parse stderr line by line
    const rl = readline.createInterface({
      input: dlProc.stderr,
      output: process.stdout, // This is just for logging, can be removed
      terminal: false,
    });

    const progressRegex =
      /\[download\]\s+(\d+\.?\d*)% of (.*?) at (.*?) ETA (.*)/;
    const finallizingRegex = /\[download\] Destination: /; // Indicates download completion or near completion
    const alreadyDownloadedRegex =
      /\[download\] (.*) has already been downloaded/; // If file already exists

    rl.on("line", (line) => {
      // console.log(`[yt-dlp stderr]: ${line}`); // For debugging
      stderrBuffer += line + "\n"; // Accumulate for potential full error message

      const progressMatch = line.match(progressRegex);
      if (progressMatch) {
        const progressData = {
          downloadId,
          type: "progress",
          percent: parseFloat(progressMatch[1]),
          size: progressMatch[2].trim(),
          speed: progressMatch[3].trim(),
          eta: progressMatch[4].trim(),
        };
        // Send progress to the SSE client
        const progressRes = activeDownloads.get(downloadId)?.progressStream;
        if (progressRes && !progressRes.finished) {
          progressRes.write(`data: ${JSON.stringify(progressData)}\n\n`);
        }
      } else if (line.match(finallizingRegex)) {
        const progressRes = activeDownloads.get(downloadId)?.progressStream;
        if (progressRes && !progressRes.finished) {
          progressRes.write(
            `data: ${JSON.stringify({
              downloadId,
              type: "status",
              message: "Finalizing...",
            })}\n\n`
          );
        }
      } else if (line.match(alreadyDownloadedRegex)) {
        const progressRes = activeDownloads.get(downloadId)?.progressStream;
        if (progressRes && !progressRes.finished) {
          progressRes.write(
            `data: ${JSON.stringify({
              downloadId,
              type: "status",
              message: "Already downloaded, serving...",
              percent: 100,
            })}\n\n`
          );
        }
      }
    });

    dlProc.stdout.on("data", (chunk) => {
      // The file content is being piped directly to `res`,
      // so no need to explicitly track downloadedBytes here if `res` handles it.
      // However, if you want to update `totalSize` dynamically, you'd need to parse it from stderr.
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
      console.log(`Client for downloadId ${downloadId} disconnected.`);
      dlProc.kill("SIGKILL");
      activeDownloads.delete(downloadId); // Clean up on client disconnect
    });

    dlProc.on("error", (err) => {
      console.error("yt-dlp spawn failed:", err);
      // Send error to SSE client
      const progressRes = activeDownloads.get(downloadId)?.progressStream;
      if (progressRes && !progressRes.finished) {
        progressRes.write(
          `data: ${JSON.stringify({
            downloadId,
            type: "error",
            message: "Internal server error: yt-dlp spawn failed.",
          })}\n\n`
        );
        progressRes.end(); // Close SSE stream on error
      }
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
      activeDownloads.delete(downloadId);
    });

    dlProc.on("close", (code) => {
      const progressRes = activeDownloads.get(downloadId)?.progressStream;
      if (code !== 0) {
        console.warn(`yt-dlp exited with code ${code}`);
        console.warn("stderr:", stderrBuffer); // Log accumulated stderr

        if (!isFallback) {
          console.log("Falling back to best format...");
          streamDownload(fallbackFormat, true); // Retry with fallback
        } else {
          // Send final error to SSE client
          if (progressRes && !progressRes.finished) {
            progressRes.write(
              `data: ${JSON.stringify({
                downloadId,
                type: "error",
                message: "Video download failed after retry.",
              })}\n\n`
            );
            progressRes.end();
          }
          if (!res.headersSent) {
            res.status(500).send("Video download failed.");
          }
          activeDownloads.delete(downloadId);
        }
      } else {
        // Send completion message to SSE client
        if (progressRes && !progressRes.finished) {
          progressRes.write(
            `data: ${JSON.stringify({
              downloadId,
              type: "complete",
              message: "Download complete!",
            })}\n\n`
          );
          progressRes.end(); // Close SSE stream on completion
        }
        console.log(`Download for ${downloadId} completed successfully.`);
        activeDownloads.delete(downloadId);
      }
    });
  }

  // Kick off initial download
  streamDownload(format || fallbackFormat, false);
});

// SSE endpoint for progress updates
app.get("/api/download/progress", (req, res) => {
  const { downloadId } = req.query;
  if (!downloadId) {
    return res.status(400).send("Missing download ID for progress updates.");
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for Nginx/Apache

  // If a download is already in progress with this ID, attach this response stream to it.
  // Otherwise, create a new entry.
  if (activeDownloads.has(downloadId)) {
    activeDownloads.get(downloadId).progressStream = res;
    console.log(`Attached progress stream for downloadId: ${downloadId}`);
  } else {
    // This scenario means the progress request came before the download request,
    // or the download request failed to register.
    // For robust production, you might want to consider queuing or erroring.
    // For this example, we'll create a placeholder.
    activeDownloads.set(downloadId, { dlProc: null, progressStream: res });
    console.warn(`Download process not yet registered for ID: ${downloadId}`);
  }

  // Send an initial handshake message
  res.write(
    `data: ${JSON.stringify({
      downloadId,
      type: "status",
      message: "Connected to progress stream.",
    })}\n\n`
  );

  req.on("close", () => {
    console.log(`Progress client for ${downloadId} disconnected.`);
    // Do not kill dlProc here, as the download might still be in progress
    // The dlProc will be killed when the file download connection closes.
    // However, clean up the progressStream reference.
    const downloadEntry = activeDownloads.get(downloadId);
    if (downloadEntry) {
      downloadEntry.progressStream = null; // Detach the response stream
    }
    // Note: The entry for `downloadId` is fully deleted when the main file download stream closes.
  });
});

app.listen(process.env.PORT, () =>
  console.log(`server was listning on ${process.env.PORT}`)
);
