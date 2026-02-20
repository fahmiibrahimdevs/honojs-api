/**
 * services/todo.service.ts
 *
 * Service layer untuk semua logika bisnis terkait Todo.
 *
 * ATURAN AKSES:
 * - ADMIN  : bisa melihat, mengubah, dan menghapus SEMUA todo milik siapapun
 * - USER   : hanya bisa mengakses todo MILIKNYA sendiri
 *
 * Pemisahan akses ini diterapkan di setiap method menggunakan
 * pengecekan role sebelum melakukan operasi database.
 */

import { TodoRepository } from "../repositories/todo.repository";
import { NotFoundException, ForbiddenException } from "../exceptions";

export const TodoService = {
  /**
   * Ambil semua todo dengan paginasi dan search opsional.
   * - Jika role ADMIN: ambil semua todo dari semua user
   * - Jika role USER: hanya ambil todo milik user tersebut
   * @param search - Keyword pencarian di title/description (opsional)
   */
  async getAll(userId: string, role: string, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit; // Hitung offset dari nomor halaman

    // Admin lihat semua (where kosong), user biasa filter by userId
    const where = role === "ADMIN" ? {} : { userId };

    const [todos, total] = await TodoRepository.findMany(where, skip, limit, search);

    return {
      data: todos,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        ...(search && { search }), // Sertakan keyword di meta jika ada
      },
    };
  },

  /**
   * Ambil detail satu todo berdasarkan ID.
   * User biasa hanya bisa akses todo miliknya sendiri.
   */
  async getById(id: string, userId: string, role: string) {
    const todo = await TodoRepository.findById(id);
    if (!todo) throw new NotFoundException("Todo");

    // Jika bukan admin, cek kepemilikan todo
    if (role !== "ADMIN" && todo.userId !== userId) {
      throw new ForbiddenException("You can only access your own todos");
    }

    return todo;
  },

  /**
   * Buat todo baru untuk user yang sedang login.
   * userId diambil dari JWT token, bukan dari body request
   * (mencegah user membuat todo atas nama orang lain).
   */
  async create(data: { title: string; description?: string; completed?: boolean; userId: string }) {
    return TodoRepository.create(data); // Langsung delegasi ke repository
  },

  /**
   * Update todo berdasarkan ID.
   * Cek kepemilikan sebelum mengizinkan update (kecuali admin).
   */
  async update(id: string, userId: string, role: string, data: { title?: string; description?: string | null; completed?: boolean }) {
    const todo = await TodoRepository.findById(id);
    if (!todo) throw new NotFoundException("Todo");

    // Hanya pemilik atau admin yang boleh update
    if (role !== "ADMIN" && todo.userId !== userId) {
      throw new ForbiddenException("You can only update your own todos");
    }

    return TodoRepository.update(id, data);
  },

  /**
   * Hapus todo berdasarkan ID.
   * Cek kepemilikan sebelum mengizinkan delete (kecuali admin).
   */
  async delete(id: string, userId: string, role: string) {
    const todo = await TodoRepository.findById(id);
    if (!todo) throw new NotFoundException("Todo");

    // Hanya pemilik atau admin yang boleh hapus
    if (role !== "ADMIN" && todo.userId !== userId) {
      throw new ForbiddenException("You can only delete your own todos");
    }

    await TodoRepository.delete(id);
  },
};
