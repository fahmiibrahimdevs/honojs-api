/**
 * repositories/todo.repository.ts
 *
 * Repository layer untuk tabel 'todos' di database.
 *
 * Sama seperti user.repository.ts, file ini adalah SATU-SATUNYA tempat
 * yang boleh query Prisma untuk data Todo. Service dan controller
 * tidak boleh mengakses prisma.todo secara langsung.
 *
 * Setiap query todo selalu menyertakan data user pemiliknya (include)
 * agar client tidak perlu request terpisah untuk info user.
 */

import { prisma } from "../lib/prisma";

/** Data yang dibutuhkan untuk membuat todo baru */
export interface CreateTodoData {
  title: string; // Judul todo (wajib)
  description?: string; // Deskripsi opsional
  completed?: boolean; // Status selesai, default false
  userId: string; // ID pemilik todo (dari JWT token)
}

/** Data yang bisa diperbarui pada todo yang sudah ada (semua opsional) */
export interface UpdateTodoData {
  title?: string;
  description?: string | null; // null untuk menghapus deskripsi
  completed?: boolean;
}

/**
 * Konfigurasi include untuk relasi todo -> user.
 * Setiap query todo akan menyertakan data user pemiliknya
 * (hanya id, name, email — bukan password).
 */
const todoInclude = {
  user: {
    select: { id: true, name: true, email: true }, // Hanya field aman
  },
};

export const TodoRepository = {
  /**
   * Cari satu todo berdasarkan ID beserta data user pemiliknya.
   * Mengembalikan null jika tidak ditemukan.
   */
  async findById(id: string) {
    return prisma.todo.findUnique({
      where: { id },
      include: todoInclude, // Sertakan data user
    });
  },

  /**
   * Ambil banyak todo dengan filter, paginasi, search, dan total count.
   * @param where   - { userId } untuk user biasa, {} (kosong) untuk admin (semua todo)
   * @param skip    - Offset paginasi
   * @param take    - Limit per halaman
   * @param search  - Keyword untuk mencari di title atau description (opsional)
   * @returns [array of todos, total count]
   */
  async findMany(where: { userId?: string }, skip: number, take: number, search?: string) {
    // Bangun kondisi where lengkap dengan search (jika ada)
    const fullWhere = {
      ...where,
      ...(search && {
        OR: [
          { title: { contains: search } }, // Cari di judul
          { description: { contains: search } }, // Cari di deskripsi
        ],
      }),
    };

    return Promise.all([
      prisma.todo.findMany({
        where: fullWhere,
        skip,
        take,
        orderBy: { createdAt: "desc" }, // Todo terbaru di atas
        include: todoInclude, // Sertakan data user pemilik
      }),
      prisma.todo.count({ where: fullWhere }), // Count harus pakai filter yang sama
    ]);
  },

  /**
   * Buat todo baru dan kembalikan data lengkapnya beserta info user.
   * completed default ke false jika tidak disertakan.
   */
  async create(data: CreateTodoData) {
    return prisma.todo.create({
      data: {
        title: data.title,
        description: data.description,
        completed: data.completed ?? false, // Default: belum selesai
        userId: data.userId, // ID pemilik dari JWT
      },
      include: todoInclude, // Return dengan data user
    });
  },

  /**
   * Update todo berdasarkan ID.
   * Hanya field yang disertakan di `data` yang akan diubah.
   */
  async update(id: string, data: UpdateTodoData) {
    return prisma.todo.update({
      where: { id },
      data, // Partial update: field yang undefined tidak diubah
      include: todoInclude,
    });
  },

  /** Hapus todo berdasarkan ID secara permanen dari database. */
  async delete(id: string) {
    return prisma.todo.delete({ where: { id } });
  },
};
