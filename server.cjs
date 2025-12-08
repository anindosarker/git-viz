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

// Import from backend package
const { GitLogService } = require("@git-viz/backend/GitLogService");
const { GitRepoService } = require("@git-viz/backend/GitRepoService");

app.get("/api/log", async (req, res) => {
  try {
    const log = await GitLogService.getLog(repoPath);
    res.json(log);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/repo-info", async (req, res) => {
  try {
    const info = await GitRepoService.getRepoInfo(repoPath);
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving repo: ${repoPath}`);
});
