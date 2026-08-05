
# TabMaster AI

**TabMaster AI** is a smart dashboard to organize your browser chaos. It uses Google's **Gemini AI** to automatically group your messy tabs and name your windows, so you can focus on what matters.

📚 **Full documentation** (specs and design history): https://y-rosenthal.github.io/yrBrowserTabs4/

---

## 💿 How to Install (Quick Start)

**You do not need to be a developer to use this!** Follow these simple steps:

1.  **Download**: 
    - Click the green **Code** button at the top of this GitHub page.
    - Select **Download ZIP**.
    - Unzip (extract) the downloaded file somewhere on your computer.

2.  **Open Extensions in Chrome**:
    - Open Google Chrome.
    - In the address bar, type `chrome://extensions` and press **Enter**.

3.  **Enable Developer Mode**:
    - Look at the top right corner of the Extensions page.
    - Click the toggle switch next to **Developer mode** to turn it **ON**.

4.  **Load the Extension**:
    - Three new buttons will appear at the top left. Click **Load unpacked**.
    - A file picker will open. Navigate to the folder you just unzipped.
    - **Crucial Step**: Select the folder named **`dist`** inside the project folder.
    - Click **Select Folder** (or Open).

5.  **Done!** 
    - TabMaster AI is now installed. 
    - Click the puzzle piece icon 🧩 in your Chrome toolbar to pin it.
    - Clicking the TabMaster icon opens the dashboard in a **full browser tab** (if a dashboard tab is already open in the current window, it is focused instead).

---

## 🚀 Features

### 🗂️ Categorizing Tabs
- **Categorize by Website**: Instantly group the currently displayed tabs into a section per website (domain name) — no AI needed.
- **Categorize with AI**: Let Gemini group the currently displayed tabs into semantic categories (e.g., "Development", "Social", "News").
- **Apply to Windows**: Physically reorganize your browser windows to match either grouping — undoable.
- **Auto-Name Windows**: Let AI generate descriptive names for your windows based on their content.

### 🔍 Search & Domains
- **Global Search**: Search every window at once. By default the search looks at **domain names** (e.g. "github.com"); use the scope switch inside the search bar to search tab titles & URLs, or even the **text of the pages themselves**.
- **Domain Browser**: The sidebar header counts your distinct websites — click the domain count to pick a site and see only its tabs, along with the window each tab lives in.

### ⚡ Navigation & Management
- **Bulk Actions**: Check multiple tabs (or "Check All" the current view — it flips to "Uncheck All"), then use **Move ▾** to send them to a **new or existing window**, or close them all at once. TabMaster stays focused after moves, and every move can be **undone/redone** (multi-level).
- **Preview Panel**: Live preview of the selected tab with its **full URL** (copyable) and its window. Flip through the window's other tabs with ◀ ▶ arrows or the tab dropdown.
- **Smart Selection**: Clicking a window re-selects the tab you last viewed there; closing a previewed tab automatically previews its neighbor.
- **Card & Detail Views**: A sortable table or visual cards with live page thumbnails (cards are the default; resize with the slider or the [ and ] keys).
- **Keyboard Support**: Full keyboard navigation (Arrows to move, Enter to switch, Ctrl+Left/Right to change panes).
- **Interactive Tour**: A guided tour points at each feature on screen; use its "Tour Steps" panel to jump to any topic.

### 🛠️ Customization
- **Themes**: Switch between Dark and Light modes.
- **Export**: Download your tab data as CSV or Markdown.
- **Privacy**: Your API Key is stored locally in your browser and never sent to our servers.

---

## 📖 User Guide

### 1. Categorizing Tabs
1.  **Sidebar**: Click **"Categorize by Website"** (instant) or **"Categorize with AI"** (Gemini). Both act on the tabs currently displayed — filter first to categorize a subset.
2.  **View Results**: Tabs are grouped into sections.
3.  **Refine**:
    - Use the **"Sort All"** dropdown to sort all groups by Name, Domain, etc.
    - Click individual column headers to sort specific groups.
4.  **Apply**: Click **"Apply to Windows"** to reorganize your actual browser windows. Use **"Undo Reorg"** if needed.

### 2. Managing Windows
- **Rename**: Double-click a window name in the sidebar to rename it.
- **Auto-Name**: Click the **Wand Icon** to auto-generate names for all windows.
- **Merge**: Select multiple windows via checkboxes and click **"Merge Windows"**.
- **Show everything**: **"Display tabs from all windows"** (under Window Controls) returns to the unfiltered list.

### 3. Moving Tabs
1.  Check one or more tabs (or **Check All**).
2.  Click **Move ▾** and pick **New Window** or any existing window.
3.  TabMaster stays focused; use the **Undo/Redo arrows** in the toolbar to revert or replay moves.

### 4. Setup
1.  Get a free API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click the **Gear Icon** in the top-right corner.
3.  Paste your key.

---

## 👨‍💻 For Developers (Building from Source)

If you want to modify the code or build it yourself:

1.  **Install**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build**:
    ```bash
    npm run build
    ```
    This generates the `dist` folder used in the installation steps above.
