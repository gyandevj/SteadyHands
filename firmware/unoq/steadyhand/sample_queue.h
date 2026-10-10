#ifndef SAMPLE_QUEUE_H
#define SAMPLE_QUEUE_H

#include <stdint.h>
#include <stdbool.h>

#define SAMPLE_QUEUE_CAPACITY 64

struct RawSample {
    uint32_t seq;
    uint64_t t_us;
    float ax;
    float ay;
    float az;
    bool valid;
    bool saturated;
    bool haptic_active;
};

struct QueueCounters {
    uint32_t i2c_errors;
    uint32_t dropped_samples;
    uint32_t queue_overflows;
};

class SampleQueue {
private:
    RawSample buffer[SAMPLE_QUEUE_CAPACITY];
    uint16_t head;
    uint16_t tail;
    uint16_t count;

    uint32_t next_seq;
    uint32_t last_raw_micros;
    uint64_t extended_micros_base;

    QueueCounters counters;

public:
    SampleQueue();

    void reset();
    uint64_t extend_micros(uint32_t now_raw_us);

    bool push(float ax, float ay, float az, bool valid, bool saturated, bool haptic_active);
    uint8_t drain(RawSample *out_samples, uint8_t max_count);

    uint16_t size() const { return count; }
    QueueCounters get_counters() const { return counters; }
    void increment_i2c_error() { counters.i2c_errors++; }
};

#endif // SAMPLE_QUEUE_H
