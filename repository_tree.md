# Full proposed repository tree

Owner markers: **[1] Dev**, **[2] Kripa**, **[3] Person 3**, **[4] Person 4**, **[all] team agreement**.

This package already contains the Markdown instructions shown below. Code, configuration, generated assets, datasets, and test files in this tree are **planned**, not implemented. Create them stage by stage. `dist/`, `.venv/`, raw captures, and generated evidence should not be blindly committed.

```text
steadyhand/
  README.md                                      [all] project entry point
  AGENTS.md                                      [all] coding rules
  plan.md                                        [all] authoritative plan
  package.json                                   [1] workspace scripts
  pnpm-workspace.yaml                            [1] apps/* and packages/*
  pnpm-lock.yaml                                 [1] actual tested dependency lock
  tsconfig.base.json                             [1] strict shared TS settings
  .gitignore                                     [1] builds, secrets, environments
  .env.example                                   [1] safe variable names, no token

  docs/
    architecture.md                              [all] runtime decisions
    contracts.md                                 [1] shared interfaces
    repository_tree.md                           [all] this complete tree
    hardware.md                                  [1] actual parts and wiring
    ux.md                                        [2] flows and visual states
    testing.md                                   [4] acceptance and evidence
    demo.md                                      [all] pitch and backup
    workflow.md                                  [all] parallel development
    sources.md                                   [all] primary references

  teams/
    01_dev.md                                    [1] backend/hardware prompts
    02_kripa.md                                  [2] frontend/UI prompts
    03_extension.md                              [3] extension prompts
    04_algorithms.md                             [4] numerical/evidence prompts
  prompts/
    global.md                                    [all] shared kickoff prompt
    integration.md                               [all] bounded integration prompt

  apps/
    dashboard/                                   [2]
      README.md
      package.json
      tsconfig.json
      vite.config.ts
      index.html
      src/
        main.tsx
        App.tsx
        routes/
          SetupPage.tsx
          CalibrationPage.tsx
          DevicePage.tsx
          ResultsPage.tsx
        components/
          ConnectionCard.tsx
          CalibrationSteps.tsx
          SignalPlot.tsx
          SpectrumPlot.tsx
          RecommendationCard.tsx
          ResultsTable.tsx
        clients/
          deviceClient.ts
          mockDeviceClient.ts
        hooks/
          useDeviceState.ts
          useCalibration.ts
        styles/
          dashboard.css
        tests/
          calibrationFlow.test.tsx

    extension/                                   [3] except the two UI folders
      README.md
      package.json                               [3]
      tsconfig.json                              [3]
      manifest.json                              [3]
      popup.html                                 [3]
      options.html                               [3]
      build.mjs                                  [3] production bundling/copy
      assets/                                    [2] visual assets; [3] manifest wiring
        icon-16.png
        icon-48.png
        icon-128.png
      src/
        entrypoints/                             [3]
          popup.tsx
          options.tsx
        popup/                                   [2] exclusive Kripa ownership
          index.tsx
          PopupApp.tsx
          popup.css
        options/                                 [2] exclusive Kripa ownership
          index.tsx
          OptionsApp.tsx
          options.css
        background/                              [3]
          serviceWorker.ts
          injection.ts
          settingsStore.ts
          deviceTransport.ts
          messageRouter.ts
          tabSessions.ts
        content/                                 [3]
          index.ts
          runtime.ts
          pointerInput.ts
          syntheticInput.ts                      optional labeled developer test
          geometry.ts
          discovery.ts
          activation.ts
          policy.ts
          metrics.ts
          cleanup.ts
        overlay/                                 [3]
          mount.ts
          renderPointer.ts
          renderTarget.ts
          statusStrip.ts
          overlay.css
        adapters/                                [3]
          popupAdapter.ts
          optionsAdapter.ts
        testing/                                 [3]
          debugSnapshot.ts
      dist/                                      generated unpacked extension
        manifest.json
        worker.js
        content.js
        popup.html
        popup.js
        options.html
        options.js
        assets/

    fixtures/                                    [4] independent ordinary webpages
      README.md
      package.json
      service-registration.html
      course-enrollment.html
      dynamic-controls.html
      unsupported-controls.html
      fixture.css
      fixture.js
      benchmark.js

  packages/
    contracts/                                   [1]
      README.md
      package.json
      tsconfig.json
      src/
        index.ts
        settings.ts
        device.ts
        messages.ts
        schemas.ts
        uiAdapter.ts
      examples/
        settings.json
        device-hello.json
        sensor-batch.json
        motion-frame.json
        invalid-frame.json

    ui/                                          [2]
      README.md
      package.json
      tsconfig.json
      src/
        index.ts
        tokens.css
        Button.tsx
        Toggle.tsx
        Slider.tsx
        StatusBadge.tsx
        SourceBadge.tsx
        AssistanceControls.tsx
        EmptyState.tsx

    engine/                                      [4] no DOM or Chrome dependencies
      README.md
      package.json
      tsconfig.json
      src/
        index.ts
        types.ts
        filters/
          exponential.ts
          oneEuro.ts
        targeting/
          distance.ts
          arbitration.ts
          hysteresis.ts
        dwell/
          stateMachine.ts
        engine.ts

  services/
    bridge/                                      [1]
      README.md
      pyproject.toml
      src/steadyhand_bridge/
        __init__.py
        main.py
        config.py
        models.py
        auth.py
        adapters/
          base.py
          mock.py
          replay.py
          uno_q.py
        pipeline/
          acquisition.py
          buffers.py
          analysis_runner.py
          calibration.py
          haptic_supervisor.py
        api/
          health.py
          device.py
          calibration.py
          haptics.py
          sessions.py
          stream.py
        sessions/
          store.py
          export.py
      tests/
        test_protocol.py
        test_stream_reconnect.py
        test_haptic_dedup.py

  firmware/
    unoq/                                        [1]
      README.md
      build-record.md
      steadyhand/
        steadyhand.ino
        sensor_driver.h
        sensor_driver.cpp
        sample_queue.h
        sample_queue.cpp
        bridge_rpc.h
        bridge_rpc.cpp
        haptic_control.h
        haptic_control.cpp

  analysis/                                      [4]
    README.md
    pyproject.toml
    src/steadyhand_signal/
      __init__.py
      models.py
      quality.py
      resampling.py
      calibration.py
      spectrum.py
      features.py
      motion_state.py
      pipeline.py
      fixtures.py

  fixtures/                                      [4] labeled, reproducible data
    metadata.schema.json
    synthetic/
      quiet.json
      periodic-5hz.json
      periodic-8hz.json
      mixed-motion.json
      gaps-and-reboot.json
    recorded/
      README.md                                  capture/consent instructions

  tests/
    extension/                                   [3]
      activation.spec.ts
      cleanup.spec.ts
      geometry.spec.ts
      worker-restart.spec.ts
    engine/                                      [4]
      filter.test.ts
      targeting.test.ts
      dwell.test.ts
    analysis/                                    [4]
      test_quality.py
      test_spectrum.py
      test_haptic_blanking.py

  design/                                        [2]
    README.md
    tokens.md
    screen-states.md
  evidence/                                      [4] all owners contribute results
    README.md
    benchmark-summary.json
    filter-response.png
    sensor-quality.png
    compatibility.md
    wiring-photo.jpg
    demo-backup.mp4
  scripts/                                       [1]
    dev-service.sh
    build-extension.sh
    check-contracts.py
    package-demo.sh
```

