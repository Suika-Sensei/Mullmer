// Router exposing the image analysis endpoint used by the frontend.
import express from "express";
import { geminiService } from "../services/genaiService.js";

const router = express.Router();

// Accepts a Base64 data URL in { imageData } and returns JSON analysis
router.post("/analyze-image", async (req, res) => {
  try {
    const { imageData } = req.body;

    // Basic validation
    if (!imageData) {
      return res.status(400).json({
        error: "Missing imageData",
        message: "Please provide imageData in the request body",
      });
    }

    // Ensure service is ready (env/config present)
    if (!geminiService.isConfigured()) {
      return res.status(500).json({
        error: "Service not configured",
        message: "Gemini service is not properly configured",
      });
    }

    // Delegate analysis to the service layer
    const result = await geminiService.analyzeImage(imageData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    res.status(500).json({
      error: "Analysis failed",
      message: error.message,
    });
  }
});

export { router as analyzeImageRoute };
