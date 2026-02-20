/**
 * utils/jwt.ts
 *
 * Utility functions untuk pembuatan dan verifikasi JSON Web Token (JWT).
 *
 * SISTEM DUAL TOKEN yang dipakai:
 *
 * 1. ACCESS TOKEN (jangka pendek - 15 menit)
 *    - Dipakai untuk autentikasi setiap request API
 *    - Dikirim di header: Authorization: Bearer <access_token>
 *    - Expire cepat untuk keamanan
 *
 * 2. REFRESH TOKEN (jangka panjang - 7 hari)
 *    - Dipakai HANYA untuk mendapatkan access token baru
 *    - Disimpan di database (bisa diinvalidasi saat logout)
 *    - Endpoint: POST /api/auth/refresh-token
 *
 * Alur normal:
 *   Login → dapat access + refresh token
 *   Setiap request → kirim access token di header
 *   Access token expire → kirim refresh token ke /refresh-token → dapat token baru
 *   Logout → refresh token dihapus dari DB → tidak bisa refresh lagi
 */

import { sign, verify } from "hono/jwt"; // JWT utility dari Hono framework
import { config } from "../config";

/** Struktur data yang di-encode ke dalam JWT payload */
export interface JWTPayload {
  userId: string; // ID user dari database
  email: string; // Email user
  role: string; // Role user (untuk otorisasi)
}

/**
 * Buat access token JWT yang berlaku 15 menit.
 * @param payload - Data user yang akan di-encode
 * @returns JWT string yang ditandatangani dengan jwtSecret
 */
export const generateAccessToken = async (payload: JWTPayload): Promise<string> => {
  return await sign(
    {
      ...payload, // Spread userId, email, role
      // Waktu expire: sekarang + 15 menit (dalam detik Unix timestamp)
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
    },
    config.jwtSecret, // Secret key untuk signing
  );
};

/**
 * Buat refresh token JWT yang berlaku 7 hari.
 * Menggunakan secret key BERBEDA dari access token (jwtRefreshSecret).
 * @param payload - Data user yang akan di-encode
 * @returns JWT string yang ditandatangani dengan jwtRefreshSecret
 */
export const generateRefreshToken = async (payload: JWTPayload): Promise<string> => {
  return await sign(
    {
      ...payload,
      // Waktu expire: sekarang + 7 hari (dalam detik Unix timestamp)
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    },
    config.jwtRefreshSecret, // Secret key berbeda untuk refresh token
  );
};

/**
 * Verifikasi access token: cek signature dan apakah sudah expire.
 * @returns Payload jika valid, null jika tidak valid/expire
 */
export const verifyAccessToken = async (token: string) => {
  try {
    return await verify(token, config.jwtSecret); // Akan throw jika invalid/expire
  } catch (error) {
    return null; // Return null daripada throw, error ditangani di middleware
  }
};

/**
 * Verifikasi refresh token: cek signature dan apakah sudah expire.
 * @returns Payload jika valid, null jika tidak valid/expire
 */
export const verifyRefreshToken = async (token: string) => {
  try {
    return await verify(token, config.jwtRefreshSecret);
  } catch (error) {
    return null;
  }
};
