const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const cors = require("cors");

const app = express();
const port = 3000;

// Get repo path from args or default to current dir
const repoPath = process.argv[2] || process.cwd();

app.use(cors());
app.use(express.json());

// Serve static files from web/dist
app.use(express.static(path.join(__dirname, "web", "dist")));

function execGit(args, cwd) {
  return new Promise((resolve, reject) => {
    const process = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => (stdout += data.toString()));
    process.stderr.on("data", (data) => (stderr += data.toString()));

    process.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr));
    });
  });
}

async function getLog(cwd) {
  const format = "%H%n%P%n%an%n%ae%n%ad%n%D%n%s";
  try {
    const output = await execGit(
      [
        "log",
        "--all",
        "--decorate",
        "--date=iso-strict",
        `--format=${format}`,
        "-n",
        "1000",
      ],
      cwd
    );

    const lines = output.split("\n");
    const commits = [];
    let currentCommit = {};
    let state = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
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
    return commits;
  } catch (error) {
    console.error("Git log error:", error);
    return [];
  }
}

app.get("/api/log", async (req, res) => {
  const log = await getLog(repoPath);
  res.json(log);
});

app.get("/api/repo-info", async (req, res) => {
  try {
    const repoRoot = await execGit(["rev-parse", "--show-toplevel"], repoPath);
    const branch = await execGit(["branch", "--show-current"], repoPath);
    const repoName = repoRoot.split("/").pop() || "";
    res.json({ repo: repoName, branch });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving repo: ${repoPath}`);
});
