/**
 * controllers/auth.controller.ts
 *
 * Controller untuk semua endpoint autentikasi.
 *
 * PERAN CONTROLLER:
 * Controller adalah 'penghubung' antara HTTP request dan service.
 * Tugasnya hanya:
 * 1. Ambil data dari request (body, params, headers)
 * 2. Validasi input dengan Zod (jika gagal, throw ValidationException)
 * 3. Panggil method yang sesuai di Service
 * 4. Kembalikan response menggunakan helper response
 *
 * Controller TIDAK boleh berisi logika bisnis.
 * Controller TIDAK boleh query database secara langsung.
 */

import type { Context } from "hono";
import { AuthService } from "../services/auth.service";
import { response } from "../utils/response";
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, refreshTokenSchema } from "../validators/auth";
import { ValidationException } from "../exceptions";

export const AuthController = {
  /**
   * POST /api/auth/setup-admin
   * Setup admin pertama. Hanya bisa dipakai sekali saat aplikasi baru.
   * Tidak memerlukan autentikasi.
   */
  async setupAdmin(c: Context) {
    const body = await c.req.json(); // Ambil body request
    const result = registerSchema.safeParse(body); // Validasi dengan Zod (tidak throw)
    if (!result.success) throw new ValidationException(result.error.errors); // Lempar jika gagal

    const admin = await AuthService.setupAdmin(result.data); // Panggil service
    return response.created(c, admin, "First admin created successfully"); // HTTP 201
  },

  /**
   * POST /api/auth/register
   * Registrasi akun user baru (role USER).
   * Tidak memerlukan autentikasi.
   */
  async register(c: Context) {
    const body = await c.req.json();
    const result = registerSchema.safeParse(body); // Validasi: email, password, name, dll
    if (!result.success) throw new ValidationException(result.error.errors);

    const user = await AuthService.register(result.data);
    return response.created(c, user, "User registered successfully"); // HTTP 201
  },

  /**
   * POST /api/auth/login
   * Login dengan email dan password.
   * Mengembalikan accessToken + refreshToken jika berhasil.
   */
  async login(c: Context) {
    const body = await c.req.json();
    const result = loginSchema.safeParse(body); // Validasi: email dan password
    if (!result.success) throw new ValidationException(result.error.errors);

    const data = await AuthService.login(result.data.email, result.data.password);
    return response.success(c, data, "Login successful"); // HTTP 200 dengan token
  },

  /**
   * POST /api/auth/refresh-token
   * Perbarui access token menggunakan refresh token.
   * Dipakai ketika access token sudah expire.
   */
  async refreshToken(c: Context) {
    const body = await c.req.json();
    const result = refreshTokenSchema.safeParse(body); // Validasi: refreshToken ada dan tidak kosong
    if (!result.success) throw new ValidationException(result.error.errors);

    const data = await AuthService.refreshToken(result.data.refreshToken);
    return response.success(c, data, "Token refreshed successfully");
  },

  /**
   * POST /api/auth/logout
   * Logout user: hapus refresh token dari database.
   * Memerlukan autentikasi (Bearer token).
   */
  async logout(c: Context) {
    const user = c.get("user"); // Ambil data user dari context (diset oleh authMiddleware)
    await AuthService.logout(user.userId);
    return response.noContent(c, "Logout successful"); // HTTP 200 tanpa data
  },

  /**
   * GET /api/auth/profile
   * Ambil profil user yang sedang login.
   * Memerlukan autentikasi.
   */
  async profile(c: Context) {
    const user = c.get("user"); // Data user dari JWT token (sudah diverifikasi middleware)
    const profile = await AuthService.getProfile(user.userId);
    return response.success(c, profile);
  },

  /**
   * PUT /api/auth/profile
   * Update profil: nama, nomor telepon, tanggal lahir.
   * Memerlukan autentikasi.
   */
  async updateProfile(c: Context) {
    const user = c.get("user");
    const body = await c.req.json();
    const result = updateProfileSchema.safeParse(body); // Validasi field profil
    if (!result.success) throw new ValidationException(result.error.errors);

    const updated = await AuthService.updateProfile(user.userId, result.data);
    return response.success(c, updated, "Profile updated successfully");
  },

  /**
   * POST /api/auth/change-password
   * Ganti password: wajib verifikasi password lama terlebih dahulu.
   * Memerlukan autentikasi.
   */
  async changePassword(c: Context) {
    const user = c.get("user");
    const body = await c.req.json();
    const result = changePasswordSchema.safeParse(body); // Validasi: currentPassword, newPassword, konfirmasi
    if (!result.success) throw new ValidationException(result.error.errors);

    await AuthService.changePassword(user.userId, result.data.currentPassword, result.data.newPassword);
    return response.noContent(c, "Password changed successfully"); // HTTP 200 tanpa data
  },
};
