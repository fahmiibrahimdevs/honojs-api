/**
 * controllers/todo.controller.ts
 *
 * Controller untuk semua operasi CRUD Todo.
 *
 * Semua endpoint memerlukan autentikasi (authMiddleware).
 * Kontrol akses (siapa boleh akses todo siapa) ditangani di TodoService.
 *
 * Penamaan method mengikuti konvensi Laravel Resource Controller:
 *   index   → GET    /api/todos       (list)
 *   show    → GET    /api/todos/:id   (detail)
 *   store   → POST   /api/todos       (buat)
 *   update  → PUT    /api/todos/:id   (update)
 *   destroy → DELETE /api/todos/:id   (hapus)
 */

import type { Context } from "hono";
import { TodoService } from "../services/todo.service";
import { response } from "../utils/response";
import { createTodoSchema, updateTodoSchema } from "../validators/todo";
import { ValidationException } from "../exceptions";

export const TodoController = {
  /**
   * GET /api/todos?page=1&limit=10
   * Ambil semua todo dengan paginasi.
   * - ADMIN : melihat todo semua user
   * - USER  : hanya melihat todo milik sendiri
   */
  async index(c: Context) {
    const user = c.get("user"); // Data user dari JWT (via authMiddleware)
    const page = Number(c.req.query("page")) || 1; // Default halaman 1
    const limit = Number(c.req.query("limit")) || 10; // Default 10 per halaman
    const search = c.req.query("search") || undefined; // Keyword pencarian (opsional)

    const result = await TodoService.getAll(user.userId, user.role, page, limit, search);
    return response.paginated(c, result.data, result.meta);
  },

  /**
   * GET /api/todos/:id
   * Ambil detail satu todo beserta info user pemiliknya.
   * User biasa tidak bisa akses todo milik orang lain.
   */
  async show(c: Context) {
    const id = c.req.param("id"); // ID todo dari URL
    const user = c.get("user");

    const todo = await TodoService.getById(id, user.userId, user.role);
    return response.success(c, todo);
  },

  /**
   * POST /api/todos
   * Buat todo baru. userId otomatis diambil dari token (bukan dari body).
   */
  async store(c: Context) {
    const user = c.get("user");
    const body = await c.req.json();
    const result = createTodoSchema.safeParse(body); // Validasi: title wajib, description & completed opsional
    if (!result.success) throw new ValidationException(result.error.errors);

    // Gabungkan data validasi dengan userId dari token
    const todo = await TodoService.create({ ...result.data, userId: user.userId });
    return response.created(c, todo, "Todo created successfully"); // HTTP 201
  },

  /**
   * PUT /api/todos/:id
   * Update todo. Semua field opsional (partial update).
   * User biasa tidak bisa update todo milik orang lain.
   */
  async update(c: Context) {
    const id = c.req.param("id");
    const user = c.get("user");
    const body = await c.req.json();
    const result = updateTodoSchema.safeParse(body); // Validasi: semua field opsional
    if (!result.success) throw new ValidationException(result.error.errors);

    const todo = await TodoService.update(id, user.userId, user.role, result.data);
    return response.success(c, todo, "Todo updated successfully");
  },

  /**
   * DELETE /api/todos/:id
   * Hapus todo secara permanen.
   * User biasa tidak bisa hapus todo milik orang lain.
   */
  async destroy(c: Context) {
    const id = c.req.param("id");
    const user = c.get("user");

    await TodoService.delete(id, user.userId, user.role);
    return response.noContent(c, "Todo deleted successfully"); // HTTP 200 tanpa data
  },
};
