"""Bounded ring buffer for sensor samples with strict overflow accounting."""

import threading
from collections import deque
from typing import List, Optional
from ..contracts import SensorSample


class BoundedSampleBuffer:
    """Fixed-capacity ring buffer for high-rate sensor samples.
    
    Thread-safe and bounded to prevent memory growth under slow consumer conditions.
    Tracks dropped samples and sequence number gaps.
    """

    def __init__(self, capacity: int = 1000):
        self.capacity = capacity
        self._deque: deque[SensorSample] = deque(maxlen=capacity)
        self._lock = threading.Lock()

        self._total_pushed = 0
        self._overflow_drops = 0
        self._sequence_gaps = 0
        self._last_seq: Optional[int] = None

    def push(self, sample: SensorSample) -> None:
        """Push a single validated sensor sample."""
        with self._lock:
            if len(self._deque) == self.capacity:
                self._overflow_drops += 1

            if self._last_seq is not None:
                gap = sample.seq - (self._last_seq + 1)
                if gap > 0:
                    self._sequence_gaps += gap

            self._last_seq = sample.seq
            self._deque.append(sample)
            self._total_pushed += 1

    def push_many(self, samples: List[SensorSample]) -> None:
        """Push a batch of sensor samples atomically."""
        for s in samples:
            self.push(s)

    def get_latest(self, count: int) -> List[SensorSample]:
        """Return the latest `count` samples (oldest to newest)."""
        with self._lock:
            n = min(count, len(self._deque))
            if n == 0:
                return []
            # Return slice of rightmost n elements
            return list(self._deque)[-n:]

    def clear(self) -> None:
        """Reset buffer state upon reboot or stream disconnect."""
        with self._lock:
            self._deque.clear()
            self._last_seq = None

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._deque)

    @property
    def total_pushed(self) -> int:
        with self._lock:
            return self._total_pushed

    @property
    def overflow_drops(self) -> int:
        with self._lock:
            return self._overflow_drops

    @property
    def sequence_gaps(self) -> int:
        with self._lock:
            return self._sequence_gaps
