"""Unit tests for uniform time grid resampling."""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../analysis/src")))

from steadyhand_signal.models import SensorSample
from steadyhand_signal.resampler import resample_to_grid


class TestResampler(unittest.TestCase):
    def test_uniform_grid_spacing(self):
        """Resampling produces points spaced exactly by 1 / fs."""
        # Non-uniform timestamps (between 9ms and 11ms apart)
        samples = []
        t = 0
        for i in range(101):
            samples.append(
                SensorSample(
                    seq=i,
                    t_us=t,
                    a_g=(0.02 * i, 0.01 * i, 0.98),
                    valid=True,
                    saturated=False,
                    haptic_active=False,
                )
            )
            t += 11000 if i % 2 == 0 else 9000

        t_grid, ax_grid, ay_grid, az_grid = resample_to_grid(samples, target_fs=100.0)

        self.assertGreater(len(t_grid), 90)
        # Verify uniform spacing: dt == 0.01s (within float precision)
        for i in range(1, len(t_grid)):
            dt = t_grid[i] - t_grid[i - 1]
            self.assertAlmostEqual(dt, 0.01, places=5)

    def test_linear_interpolation_fidelity(self):
        """Linear ramp acceleration is reconstructed accurately."""
        # Clean ramp: ax = t_sec * 2.0
        samples = []
        for i in range(51):
            t_us = i * 20000  # 50 Hz
            t_sec = t_us / 1_000_000.0
            samples.append(
                SensorSample(
                    seq=i,
                    t_us=t_us,
                    a_g=(t_sec * 2.0, 0.0, 1.0),
                    valid=True,
                    saturated=False,
                    haptic_active=False,
                )
            )

        t_grid, ax_grid, _, _ = resample_to_grid(samples, target_fs=100.0)
        for tg, ax in zip(t_grid, ax_grid):
            expected = tg * 2.0
            self.assertAlmostEqual(ax, expected, places=3)


if __name__ == "__main__":
    unittest.main()
