// Hook that manages access to the device camera and switching between front/back.
import { useState, useEffect } from "react";
import { CAMERA_CONFIG } from "../constants";

export function useCamera(videoRef) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  // Start/refresh camera stream when facingMode changes
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: CAMERA_CONFIG.VIDEO_WIDTH,
            height: CAMERA_CONFIG.VIDEO_HEIGHT,
            facingMode: facingMode,
          },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error(
          "Kamerazugriffsfehler:",
          error?.name,
          error?.message,
          error
        );
        // Best-effort diagnostics: permission state and available devices
        try {
          if (navigator.permissions?.query) {
            const status = await navigator.permissions.query({
              name: "camera",
            });
            console.log("Camera permission state:", status.state);
          } else {
            console.log(
              "Permissions API nicht verfügbar für 'camera' in diesem WebView"
            );
          }
        } catch (e) {
          console.log(
            "Konnte Kamera-Berechtigungsstatus nicht lesen:",
            e?.message
          );
        }
        try {
          const devices = await navigator.mediaDevices?.enumerateDevices?.();
          console.log("Media devices:", devices);
        } catch (e) {
          console.log("enumerateDevices fehlgeschlagen:", e?.message);
        }
      }
    };

    startCamera();

    // Cleanup: stop all tracks on unmount or mode switch
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  // Toggle between "user" (front) and "environment" (rear) camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return { stream, switchCamera, facingMode };
}
