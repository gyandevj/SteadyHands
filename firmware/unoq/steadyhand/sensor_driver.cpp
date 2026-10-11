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


// --- Physical Grove MMA7660FC Sensor Driver ---
#define MMA7660_I2C_ADDR 0x4C

Mma7660SensorDriver::Mma7660SensorDriver() : initialized(false) {}

bool Mma7660SensorDriver::init() {
    Wire.begin();
    Wire.setClock(400000);
    Wire.setWireTimeout(3000, true); // 3ms timeout, reset bus on timeout

    // 1. Put MMA7660 into standby to configure registers
    Wire.beginTransmission(MMA7660_I2C_ADDR);
    Wire.write(0x07); // MODE register
    Wire.write(0x00); // Standby
    if (Wire.endTransmission() != 0) {
        return false;
    }

    // 2. Set sample rate to 64 samples/sec (AUTO_SLEEP_64 = 0x01)
    Wire.beginTransmission(MMA7660_I2C_ADDR);
    Wire.write(0x08); // SR register
    Wire.write(0x01); // 64 Hz ODR
    Wire.endTransmission();

    // 3. Put MMA7660 into ACTIVE mode
    Wire.beginTransmission(MMA7660_I2C_ADDR);
    Wire.write(0x07); // MODE register
    Wire.write(0x01); // Active
    if (Wire.endTransmission() != 0) {
        return false;
    }

    initialized = true;
    return true;
}

bool Mma7660SensorDriver::read_sample(float &ax, float &ay, float &az, bool &valid, bool &saturated) {
    if (!initialized) {
        ax = ay = az = 0.0f;
        valid = false;
        saturated = false;
        return false;
    }

    // Direct, bounded, non-blocking MMA7660 register read (0x00 XOUT, 0x01 YOUT, 0x02 ZOUT)
    Wire.beginTransmission(MMA7660_I2C_ADDR);
    Wire.write(0x00);
    if (Wire.endTransmission(false) != 0) {
        valid = false;
        saturated = false;
        return false;
    }

    if (Wire.requestFrom((uint8_t)MMA7660_I2C_ADDR, (uint8_t)3) != 3) {
        valid = false;
        saturated = false;
        return false;
    }

    uint8_t rawX = Wire.read();
    uint8_t rawY = Wire.read();
    uint8_t rawZ = Wire.read();

    // If bit 6 (ALERT) is set on any axis, the register was being updated when read.
    // Non-blocking: simply drop this sample and wait for next interval (prevents infinite lockups)
    if ((rawX & 0x40) || (rawY & 0x40) || (rawZ & 0x40)) {
        valid = false;
        saturated = false;
        return false;
    }

    // Sign extend 6-bit signed integer (bit 5 is sign bit)
    int8_t sx = (int8_t)rawX;
    int8_t sy = (int8_t)rawY;
    int8_t sz = (int8_t)rawZ;

    if (sx & 0x20) sx |= 0xC0;
    if (sy & 0x20) sy |= 0xC0;
    if (sz & 0x20) sz |= 0xC0;

    // Convert to g (21.33 counts per g for +/- 1.5g range)
    ax = (float)sx / 21.33f;
    ay = (float)sy / 21.33f;
    az = (float)sz / 21.33f;

    valid = true;
    saturated = (fabsf(ax) >= 1.45f || fabsf(ay) >= 1.45f || fabsf(az) >= 1.45f);
    return true;
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
