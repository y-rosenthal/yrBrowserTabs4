# Interaction 3: UI Refinements

## User Question
Looks like it's working. However, the popup is too small. Can you make it much larger - most of the screen is best. Can you make it resizable? Also the DOMAIN column is the 3rd column. Could you place it instead right after the TAB NAME column? You don't need the globe icon in the DOMAIN column - I don't think it really adds anything. Similarly you can remove the window icon from the window column. Change the name of the window column to "Window #" and remove the word "window" from every line of the window column. Similarly for the window selector menu at the left - remove the icon and the word window.

## AI Response
To address your requests, I will update the application with the following changes:

1.  **Maximize Popup Size**: I will set the dimensions to the maximum allowed for Chrome Extensions (800x600).
2.  **Resizable / Full Screen**: Since extension popups cannot be resized, I will add an **"Expand" button** in the header. Clicking this will open the app in a full-sized browser tab, which gives you a "most of the screen" view and is fully resizable.
3.  **Reorder Columns**: Moved the "Domain" column to be immediately after "Tab Name".
4.  **UI Cleanup**:
    *   **Domain Column**: Removed the globe icon.
    *   **Window Column**: Renamed to "Window #", removed the monitor icon, and stripped the word "Window" from the values (e.g., "Window 123" becomes "123").
    *   **Sidebar**: Removed the monitor icon and the word "Window" from the list.

**Changes Made:**
*   `index.css`: Added media queries to force 800x600 size in popup mode, while allowing 100vw/100vh in full-tab mode.
*   `components/TabListView.tsx`: Reordered table headers, removed icons, and implemented string formatting to strip "Window " from the ID.
*   `components/Sidebar.tsx`: Updated list items to remove icons and simplify text.
*   `App.tsx`: Added an "Open in New Tab" (Maximize) button to the header and added a `chrome` declaration to fix TypeScript errors.