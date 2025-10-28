// Renders primary actions for capturing an image from the camera
// or importing an image from the file system.
import React from "react";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import { Camera, Upload } from "@phosphor-icons/react";

export default function ActionButtons({
  // Trigger camera capture flow
  onCapture,
  // Open file-picker to import existing image
  onImportClick,
  // Hidden input used for image import
  fileInputRef,
  // Handles selected file change
  onFileChange,
  // Disable capture button when an image is present or analysis is running
  disabledCapture = false,
}) {
  return (
    <div className="button-group">
      <md-filled-button onClick={onCapture} disabled={disabledCapture}>
        <Camera slot="icon" weight="fill" />
        Fotografieren
      </md-filled-button>
      <md-outlined-button onClick={onImportClick}>
        <Upload slot="icon" weight="fill" />
        Bilder importieren
      </md-outlined-button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />
    </div>
  );
}
