#ifndef SENSOR_DRIVER_H
#define SENSOR_DRIVER_H

#include <stdint.h>

/**
 * Sensor Driver Interface for SteadyHand Accelerometer Acquisition.
 * Conforms strictly to docs/contracts.md (Version 1).
 */
class ISensorDriver {
public:
    virtual ~ISensorDriver() {}

    /**
     * Initialize I2C bus and probe sensor identity.
     * Returns true if sensor is verified and configured; false if unconfigured or absent.
     */
    virtual bool init() = 0;

    /**
     * Read coherent 3-axis acceleration in units of g.
     * Must populate ax, ay, az and validity flags.
     */
    virtual bool read_sample(float &ax, float &ay, float &az, bool &valid, bool &saturated) = 0;

    virtual const char* get_model() const = 0;
    virtual const char* get_bus() const = 0;
    virtual const char* get_address_hex() const = 0;
    virtual float get_odr_hz() const = 0;
    virtual float get_range_g() const = 0;
    virtual bool is_synthetic() const = 0;
};

/**
 * Unconfigured physical hardware driver.
 * Scans bus and reads identity registers, but explicitly keeps data acquisition
 * unavailable until exact physical Grove chip marking is confirmed in build-record.md.
 */
class UnconfiguredHardwareSensorDriver : public ISensorDriver {
private:
    uint8_t detected_address;
    uint8_t detected_who_am_i;
    bool bus_scanned;

public:
    UnconfiguredHardwareSensorDriver();
    virtual bool init() override;
    virtual bool read_sample(float &ax, float &ay, float &az, bool &valid, bool &saturated) override;
    virtual const char* get_model() const override { return "Unconfigured I2C Accelerometer"; }
    virtual const char* get_bus() const override { return "Wire"; }
    virtual const char* get_address_hex() const override { return "0x00"; }
    virtual float get_odr_hz() const override { return 100.0f; }
    virtual float get_range_g() const override { return 2.0f; }
    virtual bool is_synthetic() const override { return false; }

    uint8_t get_detected_address() const { return detected_address; }
    uint8_t get_detected_who_am_i() const { return detected_who_am_i; }
};

/**
 * Physical Grove MMA7660FC 3-axis accelerometer driver (I2C 0x4C).
 * Placed beside the trackpad to detect tremors.
 */
class Mma7660SensorDriver : public ISensorDriver {
private:
    bool initialized;

public:
    Mma7660SensorDriver();
    virtual bool init() override;
    virtual bool read_sample(float &ax, float &ay, float &az, bool &valid, bool &saturated) override;
    virtual const char* get_model() const override { return "MMA7660FC"; }
    virtual const char* get_bus() const override { return "Wire"; }
    virtual const char* get_address_hex() const override { return "0x4C"; }
    virtual float get_odr_hz() const override { return 64.0f; }
    virtual float get_range_g() const override { return 1.5f; }
    virtual bool is_synthetic() const override { return false; }
};

/**
 * Clearly labeled synthetic development driver.
 * Used for firmware queue, timing, and bridge verification before physical sensor soldering.
 */
class SyntheticDevelopmentSensorDriver : public ISensorDriver {
private:
    uint32_t step_count;
    float frequency_hz;
    float odr_hz;

public:
    SyntheticDevelopmentSensorDriver(float freq_hz = 5.0f, float odr = 100.0f);
    virtual bool init() override;
    virtual bool read_sample(float &ax, float &ay, float &az, bool &valid, bool &saturated) override;
    virtual const char* get_model() const override { return "Synthetic Development Stream"; }
    virtual const char* get_bus() const override { return "Synthetic"; }
    virtual const char* get_address_hex() const override { return "0x00"; }
    virtual float get_odr_hz() const override { return odr_hz; }
    virtual float get_range_g() const override { return 2.0f; }
    virtual bool is_synthetic() const override { return true; }
};

#endif // SENSOR_DRIVER_H
