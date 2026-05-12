# Project Directory Structure

This document provides a detailed overview of the files and directories in the **DB Final Project**.

## Root Directory
- `.env.example` - Template for environment variables.
- `.gitignore` - Git ignore rules.
- `.claude/` - Claude-specific settings.
- `.planning/` - Project planning and configuration.
- `client/` - Frontend application (React + Vite).
- `server/` - Backend application (Node.js + Express).
- `DB_project/` - Java-based database/CLI component.
- `plan/` - Project documentation and plans.

---

## 1. Client (Frontend)
The frontend is built with **React**, **Vite**, and **Tailwind CSS**.

- `client/src/`
  - `api/` - API service calls and configurations.
  - `assets/` - Static assets like images and icons.
  - `components/` - Reusable UI components.
    - `chat/` - Chat-related components.
    - `feed/` - News feed and post components.
    - `friends/` - Friend management components.
    - `games/` - Mini-game or game-related components.
    - `layout/` - Shared layout elements (Header, Sidebar).
    - `notifications/` - Notification system components.
    - `ui/` - Generic UI components (Buttons, Inputs, Modals).
    - `Avatar.jsx`, `Layout.jsx`, `PostCard.jsx`, `ProtectedRoute.jsx`
  - `pages/` - Main page components (Login, Register, Home, Profile, etc.).
  - `store/` - State management (e.g., Redux or Context API).
  - `App.jsx` - Main application component.
  - `App.css` - Global styles for the App.
  - `index.css` - Tailwind and global CSS.
  - `main.jsx` - Application entry point.
  - `socket.js` - Client-side Socket.io configuration.
- `client/public/` - Public assets.
- `client/package.json` - Frontend dependencies and scripts.
- `client/vite.config.js` - Vite configuration.
- `client/tailwind.config.js` - Tailwind CSS configuration.

---

## 2. Server (Backend)
The backend is built with **Node.js**, **Express**, and **Socket.io**.

- `server/db/` - Database connection and schema definitions.
- `server/middleware/` - Custom Express middleware (Auth, Error handling).
- `server/routes/` - API route definitions.
  - `auth.js` - Authentication routes (Login, Signup).
  - `chats.js` - Chat and messaging routes.
  - `feed.js` - User feed routes.
  - `friends.js` - Friend request and list routes.
  - `games.js` - Game-related backend logic.
  - `messages.js` - Direct messaging routes.
  - `notifications.js` - Notification management.
  - `posts.js` - Post creation and management.
  - `users.js` - User profile and search routes.
- `server/sockets/` - Socket.io event handlers for real-time features.
- `server/app.js` - Express application setup.
- `server/server.js` - Server entry point and listener.
- `server/package.json` - Backend dependencies and scripts.

---

## 3. DB_project (Java Component)
A Java-based component, possibly for database operations or a CLI interface.

- `DB_project/src/com/facebook/` - Java source code (package structure).
- `DB_project/summary.txt` - Summary or documentation for this component.
- `DB_project/final year cli.iml` - IntelliJ IDEA module file.

---

## 4. Documentation & Planning
- `.planning/PROJECT.md` - Overall project roadmap and tasks.
- `plan/DIRECTORY.MD` - This file.
