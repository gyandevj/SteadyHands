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
    if (!Serial || queue.size() == 0) return;

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

    char sbuf[128];
    for (uint8_t i = 0; i < count; i++) {
        uint32_t low = (uint32_t)(drain_buf[i].t_us & 0xFFFFFFFF);
        snprintf(sbuf, sizeof(sbuf),
            "%s{\"seq\":%lu,\"t_us\":%lu,\"a_g\":[%.4f,%.4f,%.4f],\"valid\":%s,\"saturated\":%s,\"haptic_active\":%s}",
            (i > 0 ? "," : ""),
            (unsigned long)drain_buf[i].seq,
            (unsigned long)low,
            drain_buf[i].ax, drain_buf[i].ay, drain_buf[i].az,
            drain_buf[i].valid ? "true" : "false",
            drain_buf[i].saturated ? "true" : "false",
            drain_buf[i].haptic_active ? "true" : "false"
        );
        Serial.print(sbuf);
    }

    snprintf(sbuf, sizeof(sbuf),
        "],\"counters\":{\"i2c_errors\":%lu,\"dropped_samples\":%lu,\"queue_overflows\":%lu}}\n",
        (unsigned long)counters.i2c_errors,
        (unsigned long)counters.dropped_samples,
        (unsigned long)counters.queue_overflows
    );
    Serial.print(sbuf);
}

void BridgeRpc::process_inbound(HapticController &haptics) {
    if (!Serial || !Serial.available()) return;

    static char in_buf[128];
    static uint8_t in_pos = 0;

    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
            if (in_pos > 0) {
                in_buf[in_pos] = '\0';
                if (strstr(in_buf, "haptic.request") != NULL) {
                    char *id_ptr = strstr(in_buf, "\"command_id\":\"");
                    char *dur_ptr = strstr(in_buf, "\"duration_ms\":");
                    if (id_ptr && dur_ptr) {
                        id_ptr += 14;
                        char *id_end = strchr(id_ptr, '\"');
                        if (id_end) {
                            *id_end = '\0';
                            int dur_val = atoi(dur_ptr + 14);
                            bool ok = haptics.trigger_pulse(id_ptr, dur_val);
                            Serial.print("{\"v\":1,\"type\":\"haptic.ack\",\"command_id\":\"");
                            Serial.print(id_ptr);
                            Serial.print("\",\"accepted\":");
                            Serial.print(ok ? "true" : "false");
                            Serial.println("}");
                        }
                    }
                }
                in_pos = 0;
            }
        } else if (in_pos < sizeof(in_buf) - 1) {
            in_buf[in_pos++] = c;
        } else {
            in_pos = 0;
        }
    }
}
