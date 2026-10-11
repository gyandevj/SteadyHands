/**
 * SteadyHand Arduino UNO R4 Firmware with Grove MMA7660FC & Grove LCD RGB Backlight v4.
 * 
 * Hardware configuration:
 * - Arduino UNO R4 WiFi on 5V logic
 * - Grove Base Shield seated on headers
 * - I2C Device 1 (Wire): Grove MMA7660FC 3-axis accelerometer at address 0x4C (placed beside trackpad)
 * - I2C Device 2 (Wire): Grove LCD RGB Backlight v4 (Display 0x3E, Backlight 0x62) with solid white illumination
 * 
 * Functions:
 * 1. Coherent acceleration acquisition from MMA7660FC into fixed SRAM ring buffer.
 * 2. Real-time accelerometer readout on LCD with solid white backlight.
 * 3. Batched JSON transport over Serial (115200 baud) conforming to docs/contracts.md (Version 1).
 */

#include "sensor_driver.h"
#include "sample_queue.h"
#include "bridge_rpc.h"
#include "haptic_control.h"
#include <rgb_lcd.h>

// Select driver: 1 = Physical MMA7660FC hardware (address 0x4C), 0 = Synthetic dev
#define USE_PHYSICAL_MMA7660 1

#if USE_PHYSICAL_MMA7660
Mma7660SensorDriver sensorDriver;
#else
SyntheticDevelopmentSensorDriver sensorDriver(5.0f, 100.0f);
#endif

SampleQueue sampleQueue;
BridgeRpc bridgeRpc;
HapticController hapticController(9, false); // Pin 9, disabled by default
rgb_lcd lcdDisplay;

uint32_t lastSampleTimeUs = 0;
// MMA7660 at 64 Hz -> 15,625 us interval
const uint32_t sampleIntervalUs = 15625;
uint32_t lastFlushTimeMs = 0;
const uint32_t flushIntervalMs = 100;    // Flush batches every ~100 ms
uint32_t lastLcdUpdateMs = 0;
const uint32_t lcdUpdateIntervalMs = 250; // Update LCD display every 250 ms

float latestAx = 0.0f, latestAy = 0.0f, latestAz = 0.0f;

void setup() {
    Serial.begin(115200);
    Serial.setTimeout(5);
    while (!Serial && millis() < 2000) {
        // Short pause for serial CDC
    }

    // 1. Initialize LCD RGB Backlight
    lcdDisplay.begin(16, 2);
    Wire.setClock(400000); // 400 kHz Fast-mode I2C
    // Solid white backlight (255, 255, 255) as specified
    lcdDisplay.setRGB(255, 255, 255);
    lcdDisplay.setCursor(0, 0);
    lcdDisplay.print("SteadyHand Track");
    lcdDisplay.setCursor(0, 1);
    lcdDisplay.print("Starting...");

    // 2. Initialize sensor driver & safety subsystems
    hapticController.init();
    sampleQueue.reset();
    bool sensorOk = sensorDriver.init();
    Wire.setClock(400000); // Ensure 400 kHz

    bridgeRpc.init(NULL);
    bridgeRpc.send_hello(sensorDriver, hapticController);

    lcdDisplay.clear();
    lcdDisplay.setCursor(0, 0);
    if (sensorOk) {
        lcdDisplay.print("SteadyHand: LIVE");
    } else {
        lcdDisplay.print("SteadyHand: INIT");
    }

    lastSampleTimeUs = micros();
    lastFlushTimeMs = millis();
    lastLcdUpdateMs = millis();
}

void loop() {
    uint32_t nowUs = micros();

    // 1. Timed sample acquisition (~64 Hz = 15,625 us interval)
    // Catch up any samples if loop was momentarily delayed, bounded to max 4 iterations
    uint8_t loopCount = 0;
    while ((nowUs - lastSampleTimeUs) >= sampleIntervalUs && loopCount < 4) {
        lastSampleTimeUs += sampleIntervalUs;
        loopCount++;

        float ax = 0.0f, ay = 0.0f, az = 0.0f;
        bool valid = false, saturated = false;

        if (sensorDriver.read_sample(ax, ay, az, valid, saturated)) {
            latestAx = ax;
            latestAy = ay;
            latestAz = az;

            sampleQueue.push_with_time(
                ax, ay, az,
                valid, saturated,
                hapticController.is_active(),
                lastSampleTimeUs
            );
        } else {
            sampleQueue.increment_i2c_error();
        }
    }
    // Prevent long freeze desync
    if ((nowUs - lastSampleTimeUs) > (4 * sampleIntervalUs)) {
        lastSampleTimeUs = nowUs;
    }

    // 2. Batch transport flush (~4 samples per flush or 60 ms)
    uint32_t nowMs = millis();
    if (sampleQueue.size() >= 4 || (nowMs - lastFlushTimeMs) >= 60) {
        lastFlushTimeMs = nowMs;
        bridgeRpc.flush_batch(sampleQueue, sensorDriver);
    }

    // 3. LCD screen real-time readout update (solid white backlight maintained, 350 ms cadence)
    if ((nowMs - lastLcdUpdateMs) >= 350) {
        lastLcdUpdateMs = nowMs;
        lcdDisplay.setCursor(0, 1);
        char buf[17];
        snprintf(buf, sizeof(buf), "X:%+.2f Y:%+.2f", latestAx, latestAy);
        lcdDisplay.print(buf);
    }

    // 4. Actuator supervision update (hardware shutoff timer)
    hapticController.update();

    // 5. Inbound command handling (haptic pulse requests, ping)
    bridgeRpc.process_inbound(hapticController);
}
