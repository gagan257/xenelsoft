# Project API Documentation

This is the common documentation file for the whole backend project. Created By Gagan Arora

Current coverage:
- Task 1: Authentication and Authorization

Base URL:
- Local: `http://localhost:4000` (set in .env)
- API prefix: `/api`

## Environment Setup

Required in `backend/.env`:

```env
MONGODB_URI=
JWT_SECRET=
PORT=
JWT_EXPIRES_IN=
```

Optional bootstrap admin:

```env
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=ChangeThisSecurePassword1!
```

---

## Task 1 - Authentication and Authorization

Features covered:
- User registration and login
- Secure password hashing (`bcrypt`)
- JWT token authentication
- Role-based access (`admin`, `user`)

### Auth Header

Use this header for protected endpoints:

```http
Authorization: Bearer <JWT_TOKEN>
```

### Rate Limit

Auth endpoints are rate-limited:
- `20` requests / `10` minutes per client

### Endpoints

#### 1) Register User

- Method: `POST`
- URL: `/api/auth/register`
- Auth required: No

Request:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Success (`201`):

```json
{
  "token": "<jwt>",
  "user": {
    "id": "6817...",
    "email": "user@example.com",
    "role": "user"
  }
}
```

Common errors:
- `400` invalid email/password
- `409` email already registered
- `429` too many attempts

#### 2) Login User

- Method: `POST`
- URL: `/api/auth/login`
- Auth required: No

Request:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Success (`200`):

```json
{
  "token": "<jwt>",
  "user": {
    "id": "6817...",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2026-05-05T..."
  }
}
```

Common errors:
- `400` invalid/missing input
- `401` invalid credentials
- `429` too many attempts

#### 3) Get Current User

- Method: `GET`
- URL: `/api/auth/me`
- Auth required: Yes

Success (`200`):

```json
{
  "id": "6817...",
  "email": "user@example.com",
  "role": "user",
  "createdAt": "2026-05-05T..."
}
```

Notes:
- Supports `If-None-Match` / `ETag` and may return `304`.

Common errors:
- `401` invalid or expired token
- `404` user not found

#### 4) Admin-Only Health

- Method: `GET`
- URL: `/api/admin/health`
- Auth required: Yes
- Role required: `admin`

Success (`200`):

```json
{
  "ok": true,
  "message": "Admin-only endpoint reachable."
}
```

Common errors:
- `401` unauthenticated
- `403` insufficient role

#### 5) Admin - Update User Role

- Method: `PATCH`
- URL: `/api/admin/users/:userId/role`
- Auth required: Yes
- Role required: `admin`

Request:

```json
{
  "role": "admin"
}
```

Allowed role values:
- `admin`
- `user`

Success (`200`):

```json
{
  "id": "6817...",
  "email": "user@example.com",
  "role": "admin"
}
```

Common errors:
- `400` invalid role / self role change
- `404` user not found
- `403` insufficient role

#### 6) User-Only Demo Route

- Method: `GET`
- URL: `/api/user/welcome`
- Auth required: Yes
- Role required: `user`

Success (`200`):

```json
{
  "message": "Standard user area. Admins receive 403 here (role separation demo)."
}
```

Common errors:
- `401` unauthenticated
- `403` insufficient role

### Quick Usage Flow

1. Register or login to receive JWT.
2. Send JWT in `Authorization` header.
3. Access protected profile endpoint (`/api/auth/me`).
4. Use admin/user role routes based on user role.

### cURL Examples

Register:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"Password123!\"}"
```

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"Password123!\"}"
```

Get current user:

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Task 2 - Resource Management API (Products)

Module implemented: `Products`

Base route:
- `/api/products` (JWT required)

### Supported Features

- CRUD operations
- Pagination
- Filtering and sorting
- Efficient MongoDB querying

### Endpoints

#### 1) Create Product

- Method: `POST`
- URL: `/api/products`

Request body:

```json
{
  "name": "Laptop Pro",
  "sku": "LP-1001",
  "description": "16-inch model",
  "price": 1299.99,
  "category": "electronics",
  "stock": 8,
  "isActive": true
}
```

Success: `201`

#### 2) List Products

- Method: `GET`
- URL: `/api/products`

Query params:
- Pagination: `page`, `limit`
- Filters: `category`, `sku`, `minPrice`, `maxPrice`, `isActive`, `q`
- Sorting: `sortBy`, `sortOrder`
- Performance mode: `summary=true`, `cursor=<token>`

Success: `200`

```json
{
  "data": [],
  "meta": {
    "mode": "page",
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0,
    "sortBy": "createdAt",
    "sortOrder": "desc",
    "summary": false
  }
}
```

#### 3) Get Product by ID

- Method: `GET`
- URL: `/api/products/:id`
- Supports `ETag` / `If-None-Match`

Success: `200` or `304`

#### 4) Update Product

- Method: `PATCH`
- URL: `/api/products/:id`

Partial update supported.

Success: `200`

#### 5) Delete Product

- Method: `DELETE`
- URL: `/api/products/:id`

Success: `204`

#### 6) Product Meta/Help Endpoint

- Method: `GET`
- URL: `/api/products/meta`

Returns supported filters/sort/pagination hints for clients.

### Efficient Querying Notes

