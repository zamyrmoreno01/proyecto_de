const fs = require("fs");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const env = require("./config/env");
const { ensureSchema } = require("./db/schema");
const { closePool } = require("./db/neon");
const authRoutes = require("./routes/auth");
const personRoutes = require("./routes/persons");
const mediaRoutes = require("./routes/media");

const app = express();

fs.mkdirSync(path.join(env.rootDir, "uploads", "media"), { recursive: true });

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/persons", personRoutes);
app.use("/api/media", mediaRoutes);

app.use("/uploads", express.static(path.join(env.rootDir, "uploads")));
app.use(express.static(env.rootDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(env.rootDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  if (error?.name === "MulterError" && error?.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({
      message: "The uploaded file exceeds the maximum allowed size."
    });
    return;
  }

  if (error?.message === "Invalid file type.") {
    res.status(400).json({
      message: "Only JPG, PNG and MP4 files are allowed."
    });
    return;
  }

  res.status(500).json({ message: "Internal server error." });
});

async function startServer() {
  if (!env.databaseUrl) {
    throw new Error("DATABASE_URL is missing. Create a .env file based on .env.example.");
  }

  await ensureSchema();

  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

async function shutdown() {
  await closePool();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
