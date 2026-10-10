"""Unit tests for spectral feature extraction and dominant peak recovery."""

import unittest
import math
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../analysis/src")))

from steadyhand_signal.spectral import compute_summed_psd
from steadyhand_signal.features import extract_features


class TestFeatures(unittest.TestCase):
    def test_5hz_peak_recovery(self):
        """Pure 5.0 Hz oscillation recovers dominant frequency 5.0 +- 0.3 Hz."""
        fs = 100.0
        n = 150  # 1.5s window
        amp = 0.04  # 40 mg amplitude
        freq = 5.0

        ax = [amp * math.sin(2 * math.pi * freq * (i / fs)) for i in range(n)]
        ay = [0.0] * n
        az = [1.0] * n  # 1g static gravity

        freqs, psd_sum = compute_summed_psd(ax, ay, az, fs=fs)
        features = extract_features(freqs, psd_sum, band_min_hz=3.0, band_max_hz=12.0)

        self.assertIsNotNone(features.dominant_hz)
        self.assertAlmostEqual(features.dominant_hz, 5.0, delta=0.3)
        self.assertGreater(features.band_rms_g, 0.02)
        self.assertGreater(features.peak_concentration, 0.50)
        self.assertGreater(features.band_power_ratio, 0.70)

    def test_8hz_peak_recovery(self):
        """Pure 8.0 Hz oscillation recovers dominant frequency 8.0 +- 0.3 Hz."""
        fs = 100.0
        n = 150
        amp = 0.03
        freq = 8.0

        ax = [0.0] * n
        ay = [amp * math.sin(2 * math.pi * freq * (i / fs)) for i in range(n)]
        az = [1.0] * n

        freqs, psd_sum = compute_summed_psd(ax, ay, az, fs=fs)
        features = extract_features(freqs, psd_sum, band_min_hz=3.0, band_max_hz=12.0)

        self.assertIsNotNone(features.dominant_hz)
        self.assertAlmostEqual(features.dominant_hz, 8.0, delta=0.3)
        self.assertGreater(features.peak_concentration, 0.50)


if __name__ == "__main__":
    unittest.main()
