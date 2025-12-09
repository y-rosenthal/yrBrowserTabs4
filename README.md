
# TabMaster AI

**TabMaster AI** is a powerful dashboard to visualize, search, and organize browser tabs across multiple windows. It leverages Google's **Gemini AI** to automatically categorize messy tabs into logical groups and rename windows intelligently.

---

## 🚀 Features

### 🧠 AI Organization
- **Group Tabs**: Click **"Organize with AI"** to have Gemini analyze and group your tabs into categories (e.g., "Development", "Social", "News").
- **Apply to Windows**: Instantly move tabs into physical browser windows based on these AI categories.
- **Auto-Name Windows**: Let AI generate descriptive names for your windows based on their content.

### ⚡ Navigation & Management
- **Global Search**: Find any tab instantly by title or URL across all windows.
- **Drag & Drop**: (Coming soon) currently supported via "Merge Windows" and "Move" buttons.
- **Bulk Actions**: Select multiple tabs or windows to close, move, or merge them.
- **Keyboard Support**: Full keyboard navigation (Arrows to move, Enter to switch).

### 🛠️ Customization
- **Themes**: Switch between Dark and Light modes.
- **Export**: Download your tab data as CSV or Markdown.
- **Privacy**: Your API Key is stored locally in your browser and never sent to our servers.

---

## 📖 User Guide

### 1. Organizing Tabs
1.  **Sidebar**: Click the **"Organize with AI"** button.
2.  **View Results**: Tabs will be grouped visually.
3.  **Refine**: 
    - Use the **"Sort All"** dropdown to sort all groups by Name, Domain, etc.
    - Click individual column headers to sort specific groups.
4.  **Apply**: Click **"Apply to Windows"** to reorganize your actual browser windows. Use **"Undo"** if needed.

### 2. Managing Windows
- **Rename**: Double-click a window name in the sidebar to rename it.
- **Auto-Name**: Click the **Wand Icon** to auto-generate names for all windows.
- **Merge**: Select multiple windows via checkboxes and click **"Merge Windows"**.

### 3. Setup
1.  Get a free API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click the **Gear Icon** in the top-right corner.
3.  Paste your key.

---

## 👨‍💻 Developer Setup

This project is built with React, Vite, TailwindCSS, and the Google GenAI SDK.

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run development server:
    ```bash
    npm run dev
    ```

### Building for Chrome Extension
1.  Run the build command:
    ```bash
    npm run build
    ```
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer Mode** (top right).
4.  Click **Load Unpacked** and select the `dist` folder created by the build.
