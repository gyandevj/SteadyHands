# Primary references and unresolved verification

Checked on 2026-10-10. These sources support platform and hardware facts. Project architecture, scope, thresholds, and interface names are team design proposals.

## Chrome

- [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts): DOM access, isolated context, injection, and frame behavior.
- [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab): temporary page access after user invocation.
- [WebSockets in extension workers](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets): Chrome 116+ support and application keepalive pattern.
- [Worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle): treat worker state as recoverable.
- [Extension network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests): extension-origin network requests, host permissions, and bounded messaging.
- [Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage): choose storage areas and trusted-context access for secrets.
- [Local Network Access update](https://developer.chrome.com/blog/local-network-access): browser network behavior changes require testing. This plan does not assume a blanket extension exemption.
- [Offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen): reasons are specific; P0 does not use an offscreen workaround for transport.

## Hardware and analysis

- [UNO Q official pinout](https://docs.arduino.cc/resources/pinouts/ABX00162-full-pinout.pdf)
- [UNO Q manual](https://docs.arduino.cc/tutorials/uno-q/user-manual/)
- [Arduino_RouterBridge](https://github.com/arduino-libraries/Arduino_RouterBridge)
- [Grove LIS3DHTR](https://wiki.seeedstudio.com/Grove-3-Axis-Digital-Accelerometer-LIS3DHTR/)
- [Grove ADXL345](https://wiki.seeedstudio.com/Grove-3-Axis_Digital_Accelerometer-16g/)
- [Grove MMA7660FC](https://wiki.seeedstudio.com/Grove-3-Axis_Digital_Accelerometer-1.5g/)
- [MMA7660FC datasheet](https://www.nxp.com/docs/en/data-sheet/MMA7660FC.pdf)
- [One Euro filter original authors](https://gery.casiez.net/1euro/)
- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [HTML native picker behavior](https://html.spec.whatwg.org/multipage/input.html#dom-input-showpicker)

## Gates to close

| Question | Owner | Evidence |
| --- | --- | --- |
| Exact sensor | Dev | Chip photo and matching datasheet |
| Supply, bus, address, actual rate | Dev/Person 4 | Wiring record and fresh-sample capture |
| Installed bridge API and data route | Dev | Tested MCU/Linux round trip and browser endpoint |
| Production extension bundling | Person 3 | Load-unpacked run with packaged assets |
| Actual network permissions/policy | Dev/Person 3 | Tested handshake on judging laptop |
| Motor availability and settling | Dev/Person 4 | Driver record, pulse capture, artifact rejection |
| Usability and assistance benefit | Kripa/Person 4 | Actual task results and voluntary feedback |

Do not claim unverified SDK compatibility, medical sensitivity, broad site coverage, or a measured win probability.
