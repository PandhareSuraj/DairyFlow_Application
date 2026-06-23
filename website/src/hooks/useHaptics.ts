import { useCallback } from "react";

type HapticIntensity = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const vibrationPatterns: Record<HapticIntensity, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [25, 25, 25],
  error: [50, 50, 50],
};

export function useHaptics() {
  const vibrate = useCallback((intensity: HapticIntensity = "light") => {
    // Check if vibration API is supported
    if (!("vibrate" in navigator)) {
      return false;
    }

    try {
      const pattern = vibrationPatterns[intensity];
      navigator.vibrate(pattern);
      return true;
    } catch {
      // Vibration failed (maybe permissions or device doesn't support it)
      return false;
    }
  }, []);

  const lightTap = useCallback(() => vibrate("light"), [vibrate]);
  const mediumTap = useCallback(() => vibrate("medium"), [vibrate]);
  const heavyTap = useCallback(() => vibrate("heavy"), [vibrate]);
  const successFeedback = useCallback(() => vibrate("success"), [vibrate]);
  const warningFeedback = useCallback(() => vibrate("warning"), [vibrate]);
  const errorFeedback = useCallback(() => vibrate("error"), [vibrate]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    successFeedback,
    warningFeedback,
    errorFeedback,
  };
}
