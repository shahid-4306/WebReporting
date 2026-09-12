import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import reportAccessRoutes from "./routes/reportAccess.routes.js";
import functionsRoutes from "./routes/functions.routes.js";
import weeklySummaryRoutes from "./routes/weeklySummary.routes.js";
import menusRoutes from "./routes/menus.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import { getPool } from "./db/pool.js";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

// GET /api/health/db — actually opens/reuses the SQL Server connection pool
// and runs a trivial query, instead of just confirming the Node process is
// up. This is the fastest way to verify backend/.env's SQL_SERVER_* values
// are correct end-to-end: 200 means the app is really talking to your
// database; a non-200 body carries the real driver error (auth, host,
// firewall, instance name, etc.) instead of a generic failure.
app.get("/api/health/db", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT DB_NAME() AS db, @@SERVERNAME AS server_name");
    res.json({ ok: true, connected: true, ...result.recordset[0] });
  } catch (err) {
    console.error("DB health check failed:", err.message);
    res.status(500).json({ ok: false, connected: false, error: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/report-access", reportAccessRoutes);
app.use("/api/functions", functionsRoutes);
app.use("/api/weekly-summary-email", weeklySummaryRoutes);
app.use("/api/menus", menusRoutes);
app.use("/api/roles", rolesRoutes);

// Central error handler (e.g. CORS rejection, uncaught JSON errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const port = parseInt(process.env.PORT || "4000", 10);
app.listen(port, () => {
  console.log(`Sonex backend listening on http://localhost:${port}`);
  if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET is not set — set it in backend/.env before deploying.");
  }
});
