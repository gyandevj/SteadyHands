#include "haptic_control.h"
#include <Arduino.h>

HapticController::HapticController(uint8_t pin, bool enable)
    : output_pin(pin), enabled(enable), active(false),
      pulse_end_ms(0), last_pulse_end_ms(0), dedup_idx(0) {
    for (uint8_t i = 0; i < HAPTIC_DEDUP_SIZE; i++) {
        dedup_hashes[i] = 0;
    }
}

void HapticController::init() {
    // Actuator safety: ensure pin is LOW on startup
    // NOTE: Actuator must connect via transistor/MOSFET driver (e.g. DRV2605), NEVER bare GPIO!
    pinMode(output_pin, OUTPUT);
    digitalWrite(output_pin, LOW);
    active = false;
}

uint32_t HapticController::hash_command(const char *cmd_id) {
    if (!cmd_id) return 0;
    uint32_t hash = 5381;
    int c;
    while ((c = *cmd_id++)) {
        hash = ((hash << 5) + hash) + c;
    }
    return hash;
}

bool HapticController::trigger_pulse(const char *cmd_id, uint16_t duration_ms) {
    if (!enabled) return false;
    if (duration_ms < 1 || duration_ms > 80) return false;

    uint32_t now = millis();
    // 1-second cooldown
    if ((now - last_pulse_end_ms) < 1000) return false;

    // Deduplication check
    uint32_t h = hash_command(cmd_id);
    for (uint8_t i = 0; i < HAPTIC_DEDUP_SIZE; i++) {
        if (dedup_hashes[i] == h && h != 0) {
            return false;
        }
    }

    // Record command ID
    dedup_hashes[dedup_idx] = h;
    dedup_idx = (dedup_idx + 1) % HAPTIC_DEDUP_SIZE;

    // Activate
    active = true;
    pulse_end_ms = now + duration_ms;
    digitalWrite(output_pin, HIGH);
    return true;
}

void HapticController::update() {
    if (active) {
        uint32_t now = millis();
        // Automatic shutoff when duration expires
        if (now >= pulse_end_ms) {
            digitalWrite(output_pin, LOW);
            active = false;
            last_pulse_end_ms = now;
        }
    }
}
