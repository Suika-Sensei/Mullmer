// server/services/genaiService.js
import { GoogleGenAI, Type } from "@google/genai";
import * as fs from "fs/promises";

/**
 * Toggle debug logging (set to false to reduce console output)
 */
const DEBUG = true;

/**
 * Converts a Base64 data URL (data:image/*;base64,...) to a generative part
 * structure expected by the Google GenAI SDK.
 */
function urlToGenerativePart(imageData) {
  if (typeof imageData !== "string") {
    throw new Error(
      "urlToGenerativePart: expected imageData to be a string (Base64 data URI)"
    );
  }

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
    "Unsupported image data format. Please provide a Base64 data URI (data:image/*;base64,...)"
  );
}

/**
 * Recursively walk an object looking for strings that parse as JSON.
 * Returns the first successfully parsed object (or null).
 */
function findFirstParsableJson(value, seen = new WeakSet()) {
  if (value && typeof value === "object") {
    if (seen.has(value)) return null;
    seen.add(value);
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]"))
    ) {
      try {
        return JSON.parse(s);
      } catch (e) {
        // ignore
      }
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (
      Array.isArray(value.names) &&
      Array.isArray(value.materials) &&
      Array.isArray(value.material_colors) &&
      typeof value.description === "string"
    ) {
      return value;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findFirstParsableJson(item, seen);
      if (result) return result;
    }
  } else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      try {
        const result = findFirstParsableJson(value[key], seen);
        if (result) return result;
      } catch (e) {
        /* ignore */
      }
    }
  }

  return null;
}

/**
 * Collects all strings found in a nested structure (strings inside arrays/objects),
 * preserving order as discovered. Helps when model splits JSON into pieces.
 */
function collectStrings(value, out = [], seen = new WeakSet()) {
  if (value && typeof value === "object") {
    if (seen.has(value)) return out;
    seen.add(value);
  }

  if (typeof value === "string") {
    out.push(value);
    return out;
  }

  // Common SDK shapes: { text }, { content: [...] }, { parts: [...] }, structuredOutput
  if (value && typeof value === "object") {
    // If value has explicit text-like keys, prefer them
    const textKeys = [
      "text",
      "message",
      "content",
      "parts",
      "output",
      "payload",
      "value",
      "structuredOutput",
    ];
    for (const k of textKeys) {
      if (k in value) {
        const v = value[k];
        if (typeof v === "string") {
          out.push(v);
        } else {
          collectStrings(v, out, seen);
        }
      }
    }

    // Generic fallback: traverse all keys
    for (const key of Object.keys(value)) {
      try {
        collectStrings(value[key], out, seen);
      } catch (e) {
        /* ignore */
      }
    }
    return out;
  }

  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out, seen);
    return out;
  }

  return out;
}

/**
 * Heuristic attempt to map a loosely-structured object to the expected schema
 * (names, materials, material_colors, description). This is a best-effort fallback.
 */
function mapToSchemaIfPossible(obj) {
  if (!obj || typeof obj !== "object") return null;

  // If it already matches, return directly
  if (
    Array.isArray(obj.names) &&
    Array.isArray(obj.materials) &&
    Array.isArray(obj.material_colors) &&
    typeof obj.description === "string"
  ) {
    return obj;
  }

  // Try to find plausible fields by name
  const result = {
    names: null,
    materials: null,
    material_colors: null,
    description: null,
  };

  for (const key of Object.keys(obj)) {
    const lower = key.toLowerCase();
    if (
      !result.names &&
      (lower.includes("name") ||
        lower.includes("names") ||
        lower.includes("object"))
    ) {
      if (Array.isArray(obj[key])) result.names = obj[key].map(String);
      else if (typeof obj[key] === "string") result.names = [obj[key]];
    }
    if (
      !result.materials &&
      (lower.includes("material") || lower.includes("materials"))
    ) {
      if (Array.isArray(obj[key])) result.materials = obj[key].map(String);
      else if (typeof obj[key] === "string") result.materials = [obj[key]];
    }
    if (
      !result.material_colors &&
      (lower.includes("color") || lower.includes("hex"))
    ) {
      if (Array.isArray(obj[key]))
        result.material_colors = obj[key].map(String);
      else if (typeof obj[key] === "string")
        result.material_colors = [obj[key]];
    }
    if (
      !result.description &&
      (lower.includes("description") ||
        lower.includes("where") ||
        lower.includes("entsorgt"))
    ) {
      if (typeof obj[key] === "string") result.description = obj[key];
    }
  }

  // If we found at least description and one array, accept
  if (
    result.description &&
    (Array.isArray(result.names) || Array.isArray(result.materials))
  ) {
    // fill missing arrays with empty arrays
    result.names = Array.isArray(result.names) ? result.names : [];
    result.materials = Array.isArray(result.materials) ? result.materials : [];
    result.material_colors = Array.isArray(result.material_colors)
      ? result.material_colors
      : [];
    return result;
  }

  return null;
}

/**
 * Service responsible for communicating with the Gemini multimodal model
 * to analyze an input image and return parsed JSON conforming to a schema.
 */
