# TaskFlow Desktop ⚡💎

A modern, high-performance desktop task management application inspired by **Linear** and **Slack**, designed with an **Apple Liquid Glass** aesthetic, frosted glass translucency, local-first architecture, and a secure Electron IPC bridge.

---

## 🌟 Highlights

- **Local-First Architecture**: Zero external databases or remote servers. All records are persisted locally in structured JSON files.
- **Apple Liquid Glass UI**: Translucent frosted panels (`backdrop-filter: blur(24px) saturate(180%)`), macOS-style window controls, zero-pill typographic discipline, and smooth Framer Motion layout transitions.
- **Dynamic Accent Customization**: Customize the theme accent color from Appearance settings with default `#5b8def` (Electric Blue), preset swatches, or an RGB/hex picker.
- **Interactive Views**:
  - **Kanban Board**: Drag-and-drop cards across *To Do*, *In Progress*, *In Review*, *Blocked*, and *Completed* columns with live status sync.
  - **Table List View**: Dense scannability with multi-column sorting (due date, priority, title, created) and filters.
  - **Calendar View**: Monthly deadline matrix with direct card inspection.
  - **My Tasks & Overdue Views**: Filtered views for individual workloads and urgent deadlines.
- **Hourly Desktop Reminder Engine**: Persistent background scheduler scans pending tasks and delivers alerts while respecting configurable **Quiet Hours** and audio chimes.
- **Collaboration & Audit Trail**: Threaded replies, `@mention` auto-completion, file/image attachments with an image lightbox, and an activity audit log.
- **Multi-User & Multi-Org**: Role-based access control (Owner, Admin, Member), local invitation codes (`TF-XXXXXX`), and a 1-click **User Switcher** for local team simulation.
- **Command Palette (`⌘K` / `Ctrl+K`)**: Global search across tasks, projects, and system shortcuts.
- **Data Safety & Portability**: Atomic file writes, automatic backup rotation, and one-click JSON export and restore.

---

## 🏗️ Storage & IPC Architecture

TaskFlow Desktop isolates all filesystem I/O in the Electron main process via `contextBridge`. The renderer never interacts directly with Node.js APIs.

```text
userData/
├── database/
│   ├── users.json          # Local credentials & profile records
│   ├── organizations.json  # Workspaces & role assignments
│   ├── projects.json       # Projects, milestones, and metadata
│   ├── tasks.json          # Tasks, statuses, priorities, labels, due dates
│   ├── comments.json       # Threaded conversations & replies
│   ├── activities.json     # Audit timeline entries
│   ├── notifications.json  # Desktop notification logs
│   └── sessions.json       # Active user session
├── settings/
│   └── preferences.json    # Theme, accent color (#5b8def), quiet hours
├── backups/                # Rolling snapshot backups
└── uploads/                # Local attachments & profile avatars
```

### Storage File Locations by OS:
- **macOS**: `~/Library/Application Support/TaskFlowDesktop/database/`
- **Windows**: `%APPDATA%\TaskFlowDesktop\database\`
- **Linux**: `~/.config/TaskFlowDesktop/database/`
- **Web Preview Mode**: Synchronized with `localStorage` and downloadable JSON archives.

---

## 📋 Prerequisites

Before running the project, ensure you have the following installed on your machine:

- **Node.js**: `v18.0.0` or higher (`v20.x` or `v22.x` recommended)
- **Package Manager**: `npm` (comes with Node), `bun`, or `pnpm`
- **Git**: Installed and configured on your terminal

Verify your installation:
```bash
node -v
npm -v
git --version
```

---

## 🚀 Clone & Setup Guide

### 1. Clone the Repository

Clone this repository to your local computer:

```bash
git clone https://github.com/your-username/taskflow-desktop.git
cd taskflow-desktop
```

### 2. Install Dependencies

Install all required frontend and build dependencies:

```bash
npm install
```

*(Or if using Bun: `bun install`)*

---

## 💻 Running the Application

### Option A: Development Web Server (Fast Browser Preview)

Start the high-speed Vite dev server with Tailwind CSS:

```bash
npm run dev
```

Open your browser at:
```text
http://localhost:3000
```

> **Note**: In browser preview mode, TaskFlow automatically uses the built-in browser IPC bridge backed by localStorage and local JSON exports.

### Option B: Desktop Application (Electron)

To run the native desktop shell with window vibrancy, Tray menu, and desktop notifications:

```bash
npm run electron:dev
```

### Option C: Type Checking & Linting

Run TypeScript validation across all modules:

```bash
npm run lint
```

### Option D: Production Web Build

Compile the production bundle to `/dist`:

```bash
npm run build
```

---

## 👥 Instant Demo Accounts

The database comes pre-seeded with realistic projects and tasks across 3 accounts (Default Password: `password123`):

| Name | Email | Role | Title |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | `sarah@taskflow.local` | Owner | Head of Product |
| **Alex Vance** | `alex@taskflow.local` | Admin | Principal Engineer |
| **Jordan Blake** | `jordan@taskflow.local` | Member | Design Director |

> 💡 **Tip**: Click your avatar in the top-right corner and select **"Switch Local User"** to switch accounts in 1 click and simulate assignments, comments, and reminders!

---

## ⚙️ Configuration & Customization

Open **Preferences** (`Settings` in sidebar or profile dropdown):

1. **Appearance**:
   - Toggle **Dark Slate** or **Light Crystal** mode.
   - Set **Theme Accent Color** (default `#5b8def`, preset swatches, or hex picker).
2. **Reminders & Quiet Hours**:
   - Enable/disable hourly desktop scans.
   - Adjust reminder intervals (30m, 60m, 120m).
   - Configure **Quiet Hours** (e.g., `22:00` to `08:00`) to suppress alerts.
   - Toggle synthesized Web Audio Liquid Glass chimes.
3. **Storage & Backups**:
   - View total database records and storage footprint.
   - Trigger an immediate atomic backup.
   - **Export JSON Database**: Downloads a complete `.json` copy of all records.
   - **Import / Restore JSON**: Restores from any valid TaskFlow JSON backup.
   - **Reset Database**: Restores the default template.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`⌘K` / `Ctrl+K`** | Open Command Palette / Global Search |
| **`Escape`** | Close open modals, drawers, or command palette |
| **`Enter`** | Save edited task title or submit comment |

---

## 📦 Packaging for Windows & macOS

To bundle a standalone `.exe` installer (Windows) or `.dmg` / `.app` (macOS):

1. Install `electron-builder`:
   ```bash
   npm install --save-dev electron-builder
   ```

2. Build and package:
   ```bash
   npm run build
   npx electron-builder --mac
   # or on Windows
   npx electron-builder --win
   ```

---

## 🛡️ License

TaskFlow Desktop is distributed under the **Apache-2.0 License**.
