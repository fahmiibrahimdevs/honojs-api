# Hono.js REST API dengan Prisma ORM

REST API lengkap yang dibangun dengan **Bun**, **Hono.js**, dan **Prisma ORM**. API ini menyediakan sistem autentikasi lengkap, manajemen user dengan multi-role, dan CRUD operations untuk todos yang dilindungi dengan admin-only access.

## 🚀 Fitur

### ✅ Sistem Autentikasi Lengkap
- User registration dengan role assignment
- User login/logout
- Token-based authentication (Bearer tokens)
- Token refresh mechanism
- Profile management
- Password change functionality

### 🔐 Multi-Role Authorization
- Admin, User, dan Moderator roles
- Role-based access control
- Admin-only protected routes

### 👥 User Management
- Active/Inactive user status
- Email uniqueness validation
- Password confirmation validation
- Profile updates (name, email, phone, birth date)
- **Admin can manage all users:**
  - View all users with pagination & filters
  - Create users with any role
  - Update user roles (USER/MODERATOR/ADMIN)
  - Update user status (ACTIVE/INACTIVE)
  - Delete users
- **Easy admin setup:** One-time endpoint untuk create admin pertama

### 📝 Admin-Only CRUD
- Todos management (Create, Read, Update, Delete)
- Protected by admin middleware
- **Users can also manage their own todos**

## 📋 Prerequisites

Sebelum memulai, pastikan Anda telah menginstal:

