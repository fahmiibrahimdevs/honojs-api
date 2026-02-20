# 🚀 Hono.js REST API

REST API lengkap dibangun dengan **Bun**, **Hono.js v3**, dan **Prisma ORM**.
Menggunakan Clean Architecture dengan autentikasi JWT dual-token, multi-role authorization, dan CRUD todos.

---

## 🧱 Tech Stack

| Kebutuhan | Teknologi |
|---|---|
| Runtime | Bun v1.3+ |
| Framework | Hono.js v3 |
| ORM | Prisma v5 + MySQL |
| Validasi | Zod v3 |
| Auth | JWT dual-token (access + refresh) |
| Password | Bun.password (bcrypt) |
| ID | UUID v4 |

---

## 📁 Struktur Proyek

```
src/
├── config/          → Konfigurasi dari env vars
├── controllers/     → HTTP handler (validasi + panggil service)
├── exceptions/      → Custom exception classes
├── lib/             → Prisma singleton
├── middleware/      → Auth & role middleware
├── repositories/    → Query database (Prisma)
├── routes/          → Definisi path API
├── services/        → Logika bisnis
├── types/           → Interface & type global
└── utils/           → Helper (response, logger, jwt, password)
prisma/
└── schema.prisma    → Skema database
```

---

## ⚙️ Instalasi

### 1. Clone & Install

```bash
git clone https://github.com/fahmiibrahimdevs/honojs-api.git
cd honojs-api
bun install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Isi file `.env`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/honojs_api"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
PORT=3000
```

### 3. Migrasi Database

```bash
bun run db:migrate
```

### 4. Jalankan Server

```bash
# Development (auto-reload)
bun run dev

# Production
bun run start
```

Server berjalan di `http://localhost:3000`

---

## 🔐 Autentikasi

API menggunakan **JWT dual-token**:

| Token | Expire | Kegunaan |
|---|---|---|
| `accessToken` | 15 menit | Dipakai di setiap request di header `Authorization` |
| `refreshToken` | 7 hari | Hanya untuk memperbarui access token yang expired |

**Format header:**
```
Authorization: Bearer <accessToken>
```

---

## 👤 Role & Akses

| Role | Keterangan |
|---|---|
| `ADMIN` | Akses penuh ke semua endpoint |
| `MODERATOR` | Akses terbatas (bisa dikembangkan) |
| `USER` | Akses ke profil sendiri dan todo sendiri |

---

## 📡 API Endpoints

### Base URL
```
http://localhost:3000
```

### Health Check

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/` | ❌ | Status server |

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Hono.js REST API",
    "version": "2.0.0",
    "status": "running",
    "timestamp": "2026-02-20T00:00:00.000Z"
  }
}
```

---

### 🔑 Auth — `/api/auth`

#### Setup Admin Pertama
> Hanya bisa dijalankan sekali. Akan error jika admin sudah ada.

```
POST /api/auth/setup-admin
```

**Body:**
```json
{
  "name": "Super Admin",
  "email": "admin@example.com",
  "password": "password123",
  "phone": "081234567890",
  "birthDate": "1990-01-01"
}
```

---

#### Register User Baru

```
POST /api/auth/register
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "081234567890",
  "birthDate": "1995-06-15"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-02-20T00:00:00.000Z"
  }
}
```

---

#### Login

```
POST /api/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "status": "ACTIVE"
    }
  }
}
```

---

#### Refresh Token

```
POST /api/auth/refresh-token
```

**Body:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

#### Lihat Profil *(Auth required)*

```
GET /api/auth/profile
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890",
    "birthDate": "1995-06-15T00:00:00.000Z",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-02-20T00:00:00.000Z"
  }
}
```

---

#### Update Profil *(Auth required)*

```
PUT /api/auth/profile
```

**Body (semua opsional):**
```json
{
  "name": "John Updated",
  "phone": "089876543210",
  "birthDate": "1995-06-15"
}
```

---

#### Ganti Password *(Auth required)*

```
POST /api/auth/change-password
```

**Body:**
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

---

#### Logout *(Auth required)*

