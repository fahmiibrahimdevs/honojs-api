/**
 * routes/todos.ts
 *
 * Definisi route untuk endpoint Todo (/api/todos/...).
 *
 * Semua route di sini memerlukan autentikasi (authMiddleware).
 * Kontrol akses (siapa boleh akses apa) ditangani di service layer.
 *
 * Ini adalah Resource Route ala Laravel:
 *   Route::apiResource('todos', TodoController::class);
 *
 * Yang menghasilkan:
 *   GET    /api/todos       → index   (list)
 *   POST   /api/todos       → store   (buat)
 *   GET    /api/todos/:id   → show    (detail)
 *   PUT    /api/todos/:id   → update  (update)
 *   DELETE /api/todos/:id   → destroy (hapus)
 */

import { Hono } from "hono";
import { TodoController } from "../controllers/todo.controller";
import { authMiddleware } from "../middleware/auth";

const router = new Hono();

// Semua route todo memerlukan user yang sudah login
router.use("*", authMiddleware);

// Resource routes (Laravel style)
router.get("/", TodoController.index); // GET    /api/todos        - list todo
router.post("/", TodoController.store); // POST   /api/todos        - buat todo baru
router.get("/:id", TodoController.show); // GET    /api/todos/:id    - detail todo
router.put("/:id", TodoController.update); // PUT    /api/todos/:id    - update todo
router.delete("/:id", TodoController.destroy); // DELETE /api/todos/:id    - hapus todo

export default router;
