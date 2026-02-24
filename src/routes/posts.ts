/**
 * routes/posts.ts
 *
 * Definisi route untuk manajemen post (/api/posts/...).
 *
 * AKSES:
 * - Semua route memerlukan autentikasi (authMiddleware)
 * - ADMIN dapat mengakses dan mengelola semua post
 * - USER hanya dapat mengelola post miliknya sendiri
 *
 * Route standar resource + custom action untuk upload file:
 *   GET    /api/posts                      → index        (list post)
 *   POST   /api/posts                      → store        (buat post baru)
 *   GET    /api/posts/:id                  → show         (detail post)
 *   PUT    /api/posts/:id                  → update       (update post)
 *   DELETE /api/posts/:id                  → destroy      (hapus post + semua filenya)
 *   POST   /api/posts/:id/files            → uploadFiles  (upload multiple file)
 *   DELETE /api/posts/:id/files/:fileId    → destroyFile  (hapus satu file)
 */

import { Hono } from "hono"; // Framework Hono.js
import { PostController } from "../controllers/post.controller"; // Handler untuk setiap route
import { authMiddleware } from "../middleware/auth"; // Middleware cek JWT token

const router = new Hono();

// Terapkan authMiddleware ke SEMUA route di file ini
router.use("*", authMiddleware);

// ─── Resource Routes (Laravel style) ──────────────────────────────────────────
router.get("/", PostController.index); // GET    /api/posts         - list semua post (paginasi + search)
router.post("/", PostController.store); // POST   /api/posts         - buat post baru (JSON body)
router.get("/:id", PostController.show); // GET    /api/posts/:id     - detail post + files
router.put("/:id", PostController.update); // PUT    /api/posts/:id     - update post
router.delete("/:id", PostController.destroy); // DELETE /api/posts/:id     - hapus post + semua file di disk

// ─── File Upload Routes ────────────────────────────────────────────────────────
router.post("/:id/files", PostController.uploadFiles); // POST   /api/posts/:id/files           - upload multiple file (multipart/form-data)
router.delete("/:id/files/:fileId", PostController.destroyFile); // DELETE /api/posts/:id/files/:fileId - hapus satu file

export default router;