```
POST /api/auth/logout
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 📝 Todos — `/api/todos`

> Semua endpoint todos memerlukan autentikasi.
> ADMIN melihat semua todo. USER hanya melihat todo miliknya.

#### List Todos

```
GET /api/todos
GET /api/todos?page=1&limit=10
GET /api/todos?search=belajar
GET /api/todos?search=belajar&page=1&limit=5
```

**Query Params:**

| Param | Default | Deskripsi |
|---|---|---|
| `page` | `1` | Nomor halaman |
| `limit` | `10` | Jumlah per halaman |
| `search` | — | Cari di title & description |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Belajar Hono.js",
      "description": "Pelajari dokumentasi Hono.js",
      "completed": false,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-02-20T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "search": "belajar"
  }
}
```

---

#### Detail Todo

```
GET /api/todos/:id
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Belajar Hono.js",
    "description": "Pelajari dokumentasi Hono.js",
    "completed": false,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2026-02-20T00:00:00.000Z",
    "updatedAt": "2026-02-20T00:00:00.000Z"
  }
}
```

---

#### Buat Todo

```
POST /api/todos
```

**Body:**
```json
{
  "title": "Belajar Prisma ORM",
  "description": "Pelajari relasi dan migrasi",
  "completed": false
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Todo created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "title": "Belajar Prisma ORM",
    "description": "Pelajari relasi dan migrasi",
    "completed": false,
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

#### Update Todo

```
PUT /api/todos/:id
```

**Body (semua opsional):**
```json
{
  "title": "Judul baru",
  "description": "Deskripsi baru",
  "completed": true
}
```

---

#### Hapus Todo

```
DELETE /api/todos/:id
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Todo deleted successfully"
}
```

---

### 👥 Users — `/api/users`

> Semua endpoint users memerlukan **ADMIN** role.

#### List Users

```
GET /api/users
GET /api/users?page=1&limit=10
GET /api/users?role=USER
GET /api/users?status=ACTIVE
GET /api/users?role=USER&status=ACTIVE&page=1&limit=5
```

**Query Params:**

| Param | Nilai | Deskripsi |
|---|---|---|
| `page` | `1` | Nomor halaman |
| `limit` | `10` | Jumlah per halaman |
| `role` | `ADMIN` / `MODERATOR` / `USER` | Filter berdasarkan role |
| `status` | `ACTIVE` / `INACTIVE` | Filter berdasarkan status |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "status": "ACTIVE",
      "_count": { "todos": 3 },
      "createdAt": "2026-02-20T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### Detail User

```
GET /api/users/:id
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890",
    "role": "USER",
    "status": "ACTIVE",
    "todos": [],
    "_count": { "todos": 0 }
  }
}
```

---

#### Buat User *(Admin)*

```
POST /api/users
```

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "MODERATOR",
  "phone": "081234567890",
  "birthDate": "1998-03-20"
}
```

---

#### Update Role User *(Admin)*

```
PATCH /api/users/:id/role
```

**Body:**
```json
{
  "role": "MODERATOR"
}
```

---

#### Update Status User *(Admin)*

```
PATCH /api/users/:id/status
```

**Body:**
```json
{
  "status": "INACTIVE"
}
```

---

#### Hapus User *(Admin)*

```
DELETE /api/users/:id
```

> Admin tidak bisa menghapus akunnya sendiri.

**Response `200`:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## ❌ Format Error Response

Semua error menggunakan format yang konsisten:

```json
{
  "success": false,
  "message": "Pesan error",
  "errors": []
}
```

**HTTP Status codes:**

| Code | Keterangan |
|---|---|
| `400` | Bad Request — input tidak valid |
| `401` | Unauthorized — token tidak ada / expired |
| `403` | Forbidden — tidak punya izin |
| `404` | Not Found — data tidak ditemukan |
| `409` | Conflict — data sudah ada (misal: email duplikat) |
| `422` | Unprocessable Entity — validasi Zod gagal |
| `500` | Internal Server Error |

**Contoh error validasi `422`:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

---

## 🛠️ Scripts

```bash
bun run dev          # Development server dengan auto-reload
bun run start        # Production server
bun run db:generate  # Generate Prisma client
bun run db:push      # Push schema ke database (tanpa migrasi)
bun run db:migrate   # Buat dan jalankan migrasi
bun run db:studio    # Buka Prisma Studio (GUI database)
```

---

## 📖 Referensi

- [Hono.js Docs](https://hono.dev)
- [Prisma Docs](https://www.prisma.io/docs)
- [Bun Docs](https://bun.sh/docs)
- [Zod Docs](https://zod.dev)
