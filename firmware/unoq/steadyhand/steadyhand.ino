/**
 * SteadyHand Arduino UNO Q Firmware.
 * 
 * Implements high-rate coherent accelerometer acquisition, bounded ring buffering,
 * wrapping-safe monotonic timestamps, and batched transport over Bridge RPC/Serial.
 * 
 * Conforms strictly to docs/contracts.md (Version 1).
 */

#include "sensor_driver.h"
#include "sample_queue.h"
#include "bridge_rpc.h"
#include "haptic_control.h"

// Configuration: select driver mode
// In synthetic dev mode: generates deterministic 5 Hz sine vector (clearly labeled synthetic)
// In hardware mode: probes selected physical I2C bus (marked unconfigured until chip verified)
#define USE_SYNTHETIC_DEV_DRIVER 1

#if USE_SYNTHETIC_DEV_DRIVER
SyntheticDevelopmentSensorDriver sensorDriver(5.0f, 100.0f);
#else
UnconfiguredHardwareSensorDriver sensorDriver;
#endif

SampleQueue sampleQueue;
BridgeRpc bridgeRpc;
HapticController hapticController(9, false); // Pin 9, disabled by default

uint32_t lastSampleTimeUs = 0;
const uint32_t sampleIntervalUs = 10000; // 100 Hz (10 ms)
uint32_t lastFlushTimeMs = 0;
const uint32_t flushIntervalMs = 100;    // Flush batches every 100 ms

void setup() {
    Serial.begin(115200);
    while (!Serial && millis() < 3000) {
        // Wait up to 3s for USB CDC on boards that require it
    }

    hapticController.init();
    sampleQueue.reset();
    sensorDriver.init();
    bridgeRpc.init(NULL);

    // Broadcast hello descriptor upon boot
    bridgeRpc.send_hello(sensorDriver, hapticController);

    lastSampleTimeUs = micros();
    lastFlushTimeMs = millis();
}

void loop() {
    uint32_t nowUs = micros();

    // 1. Timed sample acquisition (100 Hz)
    if ((nowUs - lastSampleTimeUs) >= sampleIntervalUs) {
        lastSampleTimeUs += sampleIntervalUs;

        float ax = 0.0f, ay = 0.0f, az = 0.0f;
        bool valid = false, saturated = false;

        if (sensorDriver.read_sample(ax, ay, az, valid, saturated)) {
            sampleQueue.push(
                ax, ay, az,
                valid, saturated,
                hapticController.is_active()
            );
        } else {
            sampleQueue.increment_i2c_error();
        }
    }

    // 2. Batch transport flush (target ~10 samples per flush or 100 ms)
    uint32_t nowMs = millis();
    if (sampleQueue.size() >= 10 || (nowMs - lastFlushTimeMs) >= flushIntervalMs) {
        lastFlushTimeMs = nowMs;
        bridgeRpc.flush_batch(sampleQueue, sensorDriver);
    }

    // 3. Actuator supervision update (hardware shutoff timer)
    hapticController.update();

    // 4. Inbound command handling (haptic pulse requests, ping)
    bridgeRpc.process_inbound(hapticController);
}
