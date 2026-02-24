/**
 * controllers/user.controller.ts
 *
 * Controller untuk manajemen user oleh admin.
 *
 * Semua endpoint di sini hanya bisa diakses oleh ADMIN.
 * Proteksi dilakukan di level route (users.ts) menggunakan
 * authMiddleware + adminOnly middleware.
 *
 * Penamaan method mengikuti konvensi Laravel Resource Controller:
 *   index   → GET    /api/users       (list semua)
 *   show    → GET    /api/users/:id   (detail satu)
 *   store   → POST   /api/users       (buat baru)
 *   destroy → DELETE /api/users/:id   (hapus)
 *   + custom: updateRole, updateStatus
 */

import type { Context } from "hono";
import { UserService } from "../services/user.service";
import { response } from "../utils/response";
import { updateUserRoleSchema, updateUserStatusSchema, createUserByAdminSchema } from "../validators/user";
import { ValidationException } from "../exceptions";
import type { UserRole, UserStatus } from "../types";

export const UserController = {
  /**
   * GET /api/users?page=1&limit=10&role=USER&status=ACTIVE
   * Ambil semua user dengan paginasi dan filter opsional.
   * Query params: page, limit, role, status
   */
  async index(c: Context) {
    const page = Number(c.req.query("page")) || 1; // Default halaman 1
    const limit = Number(c.req.query("limit")) || 10; // Default 10 per halaman
    const role = c.req.query("role") as UserRole | undefined; // Filter role (opsional)
    const status = c.req.query("status") as UserStatus | undefined; // Filter status (opsional)

    const result = await UserService.getAll({ role, status }, page, limit);
    return response.paginated(c, result.data, result.meta); // Response dengan metadata paginasi
  },

  /**
   * GET /api/users/:id
   * Ambil detail satu user beserta 10 todo terakhir dan total todo.
   */
  async show(c: Context) {
    const id = c.req.param("id"); // Ambil ID dari URL parameter
    const user = await UserService.getById(id);
    return response.success(c, user);
  },

  /**
   * POST /api/users
   * Buat user baru oleh admin (bisa set role dan status).
   */
  async store(c: Context) {
    const body = await c.req.json();
    const result = createUserByAdminSchema.safeParse(body); // Validasi termasuk role dan status
    if (!result.success) throw new ValidationException(result.error.issues);

    const user = await UserService.create(result.data);
    return response.created(c, user, "User created successfully"); // HTTP 201
  },

  /**
   * PATCH /api/users/:id/role
   * Ubah role user: USER, MODERATOR, atau ADMIN.
   */
  async updateRole(c: Context) {
    const id = c.req.param("id");
    const body = await c.req.json();
    const result = updateUserRoleSchema.safeParse(body); // Validasi: role harus salah satu enum
    if (!result.success) throw new ValidationException(result.error.issues);

    const user = await UserService.updateRole(id, result.data.role);
    return response.success(c, user, "User role updated successfully");
  },

  /**
   * PATCH /api/users/:id/status
   * Aktifkan atau nonaktifkan akun user.
   */
  async updateStatus(c: Context) {
    const id = c.req.param("id");
    const body = await c.req.json();
    const result = updateUserStatusSchema.safeParse(body); // Validasi: status harus ACTIVE/INACTIVE
    if (!result.success) throw new ValidationException(result.error.issues);

    const user = await UserService.updateStatus(id, result.data.status);
    return response.success(c, user, "User status updated successfully");
  },

  /**
   * DELETE /api/users/:id
   * Hapus user dari database. Admin tidak bisa hapus diri sendiri.
   * Todo milik user akan ikut terhapus (cascade).
   */
  async destroy(c: Context) {
    const id = c.req.param("id");
    const currentUser = c.get("user"); // Admin yang sedang login

    await UserService.delete(id, currentUser.userId); // Service akan cek self-delete
    return response.noContent(c, "User deleted successfully");
  },
};
