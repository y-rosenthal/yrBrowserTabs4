import { WindowData, Tab } from './types';

// Helper to generate mock tabs
const createTab = (id: string, title: string, url: string, windowId: string): Tab => ({
  id,
  title,
  url,
  windowId,
  active: false,
  lastAccessed: Date.now() - Math.floor(Math.random() * 10000000),
  favIconUrl: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
});

export const MOCK_WINDOWS: WindowData[] = [
  {
    id: 'win_1',
    name: 'Main Browser Window',
    tabs: [
      createTab('t_1', 'Google Gemini API Docs', 'https://ai.google.dev/gemini-api/docs', 'win_1'),
      createTab('t_2', 'React - A JavaScript library for building user interfaces', 'https://react.dev', 'win_1'),
      createTab('t_3', 'Tailwind CSS - Rapidly build modern websites', 'https://tailwindcss.com', 'win_1'),
      createTab('t_4', 'GitHub - Pull Requests', 'https://github.com/pulls', 'win_1'),
      createTab('t_5', 'Inbox (3) - gmail@example.com', 'https://mail.google.com', 'win_1'),
      createTab('t_6', 'Spotify - Web Player', 'https://open.spotify.com', 'win_1'),
    ]
  },
  {
    id: 'win_2',
    name: 'Development Reference',
    tabs: [
      createTab('t_7', 'Stack Overflow - How to center a div', 'https://stackoverflow.com/questions/12345/center-div', 'win_2'),
      createTab('t_8', 'MDN Web Docs - Array.prototype.map()', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map', 'win_2'),
      createTab('t_9', 'TypeScript: Documentation', 'https://www.typescriptlang.org/docs/', 'win_2'),
      createTab('t_10', 'D3.js - Data-Driven Documents', 'https://d3js.org/', 'win_2'),
    ]
  },
  {
    id: 'win_3',
    name: 'Entertainment & Social',
    tabs: [
      createTab('t_11', 'YouTube - Lofi Hip Hop Radio', 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 'win_3'),
      createTab('t_12', 'Twitter / X', 'https://twitter.com/home', 'win_3'),
      createTab('t_13', 'Reddit - r/webdev', 'https://www.reddit.com/r/webdev/', 'win_3'),
      createTab('t_14', 'Twitch - Live Stream', 'https://www.twitch.tv/', 'win_3'),
      createTab('t_15', 'Netflix', 'https://www.netflix.com/browse', 'win_3'),
    ]
  },
  {
    id: 'win_4',
    name: 'Research Project',
    tabs: [
      createTab('t_16', 'Wikipedia - Artificial Intelligence', 'https://en.wikipedia.org/wiki/Artificial_intelligence', 'win_4'),
      createTab('t_17', 'arXiv.org - Machine Learning', 'https://arxiv.org/list/cs.LG/recent', 'win_4'),
      createTab('t_18', 'Hugging Face - Models', 'https://huggingface.co/models', 'win_4'),
    ]
  }
];

export const DEMO_NOTICE = "Note: This is a frontend prototype. Standard web applications cannot access your actual system tabs due to browser security sandboxing. This app demonstrates the UI/UX and Gemini AI integration using mock data.";
