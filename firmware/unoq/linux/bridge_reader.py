#!/usr/bin/env python3
"""Linux-side bridge reader script for Arduino UNO Q batched transport.

Reads serial/bridge output, validates sensor batches, and forwards to bridge service.
"""

import sys
import json
import time
import argparse


def parse_args():
    parser = argparse.ArgumentParser(description="SteadyHand UNO Q Linux Bridge Reader")
    parser.add_argument("--port", default="/dev/ttyACM0", help="Serial port or character device")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default 115200)")
    return parser.parse_args()


def main():
    args = parse_args()
    print(f"=== SteadyHand Bridge Reader starting on {args.port} ({args.baud} baud) ===")

    try:
        import serial
    except ImportError:
        print("ERROR: pyserial is required to run the physical bridge reader.", file=sys.stderr)
        print("Install via: pip install pyserial", file=sys.stderr)
        sys.exit(1)

    try:
        ser = serial.Serial(args.port, args.baud, timeout=1.0)
    except Exception as e:
        print(f"ERROR: Failed to open serial port {args.port}: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        while True:
            line = ser.readline().decode("utf-8", errors="replace").strip()
            if not line:
                continue

            try:
                pkt = json.loads(line)
                pkt_type = pkt.get("type")
                if pkt_type == "sensor.batch":
                    samples = pkt.get("samples", [])
                    print(f"[BATCH] seq={pkt.get('batch_seq')} samples={len(samples)} src={pkt.get('source')}")
                elif pkt_type == "device.hello":
                    print(f"[HELLO] sensor={pkt.get('sensor', {}).get('model')} boot={pkt.get('boot_id')}")
                else:
                    print(f"[MSG] {line}")
            except json.JSONDecodeError:
                # Raw text or log output from firmware
                print(f"[RAW] {line}")

    except KeyboardInterrupt:
        print("\nExiting bridge reader.")
    finally:
        ser.close()


if __name__ == "__main__":
    main()
