/**
 * services/user.service.ts
 *
 * Service layer untuk manajemen user oleh admin.
 *
 * Berbeda dengan AuthService (untuk user sendiri),
 * UserService berisi operasi yang dilakukan admin terhadap user lain:
 * - Lihat semua user
 * - Buat user baru
 * - Ubah role/status user
 * - Hapus user
 *
 * Semua method di sini hanya bisa dipanggil oleh controller
 * yang sudah diproteksi dengan adminOnly middleware.
 */

import { UserRepository } from "../repositories/user.repository";
import { hashPassword } from "../utils/password";
import { NotFoundException, ConflictException, BadRequestException } from "../exceptions";
import type { UserRole, UserStatus } from "../types";

export const UserService = {
  /**
   * Ambil semua user dengan filter opsional dan paginasi.
   * @param filter  - Filter berdasarkan role dan/atau status
   * @param page    - Nomor halaman (dari query param)
   * @param limit   - Jumlah data per halaman (dari query param)
   * @returns       - { data: User[], meta: PaginationMeta }
   */
  async getAll(filter: { role?: UserRole; status?: UserStatus }, page: number, limit: number) {
    const skip = (page - 1) * limit; // Hitung offset untuk paginasi
    const [users, total] = await UserRepository.findMany(filter, skip, limit);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit), // Pembulatan ke atas
      },
    };
  },

  /**
   * Ambil detail satu user berdasarkan ID.
   * Menyertakan 10 todo terakhir dan total jumlah todo milik user.
   */
  async getById(id: string) {
    const user = await UserRepository.findByIdPublic(id); // Versi aman (tanpa password)
    if (!user) throw new NotFoundException("User");
    return user;
  },

  /**
   * Buat user baru oleh admin. Admin bisa menentukan role dan status.
   * Berbeda dengan register (yang selalu USER), ini bisa set role apapun.
   */
  async create(data: { email: string; password: string; name: string; phone?: string; birthDate?: string; role?: UserRole; status?: UserStatus }) {
    // Cek duplikasi email
    const existingUser = await UserRepository.findByEmail(data.email);
    if (existingUser) throw new ConflictException("Email already registered");

    const hashedPassword = await hashPassword(data.password); // Hash password sebelum simpan

    return UserRepository.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      role: data.role ?? "USER", // Default USER jika tidak dispesifikasi
      status: data.status ?? "ACTIVE", // Default ACTIVE
    });
  },

  /**
   * Ubah role user (misalnya promosi USER menjadi MODERATOR).
   * Cek keberadaan user terlebih dahulu sebelum update.
   */
  async updateRole(id: string, role: UserRole) {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundException("User");
    return UserRepository.updateRole(id, role);
  },

  /**
   * Aktifkan atau nonaktifkan akun user.
   * User dengan status INACTIVE tidak bisa login.
   */
  async updateStatus(id: string, status: UserStatus) {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundException("User");
    return UserRepository.updateStatus(id, status);
  },

  /**
   * Hapus user dari database.
   * Mencegah admin menghapus akun mereka sendiri (keamanan).
   * Todo milik user akan otomatis terhapus (cascade delete).
   */
  async delete(id: string, currentUserId: string) {
    // Cegah admin hapus akun diri sendiri
    if (id === currentUserId) {
      throw new BadRequestException("Cannot delete your own account");
    }
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundException("User");
    await UserRepository.delete(id);
  },
};
