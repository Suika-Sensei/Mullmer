class GeminiService {
  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
  }

  async analyzeImage(imageData) {
    try {
      const response = await fetch(`${this.apiUrl}/analyze-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to analyze image");
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Error analyzing image:", error);
      throw error;
    }
  }

  isConfigured() {
    return !!this.apiUrl;
  }
}

export const geminiService = new GeminiService();
