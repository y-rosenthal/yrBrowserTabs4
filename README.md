
# TabMaster AI

**TabMaster AI** is a smart dashboard to organize your browser chaos. It uses Google's **Gemini AI** to automatically group your messy tabs and name your windows, so you can focus on what matters.

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
    - Click the puzzle piece icon 🧩 in your Chrome toolbar to pin it and start organizing!

---

## 🚀 Features

### 🧠 AI Organization
- **Group Tabs**: Click **"Organize with AI"** to have Gemini analyze and group your tabs into categories (e.g., "Development", "Social", "News").
- **Apply to Windows**: Instantly move tabs into physical browser windows based on these AI categories.
- **Auto-Name Windows**: Let AI generate descriptive names for your windows based on their content.

### ⚡ Navigation & Management
- **Global Search**: Find any tab instantly by title or URL across all windows.
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
