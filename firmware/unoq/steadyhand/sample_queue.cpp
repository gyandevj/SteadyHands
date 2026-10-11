#include "sample_queue.h"
#include <Arduino.h>

SampleQueue::SampleQueue() {
    reset();
}

void SampleQueue::reset() {
    head = 0;
    tail = 0;
    count = 0;
    next_seq = 0;
    last_raw_micros = 0;
    extended_micros_base = 0;
    counters.i2c_errors = 0;
    counters.dropped_samples = 0;
    counters.queue_overflows = 0;
}

uint64_t SampleQueue::extend_micros(uint32_t now_raw_us) {
    // 32-bit wrap detection: if current reading is less than previous reading, rollover occurred
    if (now_raw_us < last_raw_micros) {
        extended_micros_base += 0x100000000ULL; // 2^32 microseconds
    }
    last_raw_micros = now_raw_us;
    return extended_micros_base + now_raw_us;
}

bool SampleQueue::push_with_time(float ax, float ay, float az, bool valid, bool saturated, bool haptic_active, uint32_t sample_raw_us) {
    uint64_t t_extended = extend_micros(sample_raw_us);

    if (count == SAMPLE_QUEUE_CAPACITY) {
        // Drop oldest to favor fresh state
        tail = (tail + 1) % SAMPLE_QUEUE_CAPACITY;
        count--;
        counters.queue_overflows++;
        counters.dropped_samples++;
    }

    RawSample &sample = buffer[head];
    sample.seq = next_seq++;
    sample.t_us = t_extended;
    sample.ax = ax;
    sample.ay = ay;
    sample.az = az;
    sample.valid = valid;
    sample.saturated = saturated;
    sample.haptic_active = haptic_active;

    head = (head + 1) % SAMPLE_QUEUE_CAPACITY;
    count++;
    return true;
}

bool SampleQueue::push(float ax, float ay, float az, bool valid, bool saturated, bool haptic_active) {
    return push_with_time(ax, ay, az, valid, saturated, haptic_active, micros());
}

uint8_t SampleQueue::drain(RawSample *out_samples, uint8_t max_count) {
    if (!out_samples || max_count == 0) return 0;

    uint8_t drained = 0;
    while (count > 0 && drained < max_count) {
        out_samples[drained] = buffer[tail];
        tail = (tail + 1) % SAMPLE_QUEUE_CAPACITY;
        count--;
        drained++;
    }
    return drained;
}
