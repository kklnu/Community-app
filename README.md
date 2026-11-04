# Community App

A full-stack web app for a small community. Members raise **issues** (for example, "Potluck Lunch"), and other members volunteer **tasks** for them ("I will bring pizza", "I will bring chips"). Everyone can see every issue and task. Only the owner can change their own issues, tasks and profile.

**Live app:** https://community-app.onrender.com  
**Frontend on GitHub Pages:** https://kklnu.github.io/Community-app/  
**Source code:** https://github.com/kklnu/Community-app

> The backend runs on Render's free tier, which goes to sleep when idle. The first request after a break can take up to a minute while it wakes up.

## Try it

Sign in with any demo account. The password for all of them is `community123`.

| Username | Name | Owns |
|---|---|---|
| `susan` | Susan Miller | Potluck Lunch |
| `joey` | Joey Carter | Winter Coat Drive; task "I will bring pizza" |
| `sam` | Sam Patel | Neighborhood Watch Schedule; task "I will bring lunch" |
| `lisa` | Lisa Chen | Community Garden Cleanup |
| `george` | George Brooks | Playground Fundraiser; task "I will bring chips" |

You can also create your own account on the sign-in page.

## Features

- **Sign-in and accounts.** Passwords are hashed with scrypt. Sessions use bearer tokens.
- **Ownership rules, enforced on the server.** Anyone signed in can view everything and volunteer. Only the owner can edit or delete an issue, task or profile. The UI shows a lock on anything you can't edit.
- **Task status** can be Open, In progress, Completed or Closed. Change it with a segmented control or the quick "done" switch.
- **Issues** have a category, priority, due date, a progress bar and a discussion thread. You can view them as cards, a Kanban board (drag your own issues between columns) or a sortable table. You can also export them to CSV.
- **Dependency map with critical path.** Tasks can depend on other tasks. The app lays them out as a network, works out the critical path (the longest chain by duration), and highlights it.
- **3D community galaxy.** Members are planets, issues are ringed worlds and tasks orbit their issue in their status color. Drag to rotate, scroll to zoom, click anything to open it.
- **Live sync.** Changes made by other members appear right away through server-sent events, with a notification.
- **Dashboard** with KPIs, task-status and category charts, "Needs attention" and recent activity.
- **Command palette** (Ctrl + K) to search issues, tasks and people.
- Activity log, member directory with profiles, and a responsive layout that works on phones.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS and plain JavaScript modules with no framework. The 3D scene is a custom canvas renderer. |
| Backend | Node.js 22 `http` server with a REST JSON API (`server.js`) |
| Database | SQLite through Node's built-in `node:sqlite`. The file is `data/community.db`. |
| Hosting | Render runs the backend and frontend. GitHub Pages hosts the frontend separately. |

There are **no npm dependencies**, so nothing needs to be installed.

### Database schema

`members`, `sessions`, `issues` (owner: member), `tasks` (belongs to an issue, owner: member), `task_deps` (task depends on task), `comments`, `activity`.

### Main API routes

| Method | Route | Who |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` | anyone |
| GET | `/api/bootstrap` (members, issues, tasks, dependencies) | signed in |
| POST | `/api/issues` | signed in |
| PUT / DELETE | `/api/issues/:id` | issue owner |
| POST | `/api/issues/:id/tasks` (volunteer) | signed in |
| PUT / DELETE | `/api/tasks/:id` | task owner |
| PUT | `/api/members/:id` | that member only |
| GET / POST | `/api/issues/:id/comments` | signed in |
| GET | `/api/events` (live updates), `/api/activity` | signed in |

## Run locally

You need Node.js 22.13 or newer.

```bash
npm start          # http://localhost:3000
npm run reset      # delete the database and start again with the demo data
```

## Deployment

1. **Backend (Render):** On render.com, choose New, then Blueprint, and pick this repository. `render.yaml` sets up a free Node web service. The database starts with the demo data, and it resets whenever the service restarts.
2. **Frontend (GitHub Pages):** In the repository, open Settings, then Pages, and set Source to "GitHub Actions". `.github/workflows/pages.yml` publishes `public/` on every push. `public/config.js` tells the Pages copy where the Render API is.
