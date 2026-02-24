/**
 * config/index.ts
 *
 * Konfigurasi terpusat aplikasi.
 *
 * Semua nilai konfigurasi diambil dari environment variables (.env file).
 * Jika environment variable tidak di-set, akan menggunakan nilai default.
 *
 * PENTING untuk production:
 * - Ganti JWT_SECRET dan JWT_REFRESH_SECRET dengan string acak yang panjang dan kuat
 * - Jangan pernah commit .env ke repository (tambahkan ke .gitignore)
 *
 * Cara set env variable:
 *   Buat file .env di root project:
 *     PORT=3000
 *     JWT_SECRET=your-super-secret-key-here
 *     JWT_REFRESH_SECRET=another-secret-key
 *     DATABASE_URL=mysql://user:pass@localhost:3306/dbname
 */

export const config = {
  /** Port server. Ambil dari env PORT, default 3000 */
  port: process.env.PORT || 3000,

  /** Secret key untuk signing access token JWT. WAJIB diganti di production! */
  jwtSecret: process.env.JWT_SECRET || "default-secret-key",

  /** Secret key berbeda untuk signing refresh token. Harus berbeda dari jwtSecret! */
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "default-refresh-secret-key",

  /** Durasi berlaku access token (15 menit). Setelah ini user perlu refresh token. */
  jwtExpiresIn: "15m",

  /** Durasi berlaku refresh token (7 hari). Setelah ini user harus login ulang. */
  jwtRefreshExpiresIn: "7d",

  /**
   * Direktori penyimpanan file upload.
   * Defaultnya 'uploads' (relatif dari root project).
   * Di production, gunakan path absolut atau object storage (S3, dll).
   */
  uploadDir: process.env.UPLOAD_DIR || "uploads",
};
