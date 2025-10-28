import { GoogleGenAI, Type } from "@google/genai";
import * as fs from "fs/promises";

// Converts a Base64 data URL (data:image/*;base64,...) to a generative part
// structure expected by the Google GenAI SDK.
function urlToGenerativePart(imageData) {
  if (imageData.startsWith("data:")) {
    const [metadata, base64Data] = imageData.split(",");
    const mimeType = metadata.match(/data:(.*?);/)?.[1];
    if (!mimeType) throw new Error("Could not parse MIME type from data URI");

    return {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    };
  }

  throw new Error(
    "Unsupported image data format. Please provide a Base64 data URI."
  );
}

// Service responsible for communicating with the Gemini multimodal model
// to analyze an input image and return a strictly-typed JSON response.
class GeminiService {
  constructor() {
    this.client = null;
    this.model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // IMPORTANT: Do not change this prompt per user request.
    this.systemInstruction =
      'Du bist Experte für Mülltrennung in Deutschland. Analysiere das Foto und gib JSON zurück: {"names": ["maximal 2 Objekte"], "materials": ["Materialien der Objekte"], "material_colors": ["HEX-Farben der Materialien nach der Mülltrennung: gelber Mülleimer: #F9C846, blauer Mülleimer: #05B2DC, brauner Mülleimer: #4C4C47, Restmüll: #2E3138, Glascontainer: #869D7A"], "description": "Kurzbeschreibung, wo dieser Gegenstand entsorgt werden soll, unter Berücksichtigung der Details, muss ein <span style=\\"background-color:#HEX;\\">Container</span> mit Hintergrundfarbe sein, maximal 20 Wörter"}, gib nur JSON zurück, ohne zusätzliche Erklärungen.';

    this.responseSchema = {
      type: Type.OBJECT,
      properties: {
        names: {
          type: Type.ARRAY,
          description: "Namen der Gegenstände (maximal 2).",
          items: { type: Type.STRING },
          maxItems: 2,
        },
        materials: {
          type: Type.ARRAY,
          description:
            "Materialien der entsprechenden Gegenstände (in der gleichen Reihenfolge, maximal 2).",
          items: { type: Type.STRING },
        },
        material_colors: {
          type: Type.ARRAY,
          description:
            "Nur HEX-Farben für jedes Material, in der gleichen Reihenfolge wie materials.",
          items: {
            type: Type.STRING,
            format: "hex-color",
          },
        },
        description: {
          type: Type.STRING,
          description:
            "Kurze Beschreibung, wo dieser Gegenstand entsorgt werden soll, unter Berücksichtigung der Details. Verwende unbedingt <span/> und darin background-color für den Container-Aspekt.",
        },
      },
      required: ["names", "materials", "material_colors", "description"],
    };
  }

  // Lazily initialize the GoogleGenAI client with API key from environment.
  _initializeClient() {
    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
  }

  // Analyze a Base64 image data URL with Gemini and return parsed JSON
  // conforming to the schema above.
  async analyzeImage(imageData) {
    this._initializeClient();

    try {
      const imagePart = urlToGenerativePart(imageData);

      const contents = [{ role: "user", parts: [imagePart] }];

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: contents,
        config: {
          systemInstruction: this.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: this.responseSchema,
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      });

      const jsonString = response.text.trim();
      const parsedResult = JSON.parse(jsonString);

      return parsedResult;
    } catch (error) {
      console.error("Gemini API request failed:", error);
      throw error;
    }
  }

  // Simple readiness check to ensure mandatory configuration is present.
  isConfigured() {
    return !!(
      process.env.GEMINI_API_KEY &&
      this.model &&
      this.systemInstruction
    );
  }
}

export const geminiService = new GeminiService();

