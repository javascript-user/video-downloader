// ytUtils.js
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const ytDlpPath = path.resolve(__dirname, "../../bin/yt-dlp");

// const cookiesPath = path.resolve(__dirname, "../../bin/cookies.txt");
const cookiesPath = "/tmp/yt-cookies.txt";

function buildYTDLArgs(url, extraArgs = []) {
  const args = [...extraArgs, url];

  if (fs.existsSync(cookiesPath)) {
    args.unshift("--cookies", cookiesPath);
  } else {
    console.warn("cookies.txt missing — 429 risk");
  }

  return args;
}

function parseYTDLP(args) {
  console.log("Cookies exists:", fs.existsSync(cookiesPath));
  console.log("Args:", args);
  return new Promise((resolve, reject) => {
    const ytdlp = spawn(ytDlpPath, args);

    let output = "";
    let error = "";

    ytdlp.stdout.on("data", (data) => (output += data.toString()));
    ytdlp.stderr.on("data", (data) => (error += data.toString()));

    ytdlp.on("close", (code) => {
      if (code !== 0) return reject(error || "yt-dlp exited with error");

      try {
        const json = JSON.parse(output);
        resolve(json);
      } catch (e) {
        reject("Failed to parse yt-dlp output");
      }
    });
  });
}

function filterFormats(formats) {
  const valid = formats.filter((f) => {
    if (!f.url) return false;
    if (f.vcodec === "none" && f.acodec === "none") return false;
    if (f.format_note?.toLowerCase().includes("storyboard")) return false;
    const allowed = ["mp4", "webm", "m4a"];
    return allowed.includes(f.ext);
  });

  const videoOnly = valid.filter(
    (f) =>
      f.vcodec !== "none" &&
      f.acodec === "none" &&
      (f.filesize || f.filesize_approx)
  );
  const audioOnly = valid.filter(
    (f) =>
      f.acodec !== "none" &&
      f.vcodec === "none" &&
      f.abr > 0 &&
      !f.format_id.includes("-drc") &&
      (f.filesize || f.filesize_approx)
  );
  const muxed = valid.filter((f) => f.vcodec !== "none" && f.acodec !== "none");

  return { videoOnly, audioOnly, muxed };
}

function buildAudioResponse(audioOnly) {
  return audioOnly.map((a) => ({
    id: a.format_id,
    format: a.ext,
    abr: a.abr,
    filesize: a.filesize,
    note: `${a.abr} kbps ${a.ext}`,
  }));
}

function buildVideoResponse(videoOnly) {
  return videoOnly.map((v) => ({
    id: v.format_id,
    format: v.ext,
    video_filesize: v.filesize,
    resolution: v.height,
    fps: v.fps,
    filesize: v.filesize,
    note: `${v.height}p ${v.ext}`,
  }));
}

function buildMergedResponse(videoOnly, audioOnly, muxed) {
  const merged = [];

  for (const m of muxed) {
    if (!m.height || !m.format_id) continue;

    merged.push({
      isMuxed: true,
      format_id: m.format_id,
      format: m.ext,
      resolution: m.height,
      fps: m.fps,
      abr: m.abr || null,
      filesize: m.filesize || m.filesize_approx || null,
      label: `${m.height}p ${m.ext}`,
    });
  }

  const addedRes = new Set();

  videoOnly
    .filter((v) => v.ext === "mp4" && v.height)
    .sort((a, b) => b.height - a.height)
    .forEach((v) => {
      if (addedRes.has(v.height)) return;

      const audio = audioOnly
        .filter((a) => ["m4a", "mp4"].includes(a.ext))
        .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

      if (!audio) return;

      merged.push({
        isMuxed: false,
        video_id: v.format_id,
        audio_id: audio.format_id,
        resolution: v.height,
        format: v.ext,
        fps: v.fps,
        abr: audio.abr,
        filesize_video: v.filesize,
        filesize_audio: audio.filesize,
        label: `${v.height}p ${v.ext}`,
      });

      addedRes.add(v.height);
    });

  return merged.sort((a, b) => b.resolution - a.resolution);
}

function filterMuxedRes(arr) {
  return Object.values(
    arr.reduce((acc, obj) => {
      const key = obj.resolution;

      if (!acc[key]) {
        acc[key] = obj;
      } else if (!acc[key].isMuxed && obj.isMuxed) {
        acc[key] = obj;
      }

      return acc;
    }, {})
  );
}

module.exports = {
  parseYTDLP,
  filterFormats,
  buildAudioResponse,
  buildVideoResponse,
  buildMergedResponse,
  filterMuxedRes,
  buildYTDLArgs,
};
