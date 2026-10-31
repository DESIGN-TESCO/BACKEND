# Tesco Structures — Design CRM Backend

Node.js + Express + MongoDB (Mongoose) REST API for the Design CRM frontend.
Files are stored directly in MongoDB (no third-party storage). Auth is JWT, signed
with a secret that can be **shared with the other Tesco CRMs** for single sign-on.

## Requirements
- Node.js 18+
- A MongoDB database — the **same database as Procurement** (set `MONGO_URI` to the
  same value). The Design CRM writes to its own `design_*` collections, so it shares
  the database without touching the `purchase_*` data.

## Setup
```bash
cd Backend
npm install
cp .env.example .env      # then edit .env (see below)
npm run seed:admin        # optional: create the first login accounts
npm start                 # or: npm run dev  (auto-reload with nodemon)
```
The API starts on `http://localhost:<PORT>` (default 5006). Health check:
`GET /api/health`.

## Environment variables (.env)
| Variable | Required | Description |
|---|---|---|
| `PORT` | no (5006) | Port the API listens on. |
| `NODE_ENV` | no | `development` or `production`. |
| `MONGO_URI` | **yes** | MongoDB connection string. **Set it to the SAME value Procurement uses** (same cluster + `salescrm` database) to share the database. The Design CRM uses its own `design_*` collections, so it coexists with the `purchase_*` ones. (`MONGODB_URI` accepted as a fallback.) |
| `JWT_SECRET` | **yes** | Secret used to sign & verify JWTs. **Set this to the SAME value as your other Tesco CRMs** to share logins across them. |
| `JWT_EXPIRES_IN` | no (7d) | Token lifetime, e.g. `7d`, `12h`. |
| `CORS_ORIGINS` | no (`*`) | Comma-separated allowed frontend origins, e.g. `http://localhost:5173,https://design.tescomanagement.com`. |
| `MAX_UPLOAD_MB` | no (12) | Max size per uploaded file (stored in MongoDB; keep < 16 MB). |
| `SEED_HEAD_EMAIL` / `SEED_HEAD_PASSWORD` / `SEED_HEAD_NAME` | for seed | First Design Head login created by `npm run seed:admin`. |
| `SEED_TEAM_EMAIL` / `SEED_TEAM_PASSWORD` / `SEED_TEAM_NAME` | for seed | First Design Team login created by `npm run seed:admin`. |

> The database starts **empty** (no sample data). Use `npm run seed:admin` once so
> you can log in, then create designers, requests, etc. through the app/API.

## Auth & roles
- `POST /api/auth/login` → `{ token, user }`. Send the token as
  `Authorization: Bearer <token>` on every other request.
- Roles: `design_head` (full access) and `design_team`.
- Because tokens are signed with the shared `JWT_SECRET`, a token issued by another
  Tesco CRM with the same secret is also accepted here (and vice-versa).

## API overview (all under `/api`, all require auth except `/auth/login` & `/health`)
| Resource | Routes |
|---|---|
| Auth | `POST /auth/login`, `GET/PUT /auth/me`, `PUT /auth/password`, `GET/POST /auth/users` (head) |
| Requests | `GET/POST /requests`, `GET/PUT/DELETE /requests/:id`, `POST /requests/:id/assign`, `PUT /requests/:id/designer`, `PUT /requests/:id/status`, `POST /requests/:id/comments`, `PUT /requests/:id/requirement`, `POST /requests/:id/attachments` |
| Designers | `GET/POST /designers`, `GET/PUT/DELETE /designers/:id`, `GET /designers/:id/requests` |
| BOQs | `GET/POST /boqs`, `GET/PUT/DELETE /boqs/:id` |
| Submittals | `GET/POST /submittals`, `GET/PUT/DELETE /submittals/:id`, `PUT /submittals/:id/status` |
| Drawings | `GET/POST /drawings`, `GET/PUT/DELETE /drawings/:id` |
| Documents | `GET/POST /documents`, `GET/PUT/DELETE /documents/:id` |
| Revisions | `GET/POST /revisions`, `GET/PUT/DELETE /revisions/:id` |
| Activities | `GET/POST /activities` |
| Notifications | `GET/POST /notifications`, `PUT /notifications/read-all`, `PUT /notifications/:id/read`, `DELETE /notifications/:id` |
| Files | `POST /files` (upload), `GET /files?entity=&entityId=` (list), `GET /files/:id` (stream, `?download=1`), `DELETE /files/:id` |
| Stats | `GET /stats/head`, `GET /stats/team?designer=` |

### File uploads
Upload is JSON + base64: `POST /api/files` with
`{ entity, entityId, name, type, size, dataBase64, uploadedBy }` → returns `{ fileId }`.
Reference that `fileId` on the owning record (request attachment, submittal, drawing,
document). Stream it back for preview/download at `GET /api/files/:fileId`.

## Project structure
```
src/
  server.js            app entry (connect DB, listen)
  app.js               express app, CORS, routes, error handling
  config/db.js         Mongo connection
  middleware/          auth (JWT), error handler, body validator
  models/              Mongoose schemas (one per entity)
  controllers/         request handlers (business logic)
  routes/              route definitions per resource
  utils/               id generation, workload engine, seed script, helpers
```
