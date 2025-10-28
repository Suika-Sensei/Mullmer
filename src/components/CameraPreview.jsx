// Displays the live camera preview or a captured image.
// Syncs the provided MediaStream to the <video>, and shows overlay actions.
import React, { useEffect } from "react";
import {
  CameraRotate,
  ArrowClockwise,
  CircleNotch,
} from "@phosphor-icons/react";

export default function CameraPreview({
  imageSrc,
  videoRef,
  canvasRef,
  isLoading,
  onRetake,
  stream,
  isAnalyzing,
  onSwitchCamera,
}) {
  useEffect(() => {
    // Ensure the <video> element is bound to the latest MediaStream
    if (videoRef?.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      const play = async () => {
        try {
          await videoRef.current.play?.();
        } catch (_) {}
      };
      play();
    }
  }, [stream, videoRef, imageSrc]);

  return (
    <div className="camera-container relative">
      {!imageSrc ? (
        <div className="video-wrapper relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="video-preview"
          />
          {onSwitchCamera && (
            <button
              onClick={onSwitchCamera}
              className="absolute top-4 right-4  text-white rounded-full p-3 z-10"
              type="button"
              aria-label="Kamera wechseln"
            >
              <CameraRotate
                size={32}
                weight="fill"
                color="var(--md-sys-color-primary)"
              />
            </button>
          )}
        </div>
      ) : (
        <img src={imageSrc} alt="Captured" className="captured-image" />
      )}
      {/* When an image is captured, show overlay to either indicate analysis
          or allow retake */}
      {imageSrc && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          {isAnalyzing ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <CircleNotch size={48} weight="bold" className="animate-spin" />
            </div>
          ) : (
            <button
              onClick={onRetake}
              className=""
              type="button"
              aria-label="Erneut aufnehmen"
            >
              <ArrowClockwise size={48} weight="regular" />
            </button>
          )}
        </div>
      )}
      {/* Hidden canvas used by capture logic to serialize a video frame */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
