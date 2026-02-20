/**
 * middleware/role.ts
 *
 * Middleware untuk otorisasi berdasarkan role user.
 *
 * PERBEDAAN AUTENTIKASI vs OTORISASI:
 * - Autentikasi (auth.ts) : membuktikan SIAPA kamu (verifikasi identitas via token)
 * - Otorisasi (role.ts)   : membuktikan APA yang boleh kamu lakukan (cek role/izin)
 *
 * Middleware ini HARUS dipakai SETELAH authMiddleware, karena
 * membutuhkan data user yang sudah diset oleh authMiddleware di context.
 *
 * CARA PAKAI:
 *   router.use('*', authMiddleware, adminOnly)    // Semua route admin-only
 *   router.get('/data', adminOrModerator, ...)    // Hanya admin atau moderator
 */

import type { Context, Next } from "hono"; // Tipe Context (request/response) dan Next (fungsi ke middleware berikutnya)
import { UnauthorizedException, ForbiddenException } from "../exceptions"; // Exception 401 dan 403

/**
 * Factory function: menerima array role yang diizinkan,
 * mengembalikan middleware function.
 *
 * @param allowedRoles - Array role yang boleh mengakses, contoh: ['ADMIN', 'MODERATOR']
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user"); // Ambil user dari context (diset oleh authMiddleware)

    // Seharusnya tidak terjadi jika authMiddleware dipakai sebelumnya,
    // tapi sebagai safety net
    if (!user) {
      throw new UnauthorizedException();
    }

    // Cek apakah role user ada di daftar role yang diizinkan
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(); // Role tidak mencukupi
    }

    await next(); // Role valid, lanjutkan ke handler
  };
};

/** Shortcut: hanya ADMIN yang boleh akses */
export const adminOnly = roleMiddleware(["ADMIN"]);

/** Shortcut: ADMIN dan MODERATOR yang boleh akses */
export const adminOrModerator = roleMiddleware(["ADMIN", "MODERATOR"]);
