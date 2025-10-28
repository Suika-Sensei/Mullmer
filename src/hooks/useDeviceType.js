// Hook that derives the device type (mobile/tablet/desktop) from window size
// and exposes helpers and current screen dimensions.
import { useState, useEffect } from "react";

const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
};

export const DEVICE_TYPES = {
  MOBILE: "mobile",
  TABLET: "tablet",
  DESKTOP: "desktop",
};

const getDeviceType = (width) => {
  if (width < BREAKPOINTS.MOBILE) {
    return DEVICE_TYPES.MOBILE;
  }
  if (width < BREAKPOINTS.TABLET) {
    return DEVICE_TYPES.TABLET;
  }
  return DEVICE_TYPES.DESKTOP;
};

export function useDeviceType() {
  const [deviceType, setDeviceType] = useState(() =>
    getDeviceType(window.innerWidth)
  );
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenSize({ width, height });
      setDeviceType(getDeviceType(width));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return {
    deviceType,
    screenSize,
    isMobile: deviceType === DEVICE_TYPES.MOBILE,
    isTablet: deviceType === DEVICE_TYPES.TABLET,
    isDesktop: deviceType === DEVICE_TYPES.DESKTOP,
  };
}

