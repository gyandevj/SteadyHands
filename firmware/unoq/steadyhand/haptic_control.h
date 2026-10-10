#ifndef HAPTIC_CONTROL_H
#define HAPTIC_CONTROL_H

#include <stdint.h>
#include <stdbool.h>

#define HAPTIC_DEDUP_SIZE 64

class HapticController {
private:
    uint8_t output_pin;
    bool enabled;
    bool active;
    uint32_t pulse_end_ms;
    uint32_t last_pulse_end_ms;
    uint32_t dedup_hashes[HAPTIC_DEDUP_SIZE];
    uint8_t dedup_idx;

    uint32_t hash_command(const char *cmd_id);

public:
    HapticController(uint8_t pin = 9, bool enable = false);

    void init();
    bool trigger_pulse(const char *cmd_id, uint16_t duration_ms);
    void update(); // Must be called in loop() for automatic safety shutoff

    bool is_active() const { return active; }
    bool is_enabled() const { return enabled; }
    void set_enabled(bool val) { enabled = val; }
};

#endif // HAPTIC_CONTROL_H
