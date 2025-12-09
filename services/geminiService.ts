
import { GoogleGenAI, Type } from "@google/genai";
import { Tab, TabGroup, WindowData } from "../types";
import { getStorageData } from "./storageService";

const getApiKey = async () => {
  const storage = await getStorageData();
  let apiKey = storage.apiKey;
  if (!apiKey || apiKey.trim() === '') {
    apiKey = process.env.API_KEY;
  }
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("NO_API_KEY");
  }
  return apiKey;
};

export const organizeTabsWithAI = async (tabs: Tab[]): Promise<TabGroup[]> => {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Prepare simple input for the model
  const tabsInput = tabs.map(t => ({
    id: t.id,
    title: t.title,
    url: t.url
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an intelligent tab manager. Group the following browser tabs into logical semantic categories (e.g., "Development", "Communication", "Entertainment", "Reference", "Shopping"). 
      
      Here are the tabs:
      ${JSON.stringify(tabsInput)}
      
      Return a JSON object containing an array of groups. Each group should have a 'categoryName' and a list of 'tabIds' belonging to that category. Ensure every tab ID from the input is assigned to exactly one category.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            groups: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  categoryName: {
                    type: Type.STRING,
                    description: "The name of the category group"
                  },
                  tabIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array of tab IDs belonging to this group"
                  }
                },
                required: ["categoryName", "tabIds"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{ "groups": [] }');
    return result.groups || [];
  } catch (error: any) {
    console.error("Error organizing tabs with Gemini:", error);
    if (error.message.includes('API_KEY')) {
       throw new Error("INVALID_API_KEY");
    }
    throw error;
  }
};

export const generateWindowNamesWithAI = async (windows: WindowData[]): Promise<Record<string, string>> => {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Simplify input: Window ID and list of tab titles
  const windowsInput = windows.map(w => ({
    id: w.id,
    tabs: w.tabs.map(t => t.title || t.url).slice(0, 15) // Limit to 15 tabs per window to save tokens
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a browser window organizer. I will provide a list of windows and their tab titles.
      For each window, generate a short, descriptive name (max 4 words) based on the content of its tabs.
      Examples: "Development Docs", "Social Media", "Shopping Research", "General Browsing".
      
      Input Data:
      ${JSON.stringify(windowsInput)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            renamedWindows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  windowId: { type: Type.STRING },
                  name: { type: Type.STRING }
                },
                required: ["windowId", "name"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{ "renamedWindows": [] }');
    
    // Convert array to map
    const nameMap: Record<string, string> = {};
    if (result.renamedWindows && Array.isArray(result.renamedWindows)) {
      result.renamedWindows.forEach((item: any) => {
        if (item.windowId && item.name) {
          nameMap[item.windowId] = item.name;
        }
      });
    }
    return nameMap;

  } catch (error: any) {
    console.error("Error renaming windows with Gemini:", error);
    if (error.message.includes('API_KEY')) {
       throw new Error("INVALID_API_KEY");
    }
    throw error;
  }
};
