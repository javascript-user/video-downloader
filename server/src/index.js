require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ytDlpPath = path.resolve(__dirname, "../bin/yt-dlp");

const DOWNLOAD_FOLDER = "downloads";

if (!fs.existsSync(DOWNLOAD_FOLDER)) {
  fs.mkdirSync(DOWNLOAD_FOLDER);
}

const app = express();
const cors = require("cors");
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

app.use(express.static("public"));

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
app.get("/api/download", async (req, res) => {
  const videoUrl = req.query.url;
  const browserType = "none"; // 'chrome', 'firefox', 'edge' or 'none'

  if (!videoUrl) {
    return res.status(400).send("Error: Please provide a video URL.");
  }

  // Generate a unique ID for this download session to manage temporary files
  const uniqueId = new Date();
  const outputTemplate = path.join(
    DOWNLOAD_FOLDER,
    `${uniqueId}_%(title)s.%(ext)s`
  );

  let ytDlpArgs = [
    "-f",
    "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
    "-o",
    outputTemplate,
    "--no-playlist",
    "--restrict-filenames",
    videoUrl,
  ];

  // Add browser cookie option if provided
  if (browserType !== "none") {
    ytDlpArgs.unshift(`--cookies-from-browser=${browserType}`);
    console.log(`Using cookies from browser: ${browserType}`);
  }

  console.log(`Initiating download for: ${videoUrl}`);
  console.log(`yt-dlp command: yt-dlp ${ytDlpArgs.join(" ")}`);

  try {
    const ytDlpProcess = spawn(ytDlpPath, ytDlpArgs);

    let stdoutBuffer = "";
    let stderrBuffer = "";

    // Capture stdout from yt-dlp (for general info/progress)
    ytDlpProcess.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
    });

    // Capture stderr from yt-dlp (for errors)
    ytDlpProcess.stderr.on("data", (data) => {
      stderrBuffer += data.toString();
      console.error(`yt-dlp stderr: ${data.toString().trim()}`);
    });

    // Handle process exit
    ytDlpProcess.on("close", async (code) => {
      if (code === 0) {
        console.log(`yt-dlp finished successfully for ${videoUrl}.`);

        // Find the actual downloaded file based on the uniqueId prefix
        const downloadedFiles = fs.readdirSync(DOWNLOAD_FOLDER);
        let actualDownloadedFilePath = null;

        for (const file of downloadedFiles) {
          if (file.startsWith(uniqueId)) {
            actualDownloadedFilePath = path.join(DOWNLOAD_FOLDER, file);
            break;
          }
        }

        if (
          actualDownloadedFilePath &&
          fs.existsSync(actualDownloadedFilePath)
        ) {
          const originalFilename = path
            .basename(actualDownloadedFilePath)
            .substring(uniqueId.length + 1); // Remove uniqueId prefix
          console.log(`Sending file to client: ${originalFilename}`);

          // Send the file to the client and automatically set Content-Disposition for download
          res.download(actualDownloadedFilePath, originalFilename, (err) => {
            if (err) {
              if (!res.headersSent) {
                console.error("Error sending file to client:", err);
                res.status(500).send("Error sending file to your browser.");
              } else {
                console.error(
                  "Error sending file (client disconnected?):",
                  err
                );
              }
            } else {
              console.log(
                `File ${originalFilename} successfully sent to client.`
              );
            }

            // IMPORTANT: Clean up the temporary file from the server
            fs.unlink(actualDownloadedFilePath, (unlinkErr) => {
              if (unlinkErr) {
                console.error("Error deleting temporary file:", unlinkErr);
              } else {
                console.log(
                  `Deleted temporary file: ${actualDownloadedFilePath}`
                );
              }
            });
          });
        } else {
          console.error(
            `Error: Could not find downloaded file for ${uniqueId}. yt-dlp output might be in stdout/stderr.`
          );
          res
            .status(500)
            .send(
              `Error: Video download failed on server. No file found. Server logs may have details.`
            );
        }
      } else {
        // yt-dlp exited with an error code
        console.error(
          `yt-dlp process exited with code ${code} for ${videoUrl}.`
        );
        console.error(`yt-dlp stdout:\n${stdoutBuffer}`);
        console.error(`yt-dlp stderr:\n${stderrBuffer}`);
        res
          .status(500)
          .send(
            `Error downloading video: ${
              stderrBuffer || "Unknown yt-dlp error."
            }`
          );
      }
    });

    // Handle errors if the yt-dlp process itself cannot be spawned (e.g., command not found)
    ytDlpProcess.on("error", (err) => {
      console.error("Failed to start yt-dlp process:", err);
      res
        .status(500)
        .send(
          `Failed to start yt-dlp process. Make sure 'yt-dlp' is installed and in your server's PATH. Error: ${err.message}`
        );
    });
  } catch (error) {
    console.error("An unexpected server error occurred:", error);
    res
      .status(500)
      .send(`An unexpected server error occurred: ${error.message}`);
  }
});

app.listen(process.env.PORT, () =>
  console.log(`server was listning on ${process.env.PORT}`)
);
