/**
 * routes/users.ts
 *
 * Definisi route untuk manajemen user (/api/users/...).
 *
 * AKSES: Semua route di sini hanya bisa diakses oleh ADMIN.
 * Proteksi berlapis:
 * 1. authMiddleware  : cek apakah sudah login (ada Bearer token valid)
 * 2. adminOnly       : cek apakah role user adalah ADMIN
 *
 * Route standard resource + custom action untuk role & status:
 *   GET    /api/users             → index        (list semua user)
 *   POST   /api/users             → store        (buat user baru)
 *   GET    /api/users/:id         → show         (detail user)
 *   DELETE /api/users/:id         → destroy      (hapus user)
 *   PATCH  /api/users/:id/role    → updateRole   (ubah role)
 *   PATCH  /api/users/:id/status  → updateStatus (aktif/nonaktif)
 */

import { Hono } from "hono";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth";
import { adminOnly } from "../middleware/role";

const router = new Hono();

// Terapkan authMiddleware + adminOnly ke SEMUA route di file ini
router.use("*", authMiddleware, adminOnly);

// Resource routes (Laravel style)
router.get("/", UserController.index); // GET    /api/users        - list semua user
router.post("/", UserController.store); // POST   /api/users        - buat user baru
router.get("/:id", UserController.show); // GET    /api/users/:id    - detail user
router.delete("/:id", UserController.destroy); // DELETE /api/users/:id    - hapus user

// Custom action routes
router.patch("/:id/role", UserController.updateRole); // PATCH /api/users/:id/role    - ubah role
router.patch("/:id/status", UserController.updateStatus); // PATCH /api/users/:id/status  - ubah status

export default router;
