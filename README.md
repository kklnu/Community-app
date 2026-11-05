# Community App

A Progressive Web App for a small community. Members share their profiles (phone, email), raise **issues** (for example, "Potluck Lunch"), and other members volunteer **tasks** for them ("I will bring pizza", "I will bring chips"). Everyone can see every issue and task. Only the owner can change their own issues, tasks and profile.

**Live app (GitHub Pages):** https://kklnu.github.io/Community-app/  
**Source code:** https://github.com/kklnu/Community-app

It's a **Progressive Web App**: you can install it from the browser's address bar, and it works offline.

## Try it

Sign in with any demo account. The password for all of them is `community123`.

| Email | Name | Owns |
|---|---|---|
| `susan@community.example` | Susan Miller | Potluck Lunch |
| `joey@community.example` | Joey Carter | Winter Coat Drive; task "I will bring pizza" |
| `sam@community.example` | Sam Patel | Neighborhood Watch Schedule; task "I will bring lunch" |
| `lisa@community.example` | Lisa Chen | Community Garden Cleanup |
| `george@community.example` | George Brooks | Playground Fundraiser; task "I will bring chips" |

You can also create your own account. Every email can be used by only one member.

## Assignment requirements

| Requirement | How it's met |
|---|---|
| Deployed on github.io as a PWA | GitHub Pages, with a web app manifest, app icons and a service worker (`sw.js`) for installing and offline use |
| Member profiles (phone, email) | Members page and profile pages; edit from "Edit my profile" |
| Issues, tasks (assigned to a member), comments on tasks only | Each task belongs to the member who took it on. Comments open from the "Comment" link on a task. |
| Unique email/password login | Signing in uses email + password. Duplicate emails are rejected. Passwords are stored as salted PBKDF2 hashes. |
| Only the member can change their own profile | Checked in `public/js/store.js`. The UI shows a lock on other members' profiles. |
| Only the member can update their own issue, task and comment | Ownership checks on every update and delete in `public/js/store.js` |

## Features

- **Sign-in with email and password.** Passwords are hashed with PBKDF2.
- **Ownership rules, enforced on the server.** Anyone signed in can view everything and volunteer. Only the owner can edit or delete an issue, task or profile. The UI shows a lock on anything you can't edit.
- **Task status** can be Open, In progress, Completed or Closed. Change it with a segmented control or the quick "done" switch.
- **Issues** have a category, priority, due date and a progress bar. **Tasks** have their own comment threads. You can view them as cards, a Kanban board (drag your own issues between columns) or a sortable table. You can also export them to CSV.
- **Dependency map with critical path.** Tasks can depend on other tasks. The app lays them out as a network, works out the critical path (the longest chain by duration), and highlights it.
- **3D community galaxy.** Members are planets, issues are ringed worlds and tasks orbit their issue in their status color. Drag to rotate, scroll to zoom, click anything to open it.
- **Live sync between open tabs** with a notification.
- **Dashboard** with KPIs, task-status and category charts, "Needs attention" and recent activity.
- **Command palette** (Ctrl + K) to search issues, tasks and people.
- Activity log, member directory with profiles, and a responsive layout that works on phones.

## How it works

GitHub Pages only hosts static files, so the app's data layer runs in the browser. `public/js/store.js` is a small database kept in `localStorage`. It has the same routes, validation and ownership checks a server would. The first visit loads the demo community. "How it works" → **Reset demo data** restores it.

| Part | Files |
|---|---|
| UI | `public/index.html`, `public/styles.css`, `public/app.js` |
| Data and rules | `public/js/store.js` |
| 3D galaxy and task plan | `public/js/galaxy.js`, `public/js/graph.js` |
| PWA | `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` |

There are no npm dependencies.

## Run locally

```bash
npm start   # http://localhost:3000
```

## Deployment

`.github/workflows/pages.yml` publishes `public/` to GitHub Pages on every push to `main`.