## Folder boundaries that need special care

- Kripa owns extension `src/popup/` and `src/options/`; Person 3 owns their HTML entry points, mounting adapters, manifest, and build. Neither regenerates the other's files.
- Person 4 owns numerical source; Dev owns the service loop that calls it. Dependencies declared inside `analysis/pyproject.toml` belong to Person 4; root setup scripts belong to Dev.
- Shared schemas belong to Dev but are agreed by all four. No alternative schema belongs in a UI folder.
- Icons are optional polish. Use simple valid placeholders until Kripa supplies actual assets. Do not claim this documentation pack contains those PNGs.
- `fixtures/recorded/README.md`, `firmware/unoq/build-record.md`, `design/README.md`, and `evidence/README.md` are included instructions. Their future data/assets are not included.

## Dependency map

| Consumer | Imports | Allowed dependency direction |
| --- | --- | --- |
| Dashboard | contracts, UI | Does not import worker/content code |
| Popup/options | contracts, UI, injected UI adapter | Does not own transport implementation |
| Extension content | contracts, engine | No React required in pointer loop |
| Extension worker | contracts | No DOM or numerical sampling loop |
| Engine | contracts/types or local pure types | No app import |
| Python service | analysis library | Analysis cannot import server |
| Firmware | verified sensor and bridge libraries | No browser concerns |

Keep this direction intact. Cyclic imports will slow parallel development and complicate bundling.
