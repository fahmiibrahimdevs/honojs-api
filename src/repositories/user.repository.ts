/**
 * repositories/user.repository.ts
 *
 * Repository layer untuk tabel 'users' di database.
 *
 * PERAN DALAM CLEAN ARCHITECTURE:
 * Repository adalah satu-satunya tempat yang boleh berinteraksi langsung
 * dengan Prisma/database. Layer lain (service, controller) TIDAK boleh
 * import prisma secara langsung, melainkan harus lewat repository ini.
 *
 * Keuntungan:
 * - Jika suatu saat ganti ORM (dari Prisma ke lain), cukup ubah file ini
 * - Mudah di-mock saat unit testing
 * - Query database terpusat dan tidak tersebar
 */

import { prisma } from "../lib/prisma";
import type { UserRole, UserStatus } from "../types";

/** Data yang dibutuhkan untuk membuat user baru */
export interface CreateUserData {
  email: string;
  password: string; // Sudah di-hash sebelum masuk ke sini
  name: string;
  phone?: string; // Opsional
  birthDate?: Date | null; // Opsional, null jika tidak diisi
  role?: UserRole; // Default: USER
  status?: UserStatus; // Default: ACTIVE
}

/** Data yang bisa diperbarui pada user yang sudah ada */
export interface UpdateUserData {
  name?: string;
  phone?: string;
  birthDate?: Date | null;
  password?: string; // Dipakai saat ganti password
  refreshToken?: string | null; // null = logout (hapus token)
}

/** Filter untuk query pencarian banyak user */
export interface FindUsersFilter {
  role?: UserRole; // Filter berdasarkan role
  status?: UserStatus; // Filter berdasarkan status aktif/nonaktif
}

/**
 * Kolom yang dipilih saat query user (tidak termasuk password & refreshToken).
 * Ini adalah 'safe select' — kolom sensitif tidak pernah dikirim ke client.
 */
const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  birthDate: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  // password dan refreshToken sengaja TIDAK di-select
};

export const UserRepository = {
  /**
   * Cari user berdasarkan ID. Mengembalikan SEMUA field termasuk password.
   * Dipakai oleh authMiddleware dan service yang butuh verifikasi password.
   */
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  /**
   * Cari user berdasarkan ID dengan select field yang aman (tanpa password).
   * Juga menyertakan 10 todo terakhir milik user dan jumlah total todonya.
   * Dipakai untuk endpoint GET /api/users/:id (admin)
   */
  async findByIdPublic(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect, // Spread userSelect aman (tanpa password)
        todos: {
          select: { id: true, title: true, completed: true, createdAt: true },
          orderBy: { createdAt: "desc" as const }, // Todo terbaru di atas
          take: 10, // Batasi hanya 10 todo terakhir
        },
        _count: { select: { todos: true } }, // Total jumlah todo user ini
      },
    });
  },

  /**
   * Cari user berdasarkan email (unique).
   * Dipakai saat login dan cek duplikasi email saat register.
   * Mengembalikan semua field termasuk password untuk keperluan verifikasi.
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  /**
   * Cari satu user dengan kondisi tertentu.
   * Dipakai untuk cek apakah sudah ada admin (saat setup-admin).
   */
  async findFirst(filter: Partial<{ role: UserRole }>) {
    return prisma.user.findFirst({ where: filter });
  },

  /**
   * Ambil banyak user dengan filter, paginasi, dan mengembalikan total count.
   * Menggunakan Promise.all untuk menjalankan 2 query secara paralel (lebih efisien).
   * @returns [array of users, total count]
   */
  async findMany(filter: FindUsersFilter, skip: number, take: number) {
    const where: any = {};
    if (filter.role) where.role = filter.role; // Tambah filter role jika ada
    if (filter.status) where.status = filter.status; // Tambah filter status jika ada

    return Promise.all([
      prisma.user.findMany({
        where,
        skip, // Offset untuk paginasi: (page-1) * limit
        take, // Jumlah data yang diambil per halaman
        orderBy: { createdAt: "desc" }, // User terbaru di atas
        select: { ...userSelect, _count: { select: { todos: true } } }, // Sertakan jumlah todo
      }),
      prisma.user.count({ where }), // Query jumlah total (untuk meta paginasi)
    ]);
  },

  /**
   * Buat user baru di database.
   * Password harus sudah di-hash sebelum memanggil fungsi ini.
   * Mengembalikan data user tanpa password (menggunakan userSelect).
   */
  async create(data: CreateUserData) {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password, // Sudah di-hash oleh AuthService
        name: data.name,
        phone: data.phone,
        birthDate: data.birthDate,
        role: data.role ?? "USER", // Default ke USER jika tidak dispesifikasi
        status: data.status ?? "ACTIVE", // Default ke ACTIVE
      },
      select: userSelect, // Return tanpa password
    });
  },

  /**
   * Update data umum user (nama, phone, tanggal lahir, password, refreshToken).
   * Field yang tidak disertakan tidak akan diubah (partial update).
   */
  async update(id: string, data: UpdateUserData) {
    return prisma.user.update({
      where: { id },
      data, // Prisma hanya update field yang ada di object data
      select: userSelect, // Return tanpa password
    });
  },

  /** Update role user (khusus admin). */
  async updateRole(id: string, role: UserRole) {
    return prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    });
  },

  /** Update status user: ACTIVE atau INACTIVE (khusus admin). */
  async updateStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
      select: userSelect,
    });
  },

  /**
   * Simpan atau hapus refresh token di database.
   * Dipanggil saat: login (simpan token baru), refresh (perbarui token), logout (set null).
   */
  async updateRefreshToken(id: string, refreshToken: string | null) {
    return prisma.user.update({
      where: { id },
      data: { refreshToken }, // null = logout, string = token baru
    });
  },

  /**
   * Hapus user dari database.
   * Todo milik user akan otomatis terhapus juga karena ada `onDelete: Cascade`
   * di relasi Todo -> User pada schema.prisma.
   */
  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