- **Bun** >= 1.0.0 ([Install Bun](https://bun.sh))
- **PostgreSQL** >= 13.0
- **Git**

## 🛠️ Instalasi

### 1. Clone Repository

```bash
cd /var/www/projects/api/honojs-api
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Environment Variables

Copy file `.env.example` ke `.env` dan sesuaikan konfigurasi:

```bash
cp .env.example .env
```

Edit file `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/honojs_api?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
PORT=3000
```

### 4. Setup Database

Generate Prisma Client:

```bash
bun run db:generate
```

Push schema ke database:

```bash
bun run db:push
```

Atau gunakan migration:

```bash
bun run db:migrate
```

### 5. Jalankan Server

Development mode (dengan auto-reload):

```bash
bun run dev
```

Production mode:

```bash
bun run start
```

Server akan berjalan di `http://localhost:3000`

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Response Format

Semua response menggunakan format JSON.

**Success Response:**
```json
{
  "message": "Success message",
  "data": {}
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": [] // Optional validation errors
}
```

---

## 🔐 Authentication Endpoints

### 0. Setup First Admin

Endpoint khusus untuk membuat admin pertama. Hanya bisa digunakan **SEKALI** saat belum ada admin di database.

**Endpoint:** `POST /api/auth/setup-admin`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "admin123",
  "passwordConfirmation": "admin123",
  "name": "Admin User",
  "phone": "08123456789"
}
```

**Response (201 Created):**
```json
{
  "message": "First admin created successfully",
  "data": {
    "id": "clxxxxxx",
    "email": "admin@example.com",
    "name": "Admin User",
    "phone": "08123456789",
    "birthDate": null,
    "role": "ADMIN",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (403 Forbidden) - Jika admin sudah ada:**
```json
{
  "error": "Admin already exists. Use /api/users endpoint to create more admins."
}
```

### 1. Register User

Mendaftarkan user baru dengan role USER.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "passwordConfirmation": "password123",
  "name": "John Doe",
  "phone": "08123456789",
  "birthDate": "1990-01-01"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "data": {
    "id": "clxxxxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "08123456789",
    "birthDate": "1990-01-01T00:00:00.000Z",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Login

Login dan mendapatkan access token & refresh token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clxxxxxx",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "status": "ACTIVE"
    }
  }
}
```

### 3. Refresh Token

Mendapatkan access token baru menggunakan refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 4. Logout

Logout dan menghapus refresh token.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

### 5. Get Profile

Mendapatkan profil user yang sedang login.

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "clxxxxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "08123456789",
    "birthDate": "1990-01-01T00:00:00.000Z",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Update Profile

Update profil user yang sedang login.

**Endpoint:** `PUT /api/auth/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone": "08987654321",
  "birthDate": "1990-12-31"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "clxxxxxx",
    "email": "user@example.com",
    "name": "John Doe Updated",
    "phone": "08987654321",
    "birthDate": "1990-12-31T00:00:00.000Z",
    "role": "USER",
    "status": "ACTIVE",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 7. Change Password

Mengubah password user yang sedang login.

**Endpoint:** `POST /api/auth/change-password`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123",
  "passwordConfirmation": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

---

## 📝 Todos Endpoints

Semua endpoint todos memerlukan authentication. 
- **USER**: Dapat CRUD todos milik sendiri
- **ADMIN**: Dapat CRUD semua todos dari semua user

### 1. Get All Todos

Mendapatkan todos dengan pagination.
- USER: Hanya melihat todos milik sendiri
- ADMIN: Melihat semua todos dari semua user

**Endpoint:** `GET /api/todos?page=1&limit=10`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `page` (optional): Halaman yang ingin diambil (default: 1)
- `limit` (optional): Jumlah data per halaman (default: 10)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "clxxxxxx",
      "title": "Complete project",
      "description": "Finish the API documentation",
      "completed": false,
      "userId": "clxxxxxx",
      "user": {
        "id": "clxxxxxx",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 2. Get Todo by ID

Mendapatkan detail todo berdasarkan ID.
- USER: Hanya bisa akses todo milik sendiri
- ADMIN: Bisa akses semua todo

**Endpoint:** `GET /api/todos/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "clxxxxxx",
    "title": "Complete project",
    "description": "Finish the API documentation",
    "completed": false,
    "userId": "clxxxxxx",
    "user": {
      "id": "clxxxxxx",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Create Todo

Membuat todo baru (semua authenticated user bisa create).

**Endpoint:** `POST /api/todos`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Complete project",
  "description": "Finish the API documentation",
  "completed": false
}
```

**Response (201 Created):**
```json
{
  "message": "Todo created successfully",
  "data": {
    "id": "clxxxxxx",
    "title": "Complete project",
    "description": "Finish the API documentation",
    "completed": false,
    "userId": "clxxxxxx",
    "user": {
      "id": "clxxxxxx",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Todo

Update todo berdasarkan ID.
- USER: Hanya bisa update todo milik sendiri
- ADMIN: Bisa update semua todo

**Endpoint:** `PUT /api/todos/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "title": "Complete project - Updated",
  "description": "Finish all documentation",
  "completed": true
}
```

**Response (200 OK):**
```json
{
  "message": "Todo updated successfully",
  "data": {
    "id": "clxxxxxx",
    "title": "Complete project - Updated",
    "description": "Finish all documentation",
    "completed": true,
    "userId": "clxxxxxx",
    "user": {
      "id": "clxxxxxx",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

### 5. Delete Todo

Menghapus todo berdasarkan ID.
- USER: Hanya bisa delete todo milik sendiri
- ADMIN: Bisa delete semua todo

**Endpoint:** `DELETE /api/todos/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Todo deleted successfully"
}
```

---

## 👥 User Management Endpoints (Admin Only)

Semua endpoint user management memerlukan authentication dan role ADMIN.

### 1. Get All Users

Mendapatkan semua users dengan pagination dan filter.

**Endpoint:** `GET /api/users?page=1&limit=10`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Query Parameters:**
- `page` (optional): Halaman yang ingin diambil (default: 1)
- `limit` (optional): Jumlah data per halaman (default: 10)
- `role` (optional): Filter by role (USER, MODERATOR, ADMIN)
- `status` (optional): Filter by status (ACTIVE, INACTIVE)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "clxxxxxx",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "08123456789",
      "birthDate": "1990-01-01T00:00:00.000Z",
      "role": "USER",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "todos": 5
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### 2. Get User by ID

Mendapatkan detail user berdasarkan ID beserta todos-nya.

**Endpoint:** `GET /api/users/:id`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "clxxxxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "08123456789",
    "birthDate": "1990-01-01T00:00:00.000Z",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "todos": [
      {
        "id": "clxxxxxx",
        "title": "Complete task",
        "completed": false,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "_count": {
      "todos": 5
    }
  }
}
```

### 3. Create User by Admin

Admin dapat membuat user baru dengan role apapun.

**Endpoint:** `POST /api/users`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "phone": "08111222333",
  "birthDate": "1995-05-15",
  "role": "USER",
  "status": "ACTIVE"
}
```

**Response (201 Created):**
```json
{
  "message": "User created successfully",
  "data": {
    "id": "clxxxxxx",
    "email": "newuser@example.com",
    "name": "New User",
    "phone": "08111222333",
    "birthDate": "1995-05-15T00:00:00.000Z",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update User Role

Mengubah role user (USER/MODERATOR/ADMIN).

**Endpoint:** `PATCH /api/users/:id/role`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

**Response (200 OK):**
```json
{
  "message": "User role updated successfully",
  "data": {
    "id": "clxxxxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ADMIN",
    "status": "ACTIVE",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 5. Update User Status

Mengubah status user (ACTIVE/INACTIVE).

**Endpoint:** `PATCH /api/users/:id/status`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Request Body:**
```json
{
  "status": "INACTIVE"
}
```

**Response (200 OK):**
```json
{
  "message": "User status updated successfully",
  "data": {
    "id": "clxxxxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "status": "INACTIVE",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 6. Delete User

Menghapus user berdasarkan ID. Admin tidak bisa menghapus akun sendiri.

**Endpoint:** `DELETE /api/users/:id`

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Response (200 OK):**
```json
{
  "message": "User deleted successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Cannot delete your own account"
}
```

---

## 🔒 Authorization

API ini menggunakan **Bearer Token Authentication**. Setiap request yang memerlukan autentikasi harus menyertakan header:

```
Authorization: Bearer <access_token>
```

### Role-Based Access Control

- **USER**: Dapat mengakses dan mengupdate profil sendiri, CRUD todos milik sendiri
- **MODERATOR**: (Reserved untuk future features)
- **ADMIN**: Dapat mengakses semua endpoint termasuk:
  - CRUD semua todos dari semua user
  - User management (create, read, update role/status, delete users)

---

## ⚠️ Error Codes

| Status Code | Deskripsi |
|-------------|-----------|
| 200 | OK - Request berhasil |
| 201 | Created - Resource berhasil dibuat |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource tidak ditemukan |
| 500 | Internal Server Error - Server error |

---

## 🗄️ Database Schema

### User Model

```prisma
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  password     String
  name         String
  phone        String?
  birthDate    DateTime?
  role         Role       @default(USER) // ADMIN, MODERATOR, USER
  status       UserStatus @default(ACTIVE) // ACTIVE, INACTIVE
  refreshToken String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  todos        Todo[]
}
```

### Todo Model

```prisma
model Todo {
  id          String   @id @default(cuid())
  title       String
  description String?
  completed   Boolean  @default(false)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 🧪 Testing dengan cURL

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "passwordConfirmation": "password123",
    "name": "John Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Get Profile

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create Todo (Admin Only)

```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project",
    "description": "Finish documentation"
  }'
```

---

## 📁 Project Structure

```
honojs-api/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   └── index.ts           # App configuration
│   ├── lib/
│   │   └── prisma.ts          # Prisma client instance
│   ├── middleware/
│   │   ├── auth.ts            # Authentication middleware
│   │   └── role.ts            # Role-based authorization
│   ├── routes/
│   │   ├── auth.ts            # Authentication routes
│   │   ├── todos.ts           # Todos routes
│   │   └── users.ts           # User management routes
│   ├── utils/
│   │   ├── jwt.ts             # JWT utilities
│   │   └── password.ts        # Password hashing
│   ├── validators/
│   │   ├── auth.ts            # Auth validation schemas
│   │   ├── todo.ts            # Todo validation schemas
│   │   └── user.ts            # User validation schemas
│   └── index.ts               # Main application
├── .env                       # Environment variables
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Deployment

### Production Build

```bash
bun run start
```

### Environment Variables untuk Production

Pastikan untuk mengubah nilai berikut di production:

- `JWT_SECRET`: Gunakan secret key yang kuat
- `JWT_REFRESH_SECRET`: Gunakan secret key yang kuat dan berbeda
- `DATABASE_URL`: URL database production

---

## 🛠️ Prisma Commands

```bash
# Generate Prisma Client
bun run db:generate

# Push schema ke database (development)
bun run db:push

# Create migration
bun run db:migrate

# Open Prisma Studio (Database GUI)
bun run db:studio
```

---

## 📝 Catatan Penting

1. **JWT Tokens**:
   - Access token berlaku selama 15 menit
   - Refresh token berlaku selama 7 hari
   - Gunakan refresh token untuk mendapatkan access token baru

2. **Password Requirements**:
   - Minimal 6 karakter
   - Password harus sama dengan passwordConfirmation

3. **Admin User**:
   - **Cara 1 (Recommended)**: Gunakan endpoint `/api/auth/setup-admin` untuk membuat admin pertama
   - **Cara 2**: Register user biasa, lalu ubah role di database:
     - Gunakan Prisma Studio: `bun run db:studio`
     - Atau manual: `UPDATE users SET role='ADMIN' WHERE email='admin@example.com';`
   - **Cara 3**: Setelah ada 1 admin, admin dapat membuat admin lain via endpoint `/api/users`

4. **Security**:
   - Jangan commit file `.env` ke repository
   - Gunakan environment variables yang kuat di production
   - Implementasikan rate limiting untuk production

---

## 🤝 Contributing

Contributions, issues, dan feature requests are welcome!

---

## 📄 License

This project is MIT licensed.

---

## 👨‍💻 Author

Built with ❤️ using Bun, Hono.js, and Prisma ORM

---

## 📞 Support

Jika ada pertanyaan atau masalah, silakan buat issue di repository ini.

---

**Happy Coding! 🎉**
