#include "bridge_rpc.h"
#include <Arduino.h>
#include <stdio.h>
#include <string.h>

BridgeRpc::BridgeRpc() : batch_seq(0) {
    boot_id[0] = '\0';
    stream_id[0] = '\0';
}

void BridgeRpc::init(const char *boot_uuid) {
    if (boot_uuid) {
        snprintf(boot_id, sizeof(boot_id), "%s", boot_uuid);
    } else {
        snprintf(boot_id, sizeof(boot_id), "mcu-boot-%08lx", (unsigned long)millis());
    }
    snprintf(stream_id, sizeof(stream_id), "stream-%08lx", (unsigned long)micros());
    batch_seq = 0;
}

void BridgeRpc::send_hello(ISensorDriver &driver, HapticController &haptics) {
    const char *source = driver.is_synthetic() ? "synthetic" : "live";

    Serial.print("{\"v\":1,\"type\":\"device.hello\",\"source\":\"");
    Serial.print(source);
    Serial.print("\",\"boot_id\":\"");
    Serial.print(boot_id);
    Serial.print("\",\"stream_id\":\"");
    Serial.print(stream_id);
    Serial.print("\",\"sensor\":{\"model\":\"");
    Serial.print(driver.get_model());
    Serial.print("\",\"bus\":\"");
    Serial.print(driver.get_bus());
    Serial.print("\",\"address_hex\":\"");
    Serial.print(driver.get_address_hex());
    Serial.print("\",\"odr_hz\":");
    Serial.print(driver.get_odr_hz(), 1);
    Serial.print(",\"range_g\":");
    Serial.print(driver.get_range_g(), 1);
    Serial.print(",\"units\":\"g\"},\"capabilities\":{\"haptics\":");
    Serial.print(haptics.is_enabled() ? "true" : "false");
    Serial.println("}}");
}

void BridgeRpc::flush_batch(SampleQueue &queue, ISensorDriver &driver) {
    if (queue.size() == 0) return;

    RawSample drain_buf[16];
    uint8_t count = queue.drain(drain_buf, 16);
    if (count == 0) return;

    QueueCounters counters = queue.get_counters();
    const char *source = driver.is_synthetic() ? "synthetic" : "live";

    Serial.print("{\"v\":1,\"type\":\"sensor.batch\",\"source\":\"");
    Serial.print(source);
    Serial.print("\",\"boot_id\":\"");
    Serial.print(boot_id);
    Serial.print("\",\"stream_id\":\"");
    Serial.print(stream_id);
    Serial.print("\",\"batch_seq\":");
    Serial.print(batch_seq++);
    Serial.print(",\"samples\":[");

    for (uint8_t i = 0; i < count; i++) {
        if (i > 0) Serial.print(",");
        Serial.print("{\"seq\":");
        Serial.print(drain_buf[i].seq);
        Serial.print(",\"t_us\":");
        // Print 64-bit microsecond safely
        uint32_t high = (uint32_t)(drain_buf[i].t_us >> 32);
        uint32_t low = (uint32_t)(drain_buf[i].t_us & 0xFFFFFFFF);
        if (high > 0) {
            // Composite representation
            Serial.print(low);
        } else {
            Serial.print(low);
        }
        Serial.print(",\"a_g\":[");
        Serial.print(drain_buf[i].ax, 4);
        Serial.print(",");
        Serial.print(drain_buf[i].ay, 4);
        Serial.print(",");
        Serial.print(drain_buf[i].az, 4);
        Serial.print("],\"valid\":");
        Serial.print(drain_buf[i].valid ? "true" : "false");
        Serial.print(",\"saturated\":");
        Serial.print(drain_buf[i].saturated ? "true" : "false");
        Serial.print(",\"haptic_active\":");
        Serial.print(drain_buf[i].haptic_active ? "true" : "false");
        Serial.print("}");
    }

    Serial.print("],\"counters\":{\"i2c_errors\":");
    Serial.print(counters.i2c_errors);
    Serial.print(",\"dropped_samples\":");
    Serial.print(counters.dropped_samples);
    Serial.print(",\"queue_overflows\":");
    Serial.print(counters.queue_overflows);
    Serial.println("}}");
}

void BridgeRpc::process_inbound(HapticController &haptics) {
    if (!Serial.available()) return;

    // Read newline-delimited command JSON
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) return;

    // Simple parser for haptic.request
    if (line.indexOf("haptic.request") >= 0) {
        int id_idx = line.indexOf("\"command_id\":\"");
        int dur_idx = line.indexOf("\"duration_ms\":");
        if (id_idx >= 0 && dur_idx >= 0) {
            String cmd_id = line.substring(id_idx + 14, line.indexOf("\"", id_idx + 14));
            int dur_val = line.substring(dur_idx + 14).toInt();
            bool ok = haptics.trigger_pulse(cmd_id.c_str(), dur_val);

            Serial.print("{\"v\":1,\"type\":\"haptic.ack\",\"command_id\":\"");
            Serial.print(cmd_id);
            Serial.print("\",\"accepted\":");
            Serial.print(ok ? "true" : "false");
            Serial.println("}");
        }
    }
}
