
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
- **Domains Tab**: The sidebar has **Windows** and **Domains** tabs. Opening **Domains** instantly groups the currently displayed tabs into a section per website (domain name) — no AI needed — and lists every website; click one to jump to its section. Tick **Combine subdomains** to merge e.g. `account.example.com` and `www.example.com` into one `example.com` section.
- **Categorize with AI**: Let Gemini group the currently displayed tabs into semantic categories (e.g., "Development", "Social", "News").
- **Apply to Windows**: Physically reorganize your browser windows to match either grouping — each window is named after its website or category. Undoable.
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
1.  **Sidebar**: Switch the sidebar to the **"Domains"** tab (instant, by website) or click **"Categorize with AI"** on the **"Windows"** tab (Gemini). Both act on the tabs currently displayed — filter first to categorize a subset. On the Domains tab, **"Include all tabs"** widens a subset to every open tab, and switching back to **"Windows"** shows all tabs again.
2.  **View Results**: Tabs are grouped into sections. On the Domains tab, the sidebar lists every website section — click one (or use the arrow keys and Enter) to jump straight to it; the website currently at the top of the list is highlighted as you scroll.
3.  **Refine**:
    - Use the **"Sort All"** dropdown to sort all groups by Name, Domain, etc.
    - Click individual column headers to sort specific groups.
    - Tick **"Combine subdomains"** (on the Domains tab) to merge all subdomains of a site (e.g. `account.bambibaby.com` and `www.bambibaby.com`) into a single `bambibaby.com` section. The choice is remembered.
    - Click **"Close all N"** next to a section heading (or right-click the heading) to close every tab listed under that website or category. Only the tabs shown are closed — if a search is active, tabs it hides stay open.
4.  **Apply**: Click **"Apply to Windows"** (on the Domains tab, or in the toolbar for AI groups) to reorganize your actual browser windows — one window per section, named after it (e.g. `bambibaby.com`). Window names change only at this step — until then your windows still hold a mix of sites. An existing window is reused only if all of its tabs are being reorganized, so a window never keeps unrelated tabs under a new name. Use **"Undo"** next to it (or **"Undo Reorg"** in the AI view) if needed.

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
