"""Unit tests for window validation and quality gates."""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../analysis/src")))

from steadyhand_signal.models import SensorSample
from steadyhand_signal.validation import validate_window


class TestValidation(unittest.TestCase):
    def test_valid_quiet_stream(self):
        """Clean 100 Hz stream of 100 samples produces 'good' quality."""
        samples = [
            SensorSample(
                seq=i,
                t_us=i * 10000,
                a_g=(0.0, 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
            for i in range(100)
        ]
        quality = validate_window(samples, expected_odr_hz=100.0)
        self.assertEqual(quality.state, "good")
        self.assertEqual(quality.reasons, [])
        self.assertEqual(quality.missing_fraction, 0.0)
        self.assertEqual(quality.measured_hz, 100.0)

    def test_insufficient_samples(self):
        """Fewer than 32 samples produces 'invalid' quality."""
        samples = [
            SensorSample(
                seq=i,
                t_us=i * 10000,
                a_g=(0.0, 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
            for i in range(15)
        ]
        quality = validate_window(samples, expected_odr_hz=100.0)
        self.assertEqual(quality.state, "invalid")
        self.assertIn("insufficient_samples", quality.reasons)

    def test_gap_threshold_exceeded(self):
        """Inter-sample gap > 40ms is flagged as gap_exceeded."""
        samples = []
        t = 0
        for i in range(50):
            # Inject 45ms gap at sample 25
            t += 45000 if i == 25 else 10000
            samples.append(
                SensorSample(
                    seq=i,
                    t_us=t,
                    a_g=(0.0, 0.0, 1.0),
                    valid=True,
                    saturated=False,
                    haptic_active=False,
                )
            )
        quality = validate_window(samples, expected_odr_hz=100.0, max_gap_ms_threshold=40.0)
        self.assertEqual(quality.state, "invalid")
        self.assertIn("gap_exceeded", quality.reasons)
        self.assertGreaterEqual(quality.max_gap_ms, 45.0)

    def test_timestamp_inversion(self):
        """Backwards timestamp triggers timestamp_inversion and invalid state."""
        samples = [
            SensorSample(
                seq=i,
                t_us=10000 * i if i != 30 else 10000 * 28,  # backwards timestamp
                a_g=(0.0, 0.0, 1.0),
                valid=True,
                saturated=False,
                haptic_active=False,
            )
            for i in range(60)
        ]
        quality = validate_window(samples, expected_odr_hz=100.0)
        self.assertEqual(quality.state, "invalid")
        self.assertIn("timestamp_inversion", quality.reasons)

    def test_sensor_saturation_and_read_error(self):
        """Saturation flags sensor_saturation."""
        samples = [
            SensorSample(
                seq=i,
                t_us=i * 10000,
                a_g=(0.0, 0.0, 2.05 if i == 10 else 1.0),  # exceeds 2.0g range
                valid=True,
                saturated=(i == 10),
                haptic_active=False,
            )
            for i in range(50)
        ]
        quality = validate_window(samples, expected_odr_hz=100.0, range_g=2.0)
        self.assertIn("sensor_saturation", quality.reasons)


if __name__ == "__main__":
    unittest.main()
