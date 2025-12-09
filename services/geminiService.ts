
import { GoogleGenAI, Type } from "@google/genai";
import { Tab, TabGroup } from "../types";
import { getStorageData } from "./storageService";

export const organizeTabsWithAI = async (tabs: Tab[]): Promise<TabGroup[]> => {
  // 1. Fetch Key from Storage (Primary for Extensions)
  const storage = await getStorageData();
  let apiKey = storage.apiKey;

  // 2. Fallback to Env (Dev/Demo)
  if (!apiKey || apiKey.trim() === '') {
    apiKey = process.env.API_KEY;
  }

  if (!apiKey || apiKey.trim() === '') {
    // Throwing error allows the UI to catch it and show the modal
    throw new Error("NO_API_KEY");
  }

  // Initialize client only when needed
  const ai = new GoogleGenAI({ apiKey });

  // Prepare simple input for the model (Minimize token usage)
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
