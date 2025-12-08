# Interaction 2: Bug Fixes (CSP & API Key)

## User Question
(User provided a screenshot showing two errors in the Chrome Extension console)
1. `Executing inline script violates the following Content Security Policy directive...` referring to the importmap.
2. `Uncaught Error: An API Key must be set when running in a browser` in `geminiService.ts`.

## AI Response
The screenshot shows two critical errors preventing your extension from running:

1.  **CSP Violation (`index.html`)**: The `<script type="importmap">` block is blocked by Chrome's security policy for extensions. This causes the white/black screen.
2.  **Uncaught Error (`geminiService.ts`)**: The app crashes immediately because it tries to initialize the AI client (`new GoogleGenAI`) at startup before checking if an API Key exists.

**Changes Made:**
1.  **index.html**: Removed the `importmap` script block to comply with Manifest V3 Content Security Policy.
2.  **services/geminiService.ts**: Moved the `GoogleGenAI` initialization *inside* the function call. This prevents the app from crashing on boot if the API key hasn't been set yet, ensuring the UI still loads.