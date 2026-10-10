"""Unit tests for haptic artifact blanking and settling interval exclusion."""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../analysis/src")))

from steadyhand_signal.models import SensorSample, SensorCapability
from steadyhand_signal.blanking import is_haptic_blanking_active
from steadyhand_signal import analyze_window


class TestBlanking(unittest.TestCase):
    def test_direct_haptic_pulse_blanking(self):
        """Active haptic sample forces immediate blanking."""
        samples = [
            SensorSample(
                seq=i,
                t_us=1000000 + i * 10000,
                a_g=(0.0, 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=(i == 5),  # active pulse on sample 5
            )
            for i in range(50)
        ]
        is_blanked, reasons = is_haptic_blanking_active(samples)
        self.assertTrue(is_blanked)
        self.assertIn("actuator_pulse_overlap", reasons)

    def test_post_pulse_settling_cooldown(self):
        """Window starting 200 ms after motor stop is blanked during 500 ms settling period."""
        last_pulse_end_us = 1_000_000
        # Window starts at 1_200_000 us (200 ms after pulse)
        samples = [
            SensorSample(
                seq=i,
                t_us=1_200_000 + i * 10000,
                a_g=(0.0, 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
            for i in range(50)
        ]
        is_blanked, reasons = is_haptic_blanking_active(
            samples, last_haptic_pulse_end_us=last_pulse_end_us, settling_cooldown_us=500_000
        )
        self.assertTrue(is_blanked)
        self.assertIn("post_haptic_settling_window", reasons)

    def test_clean_window_after_settling(self):
        """Window starting 600 ms after motor stop passes blanking."""
        last_pulse_end_us = 1_000_000
        # Window starts at 1_600_000 us (600 ms after pulse)
        samples = [
            SensorSample(
                seq=i,
                t_us=1_600_000 + i * 10000,
                a_g=(0.0, 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
            for i in range(50)
        ]
        is_blanked, reasons = is_haptic_blanking_active(
            samples, last_haptic_pulse_end_us=last_pulse_end_us, settling_cooldown_us=500_000
        )
        self.assertFalse(is_blanked)
        self.assertEqual(reasons, [])

    def test_analyze_window_returns_null_motion_under_blanking(self):
        """analyze_window returns haptic_blanking state and null numerical fields."""
        samples = [
            SensorSample(
                seq=i,
                t_us=1000000 + i * 10000,
                a_g=(0.0, 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=True,
            )
            for i in range(50)
        ]
        cap = SensorCapability(
            model="LIS3DHTR",
            bus="I2C",
            address_hex="0x19",
            odr_hz=100.0,
            range_g=2.0,
        )
        result = analyze_window(samples, capability=cap)
        self.assertEqual(result.quality.state, "haptic_blanking")
        self.assertEqual(result.motion.status, "unknown")
        self.assertIsNone(result.motion.dominant_hz)
        self.assertIsNone(result.motion.band_rms_g)
        self.assertIsNone(result.recommendation)


if __name__ == "__main__":
    unittest.main()
