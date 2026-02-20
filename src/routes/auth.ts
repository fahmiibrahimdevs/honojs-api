/**
 * routes/auth.ts
 *
 * Definisi route untuk endpoint autentikasi (/api/auth/...).
 *
 * File ini hanya mendefinisikan PETA ROUTE:
 * method HTTP + path + middleware (jika ada) + controller yang menangani.
 * Tidak ada logika apapun di sini.
 *
 * Pola seperti Laravel Route:
 *   Route::post('/login', [AuthController::class, 'login']);
 *   ↓ (di sini)
 *   router.post('/login', AuthController.login)
 */

import { Hono } from "hono";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth";

const router = new Hono();

// ─── Public Routes (tidak butuh token) ───────────────────────────────────────
router.post("/setup-admin", AuthController.setupAdmin); // Setup admin pertama (sekali pakai)
router.post("/register", AuthController.register); // Registrasi user baru
router.post("/login", AuthController.login); // Login, dapat access + refresh token
router.post("/refresh-token", AuthController.refreshToken); // Perbarui access token

// ─── Protected Routes (wajib kirim Bearer token di header Authorization) ─────
router.get("/profile", authMiddleware, AuthController.profile); // Lihat profil sendiri
router.put("/profile", authMiddleware, AuthController.updateProfile); // Update profil
router.post("/change-password", authMiddleware, AuthController.changePassword); // Ganti password
router.post("/logout", authMiddleware, AuthController.logout); // Logout

export default router;