class GeminiService {
  constructor() {
    this.client = null;
    this.model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // IMPORTANT: Do not change this prompt per user request.
    this.systemInstruction = `Du bist Experte für Mülltrennung in Deutschland. Analysiere das Foto und gib JSON zurück: 
    {
      "names": ["maximal 2 Objekte"],
      "materials": ["Materialien der Objekte"],
      "material_colors": ["HEX-Farben der Materialien nach Mülltrennung: 
        Gelber Sack: #F9C846, Blauer Mülleimer (Papier): #05B2DC, 
        Brauner Mülleimer (Bio): #643924, Restmüll: #2E3138, 
        Glascontainer: #869D7A, Pfand: #73915D, Sperrmüll: #85583D, 
        Sondermüll: #B22222, Bauschutt: #A9A9A9, Textilien: #FF69B4"
      ],
      "description": "Kurzbeschreibung, wo dieser Gegenstand entsorgt oder abgegeben werden soll (inkl. Pfand-Rückgabe, Sperrmüll, Sondermüll usw.), unter Berücksichtigung der Details; muss ein <span style=\\"background-color:#HEX;\\">Container</span> sein; maximal 20 Wörter. Gib nur JSON zurück, ohne zusätzliche Erklärungen."
    }`;

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
            "Kurze Beschreibung, wo dieser Gegenstand entsorgt oder abgegeben werden soll, inklusive Pfand, Sperrmüll, Sondermüll, Bio usw. Verwende <span/> mit background-color.",
        },
      },
      required: ["names", "materials", "material_colors", "description"],
    };
  }

  // Lazily initialize the GoogleGenAI client with API key from environment.
  _initializeClient() {
    if (!this.client) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set in environment");
      }
      this.client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
  }

  /**
   * Analyze a Base64 image data URL with Gemini and return parsed JSON
   * conforming to the schema above.
   */
  async analyzeImage(imageData) {
    this._initializeClient();

    try {
      // Validate and convert image
      const imagePart = urlToGenerativePart(imageData);
      const contents = [{ role: "user", parts: [imagePart] }];

      // Increase tokens to avoid truncation; adjust depending on account limits
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: contents,
        config: {
          systemInstruction: this.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: this.responseSchema,
          temperature: 0.1,
          maxOutputTokens: 3000,
        },
      });

      if (DEBUG) console.debug("Gemini response (raw):", response);

      if (
        Array.isArray(response.candidates) &&
        response.candidates.length > 0
      ) {
        if (DEBUG) console.debug("Inspecting candidates...");
        for (const candidate of response.candidates) {
          const maybeParsed = findFirstParsableJson(
            candidate.content || candidate
          );
          if (maybeParsed) {
            if (DEBUG)
              console.debug(
                "Found parsed JSON inside candidate via findFirstParsableJson"
              );
            return maybeParsed;
          }

          const strings = collectStrings(candidate.content || candidate);
          if (strings.length > 0) {
            const joined = strings
              .map((s) => (typeof s === "string" ? s.trim() : ""))
              .join("");
            if (joined) {
              if (DEBUG)
                console.debug(
                  "Joined candidate strings length:",
                  joined.length
                );
              const start = joined.indexOf("{");
              const end = joined.lastIndexOf("}");
              if (start !== -1 && end !== -1 && end > start) {
                const possible = joined.slice(start, end + 1);
                try {
                  return JSON.parse(possible);
                } catch (e) {
                  if (DEBUG)
                    console.debug(
                      "Failed to parse possible JSON slice from joined candidate:",
                      e
                    );
                }
              }
              // Last resort: try parsing the whole joined string
              try {
                return JSON.parse(joined);
              } catch (e) {
                if (DEBUG)
                  console.debug("Failed to parse joined candidate as JSON:", e);
              }
            }
          }

          const mapped = mapToSchemaIfPossible(candidate.content || candidate);
          if (mapped) {
            if (DEBUG)
              console.debug(
                "Mapped candidate.content to schema via heuristics"
              );
            return mapped;
          }
        }
      }

      if (DEBUG)
        console.debug("Deep searching entire response for parsable JSON...");
      const deepFound = findFirstParsableJson(response);
      if (deepFound) {
        if (DEBUG) console.debug("Found parsable JSON in deep search");
        return deepFound;
      }

      if (DEBUG)
        console.error(
          "Gemini returned no parsable JSON/text. Raw response:",
          response
        );

      const candidateFinish =
        (response.candidates &&
          response.candidates[0] &&
          response.candidates[0].finishReason) ||
        null;
      if (candidateFinish === "MAX_TOKENS") {
        throw new Error(
          "Gemini returned no parsable JSON/text and output was truncated (finishReason: MAX_TOKENS). " +
            "Try increasing maxOutputTokens or simplify the prompt/responseSchema for a shorter output."
        );
      }

      if (candidateFinish === "STOP") {
        throw new Error(
          "Gemini finished (finishReason: STOP) but no parsable JSON was found in the response. " +
            "Enable DEBUG and inspect response.candidates to craft a custom extraction. " +
            "You may paste the expanded response here for me to write a custom parser."
        );
      }

      throw new Error("Gemini returned no parsable JSON/text.");
    } catch (error) {
      console.error("Gemini API request failed:", error);
      throw error;
    }
  }

  isConfigured() {
    return !!(
      process.env.GEMINI_API_KEY &&
      this.model &&
      this.systemInstruction
    );
  }
}

export const geminiService = new GeminiService();
