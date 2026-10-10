#ifndef BRIDGE_RPC_H
#define BRIDGE_RPC_H

#include "sample_queue.h"
#include "sensor_driver.h"
#include "haptic_control.h"
#include <stdint.h>

class BridgeRpc {
private:
    char boot_id[32];
    char stream_id[32];
    uint32_t batch_seq;

public:
    BridgeRpc();

    void init(const char *boot_uuid);
    void flush_batch(SampleQueue &queue, ISensorDriver &driver);
    void send_hello(ISensorDriver &driver, HapticController &haptics);
    void send_health(SampleQueue &queue, ISensorDriver &driver);
    void process_inbound(HapticController &haptics);
};

#endif // BRIDGE_RPC_H
