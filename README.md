# IPTV Admin Panel

A secure, fancy admin dashboard to manage IPTV server hosts for the **Mochahada TV** Android app. Admins log in to add, edit, or remove hosts; the Android app fetches the active host list on startup and tries each one with the user's credentials until one responds.

![status](https://img.shields.io/badge/status-production--ready-success)
![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![license](https://img.shields.io/badge/license-private-lightgrey)

---

## Features

- **Admin login** — bcrypt + account lockout + per-IP brute-force protection
- **Host CRUD** — add, edit, delete IPTV server URLs with priority + enable/disable
- **Public API** — Android app fetches enabled hosts on demand (sorted by priority)
- **Legacy compatibility** — `/api/legacy/auth` returns the exact JSON the original app expects
- **Audit log** — every login and host change recorded with IP & user agent
- **Fancy UI** — glassmorphism + animated gradient + IPTV "live" vibe (purple / cyan neon)
- **CSRF, HSTS, CSP, HPP, XSS sanitization, mongo-sanitize, signed cookies**
- **Optional HMAC** signing on the public host endpoint (anti-scraping)
- **Optional IP allowlist** for admin routes

---

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT (HS256) in signed httpOnly cookies, bcrypt (cost 14) |
| Frontend | HTML + Tailwind (CDN) + vanilla JS |
| Security | helmet, express-rate-limit, express-slow-down, custom CSRF, mongo-sanitize, xss-clean, hpp |

---

## Project structure

```
admin-panel/
├── server.js                # Express entry point
├── config/db.js             # MongoDB connection
├── models/
│   ├── User.js              # Admin accounts
│   ├── Host.js              # IPTV hosts
│   ├── AuditLog.js          # Action audit trail
│   └── LoginAttempt.js      # IP-based brute force tracking
├── middleware/
│   ├── auth.js              # JWT protect
│   ├── csrf.js              # Double-submit CSRF
│   ├── audit.js             # Audit helper
│   ├── ipFilter.js          # Optional IP allowlist
│   └── security.js          # Helmet, rate limit, slowdown, CSP
├── controllers/
│   ├── authController.js
│   └── hostController.js
├── routes/
│   ├── auth.js              # /api/auth/*
│   ├── hosts.js             # /api/hosts/*
│   └── legacy.js            # /api/legacy/* for the app
├── utils/seedAdmin.js       # Create the first admin account
└── public/
    ├── index.html           # Login page
    ├── dashboard.html       # Host management UI
    ├── css/style.css        # Custom animations
    └── js/{login,dashboard}.js
```

---

## Quick start (local)

### Prerequisites

- Node.js **18+**
- MongoDB running locally **or** a MongoDB Atlas URI

### Install & run

```bash
git clone <this-repo>
cd admin-panel
npm install
cp .env.example .env
# edit .env — set strong JWT_SECRET, COOKIE_SECRET, MONGO_URI, SEED_ADMIN_PASSWORD
npm run seed                 # creates the first admin user
npm start                    # http://localhost:3000
```

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run twice — once for `JWT_SECRET`, once for `COOKIE_SECRET`.

---

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `PORT` | no | `3000` | |
| `NODE_ENV` | no | `development` | Set `production` to enable HSTS + secure cookies |
| `MONGO_URI` | **yes** | — | MongoDB connection string |
| `JWT_SECRET` | **yes** | — | 64+ random chars |
| `JWT_EXPIRES_IN` | no | `2h` | |
| `COOKIE_SECRET` | **yes** | — | 64+ random chars (signs cookies) |
| `SEED_ADMIN_USERNAME` | seed | `admin` | Used by `npm run seed` |
| `SEED_ADMIN_PASSWORD` | seed | — | Min 8 chars |
| `ALLOWED_ORIGIN` | no | * | Comma-separated list of allowed CORS origins |
| `BCRYPT_COST` | no | `14` | Higher = slower & more secure (12–15 typical) |
| `ADMIN_IP_ALLOWLIST` | no | — | Comma-separated IPs/prefixes allowed on admin routes |
| `PUBLIC_API_HMAC_SECRET` | no | — | If set, `/api/hosts/public` requires `X-Signature` + `X-Timestamp` |

---

## API

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hosts/public` | Returns enabled hosts (`url`, `priority`). Optional HMAC required. |
| ANY | `/api/legacy/auth` | Returns hosts in the original app's `AppInfoModel` format |
| ANY | `/api/legacy/update` | No-op success response (compat) |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/csrf` | Issue CSRF token cookie |
| POST | `/api/auth/login` | Body `{ username, password }` |
| POST | `/api/auth/logout` | Clears session |
| GET | `/api/auth/me` | Current user info |

### Hosts (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hosts` | List all hosts |
| POST | `/api/hosts` | Create `{ name, url, notes?, priority?, enabled? }` |
| PUT | `/api/hosts/:id` | Update host |
| DELETE | `/api/hosts/:id` | Delete host |

All mutating routes require `X-CSRF-Token` header.

---

## Security model

| Threat | Mitigation |
|--------|------------|
| Password brute force (per account) | 5 fails → 15 min lock |
| Password brute force (per IP) | 15 fails → IP blocked 15 min |
| Stolen JWT | Signed cookies + invalidated on password change |
| CSRF | Double-submit cookie token, timing-safe compare |
| XSS | helmet CSP (script nonces), `xss-clean`, escaped output |
| NoSQL injection | `express-mongo-sanitize` |
| HTTP parameter pollution | `hpp` |
| Clickjacking | `frame-deny` |
| MITM | HSTS preload (production) |
| Public API scraping | Optional HMAC + 5-min timestamp window |
| Unauthorized admin access | Optional IP allowlist |

---

## Production deployment (Render + MongoDB Atlas + UptimeRobot)

### 1. MongoDB Atlas

- Create free **M0** cluster
- Database user with strong password
- Network access: `0.0.0.0/0`
- Copy the connection URI

### 2. Render

- New **Web Service** → connect this GitHub repo
- Build: `npm install` · Start: `npm start`
- Add all required env vars (see table above) — `NODE_ENV=production`
- Deploy

### 3. Seed admin

Render dashboard → service → **Shell** tab:

```bash
npm run seed
```

### 4. Keep-alive (free tier sleeps after 15 min)

UptimeRobot → new HTTP monitor → URL `https://your-app.onrender.com/api/hosts/public` → interval **5 min**.

### 5. Point the Android app

In the modded APK, set:

```
PanelUrl._panelUrl = "https://your-app.onrender.com/api/legacy/"
```

---

## Android app integration

The app calls `_panelUrl + "auth"` (POST) and expects this JSON shape (already returned by `/api/legacy/auth`):

```json
{
  "mac_registered": true,
  "urls": [
    { "id": "1", "name": "Server EU", "url": "https://...", "type": "0", "is_protected": "0" }
  ],
  "theme": "1",
  "app_version": "50.0",
  "expire_date": "2099-12-31",
  "lock": 0,
  "pin": "0000",
  "parent_control": "0000"
}
```

The app caches this list in `SharedPreferences`, so the panel only needs to be reachable on first install or when the user clicks **Reload Portal**.

---

## Scripts

| Command | What |
|---------|------|
| `npm start` | Run server |
| `npm run dev` | Run with nodemon (auto-reload) |
| `npm run seed` | Create the first admin user from `.env` |

---

## License

Private project. Not for public redistribution.
