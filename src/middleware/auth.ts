/**
 * middleware/auth.ts
 *
 * Middleware untuk memverifikasi autentikasi user.
 *
 * CARA KERJA:
 * 1. Baca header 'Authorization: Bearer <token>'
 * 2. Verifikasi signature dan expiry JWT
 * 3. Cari user di database berdasarkan userId dari token
 * 4. Pastikan akun user masih ACTIVE
 * 5. Simpan data user ke context Hono (c.set('user', ...))
 * 6. Lanjutkan ke handler berikutnya (next())
 *
 * Jika salah satu langkah gagal, throw UnauthorizedException
 * yang akan ditangkap oleh global error handler di index.ts.
 *
 * CARA PAKAI di route:
 *   router.get('/profile', authMiddleware, AuthController.profile)
 *                          ^^^^^^^^^^
 *                          Middleware diletakkan sebelum controller
 */

import type { Context, Next } from "hono";
import { verifyAccessToken } from "../utils/jwt";
import { UserRepository } from "../repositories/user.repository";
import { UnauthorizedException } from "../exceptions";

export const authMiddleware = async (c: Context, next: Next) => {
  // Ambil header Authorization dari request
  const authHeader = c.req.header("Authorization");

  // Cek apakah header ada dan formatnya benar: 'Bearer <token>'
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedException("No token provided");
  }

  // Ekstrak token: hilangkan prefix 'Bearer ' (7 karakter)
  const token = authHeader.substring(7);

  // Verifikasi JWT: cek signature dan apakah sudah expire
  const payload = await verifyAccessToken(token);

  if (!payload) {
    throw new UnauthorizedException("Invalid or expired token"); // Token rusak atau sudah expire
  }

  // Cari user di database berdasarkan userId dari payload JWT
  // Ini penting untuk memastikan user masih ada dan akun belum dihapus
  const user = await UserRepository.findById(payload.userId as string);

  if (!user) {
    throw new UnauthorizedException("User not found"); // User dihapus setelah token dibuat
  }

  if (user.status !== "ACTIVE") {
    throw new UnauthorizedException("Account is inactive"); // Akun dinonaktifkan oleh admin
  }

  // Simpan data user ke context Hono agar bisa diakses di controller:
  // const user = c.get('user')
  c.set("user", {
    userId: user.id,
    email: user.email,
    role: user.role, // Role dipakai untuk cek izin akses di service
  });

  await next(); // Lanjutkan ke middleware atau handler berikutnya
};
