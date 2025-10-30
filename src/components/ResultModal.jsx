// Modal that displays the AI analysis result.
// Adapts width for mobile vs larger screens and renders a color band from
// the predicted material_colors. Description is HTML and inserted safely
// via React's `dangerouslySetInnerHTML` (content is expected to be generated).
import React from "react";
import { X } from "@phosphor-icons/react";
import "./ResultModal.css";
import { DEVICE_TYPES, useDeviceType } from "../hooks";

export default function ResultModal({ result, onClose }) {
  if (!result) return null;
  const { deviceType } = useDeviceType();

  const {
    names = [],
    materials = [],
    material_colors = [],
    description = "",
  } = result;

  // Create gradient background from material_colors; fallback to a neutral tone
  const gradientStyle =
    material_colors.length > 0
      ? {
          background:
            material_colors.length === 1
              ? material_colors[0]
              : `linear-gradient(135deg, ${material_colors.join(", ")})`,
        }
      : { background: "#869D7A" };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-container rounded-3xl ${
          deviceType == DEVICE_TYPES.MOBILE ? "w-3/4" : "w-1/4"
        }`}
        style={{
          maxWidth: deviceType == DEVICE_TYPES.MOBILE ? "90%" : "50%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with title and close button */}
        <div className="modal-header">
          <h2 className={`modal-title`}>{names.join(", ")}</h2>
          <button
            onClick={onClose}
            aria-label="close"
            title="close"
            style={{ right: "-5px", position: "relative" }}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={24} weight="regular" />
          </button>
        </div>

        <div className="modal-materials" style={gradientStyle}>
          <span className="material-chip">{materials.join(", ")}</span>
        </div>

        {/* HTML description rendered from the model's response */}
        <div className="modal-description">
          <p dangerouslySetInnerHTML={{ __html: description }} />
        </div>
      </div>
    </div>
  );
}
