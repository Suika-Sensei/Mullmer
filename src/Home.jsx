// Main screen that wires together camera, actions and result modal.
// Uses custom hooks for theme, camera stream and image capture + AI analysis.
import React, { useRef, useState, useEffect } from "react";

import {
  AppHeader,
  CameraPreview,
  ActionButtons,
  Description,
  ResultModal,
} from "./components";

import { useTheme, useCamera, useImageCapture } from "./hooks";

export default function Home() {
  // Refs to DOM elements used by camera and importing flow
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const { isDark, toggleTheme } = useTheme();
  const { stream, switchCamera } = useCamera(videoRef);
  const {
    capturedImage,
    captureFromCamera,
    importFromFile,
    resetCapture,
    isAnalyzing,
    result,
  } = useImageCapture(videoRef, canvasRef);

  // Controls the visibility of the result modal
  const [showModal, setShowModal] = useState(false);

  // When AI result arrives and contains names, open the modal
  useEffect(() => {
    if (result && typeof result === "object" && result.names) {
      setShowModal(true);
    }
  }, [result]);

  // Close the results modal
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Open hidden file input programmatically for importing an image
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  return (
    <div className="app-container">
      <AppHeader isDark={isDark} onToggleTheme={toggleTheme} />

      <main className="main-content">
        <CameraPreview
          videoRef={videoRef}
          imageSrc={capturedImage}
          canvasRef={canvasRef}
          onRetake={resetCapture}
          stream={stream}
          isAnalyzing={isAnalyzing}
          onSwitchCamera={switchCamera}
        />

        <ActionButtons
          onCapture={captureFromCamera}
          onImportClick={handleImportClick}
          fileInputRef={fileInputRef}
          onFileChange={importFromFile}
          disabledCapture={Boolean(capturedImage) || isAnalyzing}
        />

        <Description />
      </main>

      {showModal && result && (
        <ResultModal result={result} onClose={handleCloseModal} />
      )}
    </div>
  );
}
