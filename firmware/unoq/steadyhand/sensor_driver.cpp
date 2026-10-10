#include "sensor_driver.h"
#include <Arduino.h>
#include <Wire.h>
#include <math.h>

// --- Unconfigured Hardware Sensor Driver ---

UnconfiguredHardwareSensorDriver::UnconfiguredHardwareSensorDriver()
    : detected_address(0), detected_who_am_i(0), bus_scanned(false) {}

bool UnconfiguredHardwareSensorDriver::init() {
    Wire.begin();
    bus_scanned = true;

    // Bounded I2C scanner over standard 7-bit address range
    for (uint8_t addr = 0x08; addr <= 0x77; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            detected_address = addr;

            // Probe candidate identity register (0x0F WHO_AM_I on ST/ADI/InvenSense)
            Wire.beginTransmission(addr);
            Wire.write(0x0F);
            if (Wire.endTransmission() == 0) {
                if (Wire.requestFrom(addr, (uint8_t)1) == 1) {
                    detected_who_am_i = Wire.read();
                }
            }
            break;
        }
    }

    // Physical sensor remains explicitly unconfigured until confirmed in build record
    return false;
}

bool UnconfiguredHardwareSensorDriver::read_sample(float &ax, float &ay, float &az, bool &valid, bool &saturated) {
    // Never fabricate values when physical hardware is unconfigured
    ax = 0.0f;
    ay = 0.0f;
    az = 0.0f;
    valid = false;
    saturated = false;
    return false;
}


// --- Synthetic Development Sensor Driver ---

SyntheticDevelopmentSensorDriver::SyntheticDevelopmentSensorDriver(float freq_hz, float odr)
    : step_count(0), frequency_hz(freq_hz), odr_hz(odr) {}

bool SyntheticDevelopmentSensorDriver::init() {
    step_count = 0;
    return true;
}

bool SyntheticDevelopmentSensorDriver::read_sample(float &ax, float &ay, float &az, bool &valid, bool &saturated) {
    float t_sec = (float)step_count / odr_hz;
    float phase = 2.0f * 3.14159265f * frequency_hz * t_sec;

    // 0.04 g 5 Hz tremor on X and Y + 1.0 g gravity on Z
    ax = 0.04f * sinf(phase);
    ay = 0.04f * cosf(phase);
    az = 0.98f + (0.005f * sinf(phase * 0.5f));

    valid = true;
    saturated = false;
    step_count++;
    return true;
}
