/**
 * services/auth.service.ts
 *
 * Service layer untuk semua logika bisnis yang berkaitan dengan autentikasi.
 *
 * PERAN DALAM CLEAN ARCHITECTURE:
 * Service adalah tempat semua 'keputusan' bisnis dibuat.
 * Controller hanya mengoper data dari request ke service,
 * service yang menentukan apa yang harus dilakukan.
 *
 * Service TIDAK boleh tahu apapun tentang HTTP (request/response).
 * Jika ada yang salah, service melempar Exception, bukan return response.
 *
 * Alur data: Controller → Service → Repository → Database
 */

import { UserRepository } from "../repositories/user.repository";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { ConflictException, UnauthorizedException, NotFoundException, ForbiddenException, BadRequestException } from "../exceptions";
import type { UserRole, UserStatus } from "../types";

export const AuthService = {
  /**
   * Setup admin pertama. Hanya bisa dijalankan SEKALI saat aplikasi baru disetup.
   * Jika sudah ada admin, akan throw ForbiddenException.
   * Endpoint ini tidak memerlukan autentikasi.
   */
  async setupAdmin(data: { email: string; password: string; name: string; phone?: string; birthDate?: string }) {
    // Cek apakah admin sudah pernah dibuat sebelumnya
    const adminExists = await UserRepository.findFirst({ role: "ADMIN" });
    if (adminExists) {
      throw new ForbiddenException("Admin already exists. Use /api/users to create more admins.");
    }

    // Cek apakah email sudah dipakai
    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Hash password sebelum disimpan (JANGAN simpan plain text)
    const hashedPassword = await hashPassword(data.password);

    // Buat user dengan role ADMIN
    return UserRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      birthDate: data.birthDate ? new Date(data.birthDate) : null, // Konversi string ke Date
      role: "ADMIN", // Force role ADMIN
      status: "ACTIVE",
    });
  },

  /**
   * Registrasi user baru dengan role USER (bukan admin).
   * Cek duplikasi email sebelum membuat akun.
   */
  async register(data: { email: string; password: string; name: string; phone?: string; birthDate?: string }) {
    // Pastikan email belum terdaftar
    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const hashedPassword = await hashPassword(data.password);

    // Selalu buat dengan role USER, bukan admin
    return UserRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      role: "USER",
      status: "ACTIVE",
    });
  },

  /**
   * Login: verifikasi email + password, lalu buat access token & refresh token.
   *
   * Sistem token yang dipakai (JWT dual-token):
   * - Access Token  : berlaku 15 menit, dipakai untuk setiap request API
   * - Refresh Token : berlaku 7 hari, dipakai HANYA untuk memperbarui access token
   */
  async login(email: string, password: string) {
    // Cari user berdasarkan email
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      // Sengaja pesan error dibuat generik ('Invalid credentials') agar tidak bocorkan
      // info apakah email ada atau tidak (security best practice)
      throw new UnauthorizedException("Invalid credentials");
    }

    // Cek status akun sebelum verifikasi password
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("Account is inactive");
    }

    // Verifikasi password (bandingkan plain text dengan bcrypt hash)
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials"); // Pesan sama agar tidak bocorkan info
    }

    // Buat payload yang akan di-encode ke dalam JWT
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = await generateAccessToken(payload); // Expire: 15 menit
    const refreshToken = await generateRefreshToken(payload); // Expire: 7 hari

    // Simpan refresh token ke database untuk validasi nanti
    await UserRepository.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken, // Kirim ke client untuk dipakai di header Authorization
      refreshToken, // Kirim ke client untuk disimpan (httpOnly cookie atau secure storage)
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  },

  /**
   * Perbarui access token menggunakan refresh token.
   * Dipakai ketika access token sudah expire (401) tapi refresh token masih valid.
   * Setiap refresh menghasilkan sepasang token BARU (rotation strategy).
   */
  async refreshToken(token: string) {
    // Verifikasi signature dan expiry refresh token
    const payload = await verifyRefreshToken(token);
    if (!payload) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Ambil user dari database dan bandingkan token yang tersimpan
    // (mencegah penggunaan token lama setelah logout)
    const user = await UserRepository.findById(payload.userId as string);
    if (!user || user.refreshToken !== token) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("Account is inactive");
    }

    // Buat token baru (token rotation: token lama tidak bisa dipakai lagi)
    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = await generateAccessToken(newPayload);
    const refreshToken = await generateRefreshToken(newPayload);

    // Update refresh token di database dengan yang baru
    await UserRepository.updateRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  },

  /**
   * Logout: hapus refresh token dari database.
   * Setelah ini, token lama tidak bisa dipakai untuk refresh lagi.
   * Access token tetap valid sampai expire (15 menit), ini normal untuk JWT stateless.
   */
  async logout(userId: string) {
    await UserRepository.updateRefreshToken(userId, null); // Set null = hapus token
  },

  /**
   * Ambil data profil user yang sedang login.
   * Mengembalikan data user TANPA password dan refreshToken (field sensitif).
   */
  async getProfile(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundException("User");

    // Destructuring untuk memisahkan field sensitif dari data yang akan dikirim
    const { password, refreshToken, ...profile } = user;
    return profile; // Kembalikan hanya field yang aman
  },

  /**
   * Update profil user (nama, telepon, tanggal lahir).
   * Menggunakan spread operator kondisional agar hanya field yang dikirim yang diubah.
   */
  async updateProfile(userId: string, data: { name?: string; phone?: string; birthDate?: string }) {
    return UserRepository.update(userId, {
      ...(data.name && { name: data.name }), // Hanya update jika ada
      ...(data.phone !== undefined && { phone: data.phone }), // undefined check (bukan falsy)
      ...(data.birthDate && { birthDate: new Date(data.birthDate) }), // Konversi string ke Date
    });
  },

  /**
   * Ganti password: verifikasi password lama, lalu hash dan simpan password baru.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new NotFoundException("User");

    // Verifikasi password lama sebelum mengizinkan penggantian
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    // Hash password baru sebelum disimpan
    const hashedPassword = await hashPassword(newPassword);
    await UserRepository.update(userId, { password: hashedPassword });
  },
};
