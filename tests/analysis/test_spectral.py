"""Unit tests for spectral analysis, Hann windowing, and PSD computation."""

import unittest
import math
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../analysis/src")))

from steadyhand_signal.spectral import compute_axis_psd, compute_summed_psd


class TestSpectral(unittest.TestCase):
    def test_summed_axis_linearity(self):
        """Summed 3-axis PSD is mathematically equal to sum of individual PSDs."""
        n = 100
        fs = 100.0
        ax = [math.sin(2 * math.pi * 5.0 * (i / fs)) for i in range(n)]
        ay = [0.5 * math.cos(2 * math.pi * 8.0 * (i / fs)) for i in range(n)]
        az = [1.0] * n  # constant gravity DC

        freqs, psd_sum = compute_summed_psd(ax, ay, az, fs=fs)
        _, psd_x = compute_axis_psd(ax, fs=fs)
        _, psd_y = compute_axis_psd(ay, fs=fs)
        _, psd_z = compute_axis_psd(az, fs=fs)

        self.assertEqual(len(freqs), len(psd_sum))
        for i in range(len(freqs)):
            expected = psd_x[i] + psd_y[i] + psd_z[i]
            self.assertAlmostEqual(psd_sum[i], expected, places=7)

    def test_pure_sinusoid_spectral_peak_location(self):
        """Pure 10 Hz sine wave produces peak PSD exactly at the 10 Hz bin."""
        fs = 100.0
        n = 100  # bin resolution = 1 Hz
        target_hz = 10.0
        data = [0.1 * math.sin(2 * math.pi * target_hz * (i / fs)) for i in range(n)]

        freqs, psd = compute_axis_psd(data, fs=fs)

        peak_idx = max(range(len(psd)), key=lambda i: psd[i])
        peak_freq = freqs[peak_idx]

        self.assertAlmostEqual(peak_freq, target_hz, delta=0.5)
        # Power should be concentrated at 10 Hz
        self.assertGreater(psd[peak_idx], 0.001)


if __name__ == "__main__":
    unittest.main()
