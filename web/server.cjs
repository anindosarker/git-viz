const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 3000;
const REPO_PATH = process.argv[2] || process.cwd();

console.log(`Starting Git Viz Server...`);
console.log(`Target Repository: ${REPO_PATH}`);

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // API Endpoint: /api/log
  if (req.url === "/api/log") {
    const args = [
      "log",
      "--all",
      "--decorate",
      "--date=iso-strict",
      "--format=%H%n%P%n%an%n%ae%n%ad%n%D%n%s",
      "-n",
      "1000", // Fetch 1000 commits
    ];

    const git = spawn("git", args, { cwd: REPO_PATH });
    let data = "";
    let error = "";

    git.stdout.on("data", (chunk) => {
      data += chunk;
    });

    git.stderr.on("data", (chunk) => {
      error += chunk;
    });

    git.on("close", (code) => {
      if (code !== 0) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error || "Git command failed" }));
        return;
      }

      // Parse git log output
      const lines = data.split("\n");
      const commits = [];
      let currentCommit = null;
      let state = 0; // 0: Hash, 1: Parents, 2: Author, 3: Email, 4: Date, 5: Refs, 6: Message

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // If we are expecting a new commit (state 0) and line is empty, skip
        if (state === 0 && line.trim() === "") continue;

        if (state === 0) {
          currentCommit = {
            hash: line.trim(),
            parents: [],
            author: "",
            email: "",
            date: "",
            refs: [],
            message: "",
          };
          state++;
        } else if (state === 1) {
          currentCommit.parents = line.trim() ? line.trim().split(" ") : [];
          state++;
        } else if (state === 2) {
          currentCommit.author = line.trim();
          state++;
        } else if (state === 3) {
          currentCommit.email = line.trim();
          state++;
        } else if (state === 4) {
          currentCommit.date = line.trim();
          state++;
        } else if (state === 5) {
          currentCommit.refs = line.trim()
            ? line
                .trim()
                .split(", ")
                .map((r) => r.trim())
            : [];
          state++;
        } else if (state === 6) {
          currentCommit.message = line.trim();
          commits.push(currentCommit);
          state = 0;
        }
      }

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(commits));
    });
    return;
  }

  // Serve Static Files
  let filePath = path.join(
    __dirname,
    "dist",
    req.url === "/" ? "index.html" : req.url
  );
  const extname = path.extname(filePath);
  let contentType = MIME_TYPES[extname] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Fallback to index.html for SPA routing (if needed, though mostly single page)
        fs.readFile(
          path.join(__dirname, "dist", "index.html"),
          (err, content) => {
            if (err) {
              res.writeHead(404);
              res.end("404 Not Found");
            } else {
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(content);
            }
          }
        );
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Viewing repository: ${REPO_PATH}`);
});
