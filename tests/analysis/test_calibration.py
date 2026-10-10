"""Unit tests for stationary calibration and gravity estimation."""

import unittest
import math
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../analysis/src")))

from steadyhand_signal.models import SensorSample, SensorCapability
from steadyhand_signal.calibration import calibrate_stationary


class TestCalibration(unittest.TestCase):
    def setUp(self):
        self.cap = SensorCapability(
            model="LIS3DHTR",
            bus="I2C",
            address_hex="0x19",
            odr_hz=100.0,
            range_g=2.0,
        )

    def test_clean_stationary_calibration_complete(self):
        """Quiet 1.0s resting stream completes calibration successfully."""
        samples = [
            SensorSample(
                seq=i,
                t_us=i * 10000,
                a_g=(0.002 * (i % 3), -0.001 * (i % 2), 0.998),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
            for i in range(100)
        ]
        result = calibrate_stationary(samples, self.cap)
        self.assertEqual(result.state, "complete")
        self.assertEqual(result.reasons, [])
        self.assertAlmostEqual(result.bias_g[2], 0.998, places=3)
        self.assertLess(result.noise_std_g, 0.01)

    def test_dynamic_motion_rejection(self):
        """Large dynamic movement during calibration causes rejection."""
        # Significant oscillation of 0.2g
        samples = [
            SensorSample(
                seq=i,
                t_us=i * 10000,
                a_g=(0.2 * math.sin(i * 0.2), 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
            for i in range(100)
        ]
        result = calibrate_stationary(samples, self.cap)
        self.assertEqual(result.state, "rejected")
        self.assertIn("excessive_motion_during_stationary_phase", result.reasons)

    def test_invalid_gravity_magnitude_rejection(self):
        """Sensor reporting 0.4g static gravity is rejected."""
        samples = [
            SensorSample(
                seq=i,
                t_us=i * 10000,
                a_g=(0.0, 0.0, 0.40),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
            for i in range(100)
        ]
        result = calibrate_stationary(samples, self.cap)
        self.assertEqual(result.state, "rejected")
        self.assertIn("invalid_gravity_magnitude", result.reasons)


if __name__ == "__main__":
    unittest.main()
