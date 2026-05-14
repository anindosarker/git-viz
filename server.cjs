const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const port = Number(process.env.PORT) || 3000;

const repoPath = process.argv[2] || process.cwd();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "web", "dist")));

const {
  GitLogService,
} = require("./backend/dist/git/GitLogService");
const {
  GitRepoService,
} = require("./backend/dist/git/GitRepoService");
const {
  GitBootstrapService,
} = require("./backend/dist/git/GitBootstrapService");
const {
  GitRefService,
} = require("./backend/dist/git/GitRefService");
const {
  GitRemoteService,
} = require("./backend/dist/git/GitRemoteService");

function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err && err.message ? err.message : String(err) });
    }
  };
}

app.get("/api/repo", wrap(async (req, res) => {
  const info = await GitRepoService.getRepoInfo(repoPath);
  res.json(info);
}));

app.get("/api/repo-info", wrap(async (req, res) => {
  const info = await GitRepoService.getRepoInfo(repoPath);
  res.json(info);
}));

app.get("/api/bootstrap", wrap(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const data = await GitBootstrapService.get(repoPath, limit);
  res.json(data);
}));

app.post("/api/commits/page", wrap(async (req, res) => {
  const { cursor, limit, order, filter } = req.body || {};
  const data = await GitLogService.getCommitsPage(repoPath, cursor, limit, order, filter);
  res.json(data);
}));

app.get("/api/commits/details/:hash", wrap(async (req, res) => {
  const data = await GitLogService.getCommitDetails(repoPath, req.params.hash);
  res.json(data);
}));

app.get("/api/commits/file-changes/:hash", wrap(async (req, res) => {
  const data = await GitLogService.getFileChanges(repoPath, req.params.hash);
  res.json(data);
}));

app.get("/api/commits/file-diff/:hash", wrap(async (req, res) => {
  const filePath = req.query.path;
  if (typeof filePath !== "string" || !filePath) {
    return res.status(400).json({ error: "path query param is required" });
  }
  const data = await GitLogService.getFileDiff(repoPath, req.params.hash, filePath);
  res.json(data);
}));

app.get("/api/commits/patch/:hash", wrap(async (req, res) => {
  const patch = await GitLogService.getPatch(repoPath, req.params.hash);
  res.type("text/plain").send(patch);
}));

app.get("/api/commits/:hash", wrap(async (req, res) => {
  const data = await GitLogService.getCommit(repoPath, req.params.hash);
  if (!data) return res.status(404).json({ error: "commit not found" });
  res.json(data);
}));

app.get("/api/refs", wrap(async (req, res) => {
  const includeRemote = req.query.includeRemote === "true";
  const data = await GitRefService.getAll(repoPath, includeRemote);
  res.json(data);
}));

app.get("/api/remotes", wrap(async (req, res) => {
  const data = await GitRemoteService.list(repoPath);
  res.json(data);
}));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Serving repo: ${repoPath}`);
});
