/**
 * src/index.ts
 *
 * Entry point utama aplikasi Hono.js.
 *
 * File ini bertanggung jawab untuk:
 * 1. Inisialisasi aplikasi Hono
 * 2. Mendaftarkan global middleware (CORS, JSON formatter, request logger)
 * 3. Mendaftarkan semua route API
 * 4. Mendefinisikan global error handler (menangkap semua throw Exception)
 * 5. Menjalankan server pada port yang dikonfigurasi
 *
 * Alur request yang masuk:
 *   Request → Global Middleware → Route → Middleware Route → Controller
 *                                                             ↓
 *                                                        Service → Repository → DB
 */

import { Hono } from "hono";
import { cors } from "hono/cors"; // Middleware CORS bawaan Hono
import { prettyJSON } from "hono/pretty-json"; // Middleware untuk format JSON rapi di browser
import { config } from "./config"; // Konfigurasi app (port, JWT secret, dll)
import { logger } from "./utils/logger"; // Custom logger berwarna
import { response } from "./utils/response"; // Helper response JSON
import { AppException } from "./exceptions"; // Base class semua custom exception
import { swaggerUI } from "@hono/swagger-ui"; // Swagger UI middleware
import authRoutes from "./routes/auth"; // Route /api/auth/...
import todoRoutes from "./routes/todos"; // Route /api/todos/...
import userRoutes from "./routes/users"; // Route /api/users/...
import postRoutes from "./routes/posts"; // Route /api/posts/...
import { openApiSpec } from "./docs/openapi"; // OpenAPI 3.0 spec

const app = new Hono();

// ─── Global Middleware ─────────────────────────────────────────────────────────
app.use("*", cors());
app.use("*", prettyJSON());

// Custom HTTP request logger with timing
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  logger.request(c.req.method, c.req.path, c.res.status, duration);
});

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (c) => {
  return response.success(c, {
    name: "Hono.js REST API",
    version: "2.1.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.route("/api/auth", authRoutes);
app.route("/api/todos", todoRoutes);
app.route("/api/users", userRoutes);
app.route("/api/posts", postRoutes); // Route untuk post + upload file

// ─── Swagger / OpenAPI Docs ────────────────────────────────────────────────────
// Akses Swagger UI di: http://localhost:3000/docs
app.get("/docs", swaggerUI({ url: "/docs/json" }));

// Endpoint yang mengembalikan raw OpenAPI JSON spec
app.get("/docs/json", (c) => c.json(openApiSpec));

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.notFound((c) => {
  return response.error(c, `Route ${c.req.method} ${c.req.path} not found`, 404);
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.onError((err, c) => {
  // Handle custom app exceptions
  if (err instanceof AppException) {
    logger.warn(`[${err.name}] ${err.message}`, {
      path: c.req.path,
      method: c.req.method,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return response.error(c, err.message, err.statusCode, err.errors);
  }

  // Handle unexpected errors
  logger.error(`Unhandled error: ${err.message}`, {
    path: c.req.path,
    method: c.req.method,
    stack: err.stack,
  });

  return response.error(c, "Internal server error", 500);
});

// ─── Start Server ──────────────────────────────────────────────────────────────
logger.info(`🚀 Server running on http://localhost:${config.port}`);
logger.info(`📌 Environment: ${process.env.NODE_ENV ?? "development"}`);
logger.info(`📖 Swagger UI: http://localhost:${config.port}/docs`);

export default {
  port: config.port,
  fetch: app.fetch,
};
