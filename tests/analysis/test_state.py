"""Unit tests for motion state classification and recommendation generation."""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../analysis/src")))

from steadyhand_signal.models import MotionFeatures, CalibrationResult
from steadyhand_signal.state import classify_motion, generate_recommendation


class TestState(unittest.TestCase):
    def test_quiet_motion_classification(self):
        """Low band RMS is classified as 'quiet' with null recommendation."""
        features = MotionFeatures(
            status="unknown",
            dominant_hz=None,
            band_rms_g=0.005,  # below 0.015g threshold
            band_power_ratio=0.1,
            peak_concentration=0.1,
        )
        status = classify_motion(features)
        self.assertEqual(status, "quiet")

        rec = generate_recommendation(features, status)
        self.assertIsNone(rec)

    def test_periodic_motion_steady_preset_recommendation(self):
        """5.0 Hz tremor motion is classified as periodic_motion and recommends steady preset."""
        features = MotionFeatures(
            status="unknown",
            dominant_hz=5.2,
            band_rms_g=0.035,
            band_power_ratio=0.68,
            peak_concentration=0.60,
        )
        status = classify_motion(features)
        self.assertEqual(status, "periodic_motion")

        rec = generate_recommendation(features, status, rec_id="rec-test-1")
        self.assertIsNotNone(rec)
        self.assertEqual(rec.preset, "steady")
        self.assertTrue(rec.requires_user_acceptance)
        self.assertEqual(rec.reason_code, "persistent_motion_during_task")

    def test_periodic_motion_light_preset_recommendation(self):
        """8.5 Hz oscillation recommends light preset."""
        features = MotionFeatures(
            status="unknown",
            dominant_hz=8.5,
            band_rms_g=0.028,
            band_power_ratio=0.55,
            peak_concentration=0.50,
        )
        status = classify_motion(features)
        self.assertEqual(status, "periodic_motion")

        rec = generate_recommendation(features, status, rec_id="rec-test-2")
        self.assertIsNotNone(rec)
        self.assertEqual(rec.preset, "light")
        self.assertTrue(rec.requires_user_acceptance)
        self.assertEqual(rec.reason_code, "fine_oscillation_detected")

    def test_broadband_diffuse_motion(self):
        """High energy without spectral concentration is classified as broadband_motion without recommendation."""
        features = MotionFeatures(
            status="unknown",
            dominant_hz=4.0,
            band_rms_g=0.06,  # high energy
            band_power_ratio=0.25,  # diffuse power across spectrum
            peak_concentration=0.20,
        )
        status = classify_motion(features)
        self.assertEqual(status, "broadband_motion")

        rec = generate_recommendation(features, status)
        self.assertIsNone(rec)


if __name__ == "__main__":
    unittest.main()
