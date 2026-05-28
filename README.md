# Sales CRM — Backend API

## Setup

```bash
cd backend
npm install
# Make sure MongoDB is running locally
npm run seed      # populate dummy data
npm run dev       # start dev server (nodemon)
npm start         # production
```

Server runs on: `http://localhost:5000`

---

## Auth Header
All protected routes require:
```
Authorization: Bearer <token>
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → returns `{ token, user }` |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update own profile (name, phone, profileImage) |

### Users (Team Members)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | All users (Admin+) |
| GET | `/api/users/team` | Non-super-admin users (for dropdowns) |
| POST | `/api/users` | Create user (Admin+) |
| PATCH | `/api/users/:id` | Update user (Admin+) |
| DELETE | `/api/users/:id` | Delete user (Super Admin only) |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | All leads (query: search, status, assignedTo, page, limit) |
| GET | `/api/leads/:id` | Single lead |
| POST | `/api/leads` | Create lead |
| PATCH | `/api/leads/:id` | Update lead |
| PATCH | `/api/leads/assign/bulk` | Bulk assign `{ ids[], assignedTo }` |
| DELETE | `/api/leads` | Bulk delete `{ ids[] }` |
| PATCH | `/api/leads/:id/notes` | Add note `{ text }` |

### Follow-ups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/followups` | All follow-ups (query: status, assignedTo, date) |
| POST | `/api/followups` | Create follow-up |
| PATCH | `/api/followups/:id` | Update follow-up |
| DELETE | `/api/followups/:id` | Delete follow-up |

### Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activities` | Recent activities (query: limit, default 50) |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | All invoices (query: status, search) |
| GET | `/api/invoices/summary` | Totals by status |
| POST | `/api/invoices` | Create invoice (Admin+) |
| PATCH | `/api/invoices/:id` | Update invoice (Admin+) |
| DELETE | `/api/invoices/:id` | Delete invoice (Admin+) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | All KPIs in one request (fast parallel queries) |

---

## Login Credentials (after seed)
- **Super Admin:** aayup@gmail.com / aayup2025
- **Admin:** amit@salescrm.in / amit123
- **Sales Exec:** sneha@salescrm.in / sneha123
