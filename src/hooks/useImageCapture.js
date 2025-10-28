// Hook that manages image capture/import and triggers AI analysis via backend.
// Returns the captured image, analysis result and loading state, along with handlers.
import { useState } from "react";
import { IMAGE_FORMATS } from "../constants";
import { geminiService } from "../services/genaiService";

export function useImageCapture(videoRef, canvasRef) {
  // State management: captured image, analysis result, and loading state
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  // Send the Base64 image to the backend for AI analysis
  const analyzeImage = async (imageData) => {
    if (!geminiService.isConfigured()) {
      console.warn("⚠️");
      return;
    }

    setIsAnalyzing(true);
    try {
      const aiResult = await geminiService.analyzeImage(imageData);
      console.log("🎯 result:", aiResult);

      // If the backend already returns a parsed JSON object
      if (aiResult && typeof aiResult === "object" && !aiResult.raw) {
        setResult(aiResult);
        return;
      }

      // Otherwise, parse raw string defensively (may be fenced by code blocks)
      const raw = aiResult?.raw ?? "";
      const cleaned = (() => {
        let t = typeof raw === "string" ? raw.trim() : "";
        if (t.startsWith("```")) t = t.replace(/^```[a-zA-Z]*\n?/, "");
        if (t.endsWith("```")) t = t.replace(/\n?```$/, "");
        if (t.startsWith("json\n")) t = t.slice(5);
        return t.trim();
      })();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
    } catch (error) {
      console.error("❌ Error:", error);
      setResult("");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Capture current frame from <video> into hidden <canvas> and serialize to data URL
  const captureFromCamera = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL(IMAGE_FORMATS.PNG);
      setCapturedImage(imageData);

      await analyzeImage(imageData);
    }
  };

  // Import image via file input and analyze
  const importFromFile = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result;
        setCapturedImage(imageData);

        await analyzeImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear current capture and allow new attempts
  const resetCapture = () => {
    setCapturedImage(null);
  };

  return {
    capturedImage,
    captureFromCamera,
    importFromFile,
    resetCapture,
    isAnalyzing,
    result,
  };
}