- Uses indexes on product fields (`category`, `price`, `isActive`, text index, and `createdAt/_id`).
- Uses `lean()`/aggregation patterns for faster reads.
- List endpoint uses single pipeline strategies (`$facet` in page mode).

---

## Task 3 - Performance Considerations

Implemented optimizations for read-heavy endpoints:

- `compression` middleware for faster response transfer.
- ETag support on:
  - `/api/auth/me`
  - `/api/products/:id`
- Reduced payload support:
  - `summary=true` for product lists (drops heavy fields like long description).
- Scalable pagination:
  - Offset mode (`page/limit`) for common usage.
  - Cursor mode (`cursor`) for deep pagination with better performance.
- Fewer DB round-trips:
  - Aggregation-based list querying.

---

## Task 4 - File Upload System

Base route:
- `/api/uploads` (JWT required)

Storage strategy:
- Physical files: `backend/uploads/`
- Metadata: MongoDB `Upload` collection

### Supported Upload Types

Images:
- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

Documents:
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `text/plain`

### File Validation

- MIME type whitelist enforced.
- Max size controlled by env:
  - `UPLOAD_MAX_FILE_SIZE_MB` (default `5`)
- Max files for multi-upload: `5`

### Endpoints

#### 1) Upload Single File

- Method: `POST`
- URL: `/api/uploads/single`
- Form-data field: `file`

Success: `201`

#### 2) Upload Multiple Files

- Method: `POST`
- URL: `/api/uploads/multiple`
- Form-data field: `files`

Success: `201`

#### 3) List My Uploaded Files

- Method: `GET`
- URL: `/api/uploads`

Success: `200`

### Accessible URLs

- Public static path: `/uploads/<stored-file-name>`
- API response includes:
  - `url` (full URL)
  - `path` (relative URL path)

Optional env:

```env
UPLOAD_MAX_FILE_SIZE_MB=5
UPLOAD_BASE_URL=
```

Use `UPLOAD_BASE_URL` when serving behind proxy/domain/CDN.

---

## Task 5 - Error Handling and Logging

### Centralized Error Handling

- Global not-found handler for unknown routes.
- Global error handler maps known error classes/types to proper HTTP responses.
- Unified error response shape:

```json
{
  "error": "message",
  "code": "ERROR_CODE",
  "requestId": "uuid"
}
```

### Reusable Error Utilities

- Common reusable errors via `AppError` and helpers:
  - `badRequest`
  - `unauthorized`
  - `forbidden`
  - `notFound`
  - `conflict`

### Logging

- Request logs via `morgan`
- Structured application logs via custom logger utility
- Request correlation:
  - `X-Request-Id` added to every response
  - Same `requestId` included in error logs/responses
- Process-level safety logs:
  - `unhandledRejection`
  - `uncaughtException`

### HTTP Status Handling

Examples:
- `400` validation/bad input
- `401` auth errors
- `403` role/permission denied
- `404` resource missing
- `409` duplicate/constraint conflict
- `413` upload too large
- `429` rate limit exceeded
- `500` unexpected server errors

---

## Task 6 - Security Enhancements

Implemented protections for common vulnerabilities and abuse:

- `helmet` for secure HTTP headers.
- Rate limiting:
  - Global `/api` limiter
  - Auth-specific limiter (`/auth/register`, `/auth/login`)
  - Upload-specific limiter (`/uploads/*`)
- Input sanitization middleware:
  - Removes dangerous keys (`$`, `.`, `__proto__`, etc.)
  - Protects against NoSQL/prototype-injection style payloads.
- JWT authentication and role guards on protected routes.
- File upload hardening:
  - strict type whitelist
  - size limits
- Small JSON body limit to reduce abuse surface.

---

## Run and Test

Install and run:

```bash
cd backend
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:4000/api/health
```

---

## API Smoke Test Checklist

Use this quick checklist to verify all major flows after setup.

### 1) Health

```bash
curl http://localhost:4000/api/health
```

Expected: `200`

### 2) Register and Login

Register:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"smoke_user@example.com\",\"password\":\"Password123!\"}"
```

Login:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"smoke_user@example.com\",\"password\":\"Password123!\"}"
```

Expected: `201` for register, `200` for login, both return JWT token.

### 3) Auth + RBAC

- `GET /api/auth/me` with Bearer token -> `200`
- `GET /api/user/welcome` with user token -> `200`
- `GET /api/admin/health` with user token -> `403`
- `GET /api/admin/health` with admin token -> `200`

### 4) Products

- `POST /api/products` -> `201`
- `GET /api/products` -> `200`
- `GET /api/products/:id` -> `200`
- `PATCH /api/products/:id` -> `200`
- `DELETE /api/products/:id` -> `204`

Optional ETag check:
- Call `GET /api/products/:id`, copy `ETag`
- Call again with `If-None-Match` -> `304`

### 5) Uploads

- `POST /api/uploads/single` (form-data `file`) -> `201`
- `POST /api/uploads/multiple` (form-data `files`) -> `201`
- `GET /api/uploads` -> `200`

Notes:
- Upload supports configured image/document MIME types only.
- Exceeding size limit returns `413`.

### 6) Error and Security Checks

- Invalid token on protected route -> `401`
- Invalid product id format -> `400`
- Duplicate registration email -> `409`
- Burst auth calls should eventually hit rate limit -> `429`
