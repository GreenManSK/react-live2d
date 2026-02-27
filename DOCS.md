# react-live2d Documentation

A composable React component library for rendering Live2D Cubism 4 models in the browser using WebGL2.

---

## Table of Contents

- [Overview](#overview)
- [Installation & Setup](#installation--setup)
- [Component Hierarchy](#component-hierarchy)
- [Components](#components)
  - [Live2DRunner](#live2drunner)
  - [Live2DCanvas](#live2dcanvas)
  - [Live2DModel](#live2dmodel)
- [Hooks](#hooks)
  - [useTicker](#useticker)
  - [useLive2DModelContext](#uselive2dmodelcontext)
  - [useLive2DCanvasContext](#uselive2dcanvascontext)
- [Motion Manager API](#motion-manager-api)
- [Complete Usage Example](#complete-usage-example)
- [Architecture](#architecture)

---

## Overview

`react-live2d` wraps the Live2D Cubism 4 SDK (via CubismWebFramework) in idiomatic React components. The library handles:

- Cubism SDK initialization and lifecycle
- WebGL2 rendering context management
- Model loading (geometry, textures, physics, poses, expressions, motions)
- Animation loop via `requestAnimationFrame`
- Eye blink, breathing, lip sync, and head/body tracking

---

## Installation & Setup

```bash
cd react-live2d
pnpm install
pnpm run setup   # Downloads the Cubism 4 core libraries
```

To start the dev server for the example app:

```bash
pnpm run dev:examples
```

---

## Component Hierarchy

Components must be nested in this exact order:

```
<Live2DRunner ticker={ticker}>
  └─ <Live2DCanvas>
      └─ <canvas ref={setCanvas} />   ← actual DOM element, registered via context
      └─ <Live2DModel modelJsonPath="...">
          └─ {children}               ← access motionManager here via useLive2DModelContext
```

- `Live2DRunner` initializes the Cubism SDK and drives the `requestAnimationFrame` loop.
- `Live2DCanvas` manages the WebGL2 context and renders all models registered to it.
- `<canvas>` is a plain DOM element — its ref must be passed to the canvas context via `setCanvas`.
- `Live2DModel` loads a model from a `.model3.json` file and registers it with the canvas for rendering.

---

## Components

### Live2DRunner

Initializes the Cubism framework and runs the render loop. Must be the outermost Live2D component.

```tsx
import { Live2DRunner, useTicker } from 'react-live2d';

const ticker = useTicker();

<Live2DRunner ticker={ticker}>
  {/* Live2DCanvas goes here */}
</Live2DRunner>
```

**Props**

| Prop | Type | Required | Description |
|---|---|---|---|
| `ticker` | `ITicker` | Yes | Ticker instance used to calculate delta time per frame. Use the `useTicker` hook. |
| `cubismOptions` | `CubismOption` | No | Custom Cubism SDK options (logging level, log function, etc.). Defaults to verbose logging. |

**Behavior**

- Calls `CubismFramework.startUp()` and `CubismFramework.initialize()` on mount (once per page load — the framework is a singleton).
- Starts a `requestAnimationFrame` loop that calls `ticker.updateTime()` and then renders every registered canvas.

---

### Live2DCanvas

Creates and manages a WebGL2 rendering context. Provides context to child components for registering the canvas element and models.

```tsx
import { Live2DCanvas, Live2DCanvasContext } from 'react-live2d';

<Live2DCanvas>
  <Live2DCanvasContext.Consumer>
    {({ setCanvas }) => (
      <canvas ref={(el) => setCanvas(el)} />
    )}
  </Live2DCanvasContext.Consumer>

  {/* Live2DModel goes here */}
</Live2DCanvas>
```

**Props**

None. Accepts `children` only.

**Behavior**

- Waits for a `<canvas>` element to be registered via `setCanvas` before creating the WebGL2 context.
- Creates a `Live2DCanvasManager` internally to handle projection matrices and shader programs.
- Registers itself with the parent `Live2DRunner` so it is included in the render loop.
- Cleans up (disposes textures and shaders) on unmount.

**Canvas sizing**

The `<canvas>` element's `width` and `height` attributes control the render resolution. You are responsible for setting them — a `ResizeObserver` is the recommended approach:

```tsx
const containerRef = useRef<HTMLDivElement>(null);
const canvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  const observer = new ResizeObserver(() => {
    if (containerRef.current && canvasRef.current) {
      canvasRef.current.width = containerRef.current.offsetWidth;
      canvasRef.current.height = containerRef.current.offsetHeight;
    }
  });
  if (containerRef.current) observer.observe(containerRef.current);
  return () => observer.disconnect();
}, []);
```

---

### Live2DModel

Loads a Live2D model and registers it for rendering on the parent canvas. Accepts either a `.model3.json` URL or a `.zip` archive URL.

```tsx
import { Live2DModel } from 'react-live2d';

// Load from a .model3.json file
<Live2DModel modelJsonPath="/models/Haru/Haru.model3.json">
  {/* Access motionManager here */}
</Live2DModel>

// Load from a ZIP archive
<Live2DModel modelZipPath="/models/Haru.zip">
  {/* Access motionManager here */}
</Live2DModel>
```

**Props**

| Prop | Type | Required | Description |
|---|---|---|---|
| `modelJsonPath` | `string` | One of | URL or path to the `.model3.json` settings file. Supports relative paths and absolute URLs. Required unless `modelZipPath` is provided. |
| `modelZipPath` | `string` | One of | URL or path to a `.zip` archive containing the model and all its assets. Required unless `modelJsonPath` is provided. |
| `scale` | `number` | No | Uniform scale multiplier. `1.0` = default size, `2.0` = double size. Default: `1.0`. |
| `positionX` | `number` | No | Horizontal offset in NDC units (±1 = half canvas width). `0` = centered. Default: `0`. |
| `positionY` | `number` | No | Vertical offset in NDC units (±1 = half canvas height, +Y = up). `0` = centered. Default: `0`. |
| `onHitZone` | `(event: HitZoneEvent) => void` | No | Called when the user clicks a hit area on the model. When omitted, hit zone detection is disabled. |
| `showHitAreas` | `boolean` | No | Draw cyan bounding-box outlines for all defined hit areas on the canvas. Useful for debugging. Default: `false`. |
| `onLoad` | `() => void` | No | Called once the model has fully loaded and is ready to render. |
| `onError` | `(error: Error) => void` | No | Called if loading the model fails (network error, CORS, invalid file, etc.). |

**ZIP archive format**

A ZIP file loaded via `modelZipPath` must contain exactly one `.model3.json` file. All other model assets (geometry, textures, motions, expressions, etc.) must be present in the archive with paths relative to that `.model3.json`. Both flat layouts and subdirectory layouts are supported:

```
# Flat layout (model3.json at root)
Haru.zip/
  Haru.model3.json
  Haru.model3
  Haru.2048/
    texture_00.png
  motions/
    Haru_m01.motion3.json
  expressions/
    f01.exp3.json

# Subdirectory layout (model3.json inside a folder)
Haru.zip/
  Haru/
    Haru.model3.json
    Haru.model3
    ...
```

All assets referenced in the `.model3.json` are resolved relative to its directory within the archive. Motion sound files bundled in the ZIP will also play correctly.

> **Note**: ZIP files are fully extracted in memory using `fflate`. Individual assets are served via object blob URLs, which are revoked automatically when the model is unmounted.

**`HitZoneEvent`**

```ts
type HitZoneEvent = {
  hitAreas: string[];           // names of all hit areas that contain the click point
  originalEvent: MouseEvent;    // the underlying DOM click event
  preventDefault: () => void;   // stops the click event from propagating
};
```

Hit areas are defined in the model's `.model3.json` file under the `HitAreas` key:

```json
"HitAreas": [
  { "Id": "HitAreaHead", "Name": "Head" },
  { "Id": "HitAreaBody", "Name": "Body" }
]
```

Use `motionManager.getHitAreaNames()` to query which hit areas a model defines at runtime.

**Behavior**

- When `modelJsonPath` is provided: fetches and parses the `.model3.json` file. Both relative paths (`./models/Haru/Haru.model3.json`) and absolute URLs (`https://example.com/model/model.model3.json`) are supported. All linked assets are resolved relative to the `.model3.json` URL.
- When `modelZipPath` is provided: fetches and decompresses the ZIP archive entirely in memory, locates the `.model3.json`, then loads all model assets directly from the extracted data. No server-side extraction is required.
- Sequentially loads: model geometry, expressions, physics, pose, user data, eye blink setup, breath setup, lip sync setup, layout, motions, and textures.
- Calls `onLoad` once the model finishes loading, or `onError` if any step in the critical loading path fails.
- Once fully loaded, registers the model with `Live2DCanvas` for rendering.
- Provides a `motionManager` via `Live2DModelContext` to child components.
- Removes the model from the canvas on unmount. Blob URLs created for ZIP assets are revoked at this point.

> **Cross-Origin (CORS)**: When loading from an external URL (JSON or ZIP), the server must include appropriate CORS headers (`Access-Control-Allow-Origin`). Without them, the fetch will fail and `onError` will be called.

**Multiple models**

Multiple `Live2DModel` components can be rendered on the same canvas simultaneously. Models can be loaded from different sources:

```tsx
<Live2DCanvas>
  <canvas ref={...} />
  <Live2DModel modelJsonPath="/models/Haru/Haru.model3.json" />
  <Live2DModel modelZipPath="/models/Hiyori.zip" />
</Live2DCanvas>
```

---

## Hooks

### useTicker

Creates a ticker object that tracks elapsed time between frames. Pass it to `Live2DRunner`.

```tsx
import { useTicker } from 'react-live2d';

const MyApp = () => {
  const ticker = useTicker();

  return (
    <Live2DRunner ticker={ticker}>
      ...
    </Live2DRunner>
  );
};
```

**Returns** `ITicker`

| Method | Returns | Description |
|---|---|---|
| `updateTime()` | `void` | Records the current timestamp. Called once per frame by `Live2DRunner`. |
| `getDeltaTime()` | `number` | Returns milliseconds elapsed since the last `updateTime()` call. |

The ticker instance is stable (memoized) and will not cause re-renders.

---

### useLive2DModelContext

Access the motion manager for the nearest parent `Live2DModel`. Use this inside children of `<Live2DModel>` to control the model.

```tsx
import { useLive2DModelContext } from 'react-live2d';

const ModelControls = () => {
  const { motionManager } = useLive2DModelContext();

  if (!motionManager) return null; // model not yet loaded

  return (
    <button onClick={() => motionManager.setExpression('smile')}>
      Smile
    </button>
  );
};
```

**Returns** `{ motionManager?: Live2DModelMotionManager }`

`motionManager` is `undefined` until the model finishes loading. Always guard against it being undefined before use.

---

### useLive2DCanvasContext

Access the canvas context. Primarily used to register the `<canvas>` DOM element and to interact with models at a lower level.

```tsx
import { useLive2DCanvasContext } from 'react-live2d';

const { setCanvas, gl, textureManager } = useLive2DCanvasContext();
```

**Returns** `ILive2DCanvasContext`

| Property | Type | Description |
|---|---|---|
| `setCanvas` | `(canvas: HTMLCanvasElement \| null) => void` | Registers the DOM canvas element with the WebGL context. Call this as the canvas `ref`. |
| `gl` | `WebGL2RenderingContext \| undefined` | The WebGL2 rendering context. `undefined` until `setCanvas` is called. |
| `textureManager` | `Live2DTextureManager \| undefined` | The texture manager for the canvas. |
| `addModel` | `(model: Live2DModelManager) => void` | Manually add a model to the render list. |
| `removeModel` | `(model: Live2DModelManager) => void` | Remove a model from the render list. |

In most cases you only need `setCanvas` to hook up the `<canvas>` element. The `Live2DCanvasContext.Consumer` pattern is equivalent:

```tsx
<Live2DCanvasContext.Consumer>
  {({ setCanvas }) => <canvas ref={(el) => setCanvas(el)} />}
</Live2DCanvasContext.Consumer>
```

---

## Motion Manager API

`Live2DModelMotionManager` is accessible via `useLive2DModelContext().motionManager`. It is the primary public API for controlling a loaded model at runtime.

### Expressions

```ts
// List all available expression names defined in the model
motionManager.getExpressionsList(): string[]

// Activate a named expression
motionManager.setExpression(name: string): void
```

Expression names come from the `.model3.json` file's `Expressions` array.

### Motions

```ts
// Get all motion groups and how many motions each group contains
motionManager.getMotionGroups(): ReadonlyMap<string, number>

// Play a motion by group name and index
motionManager.setMotion(
  groupName: string,
  id: number,
  priority?: number,                    // default: 2
  onFinishedMotionHandler?: () => void,
  onBeganMotionHandler?: () => void
): void
```

Motion groups (e.g. `"Idle"`, `"TapBody"`) and their indices come from the `.model3.json` file.

### Head Look Target

Controls where the model's eyes look.

```ts
// Set look target using absolute page coordinates (pixels)
motionManager.setLookTarget(x: number, y: number, speedPerS?: number): void

// Set look target using normalized coordinates (-1 to 1, relative to canvas)
motionManager.setLookTargetRelative(x: number, y: number, speedPerS?: number): void
```

`speedPerS` controls interpolation speed (units per second). `0` means instant.

### Body Orientation

Controls the model's body/head tilt direction (separate from eye look).

```ts
// Absolute page coordinates (pixels)
motionManager.setBodyOrientationTarget(x: number, y: number, speedPerS?: number): void

// Normalized coordinates (-1 to 1, relative to canvas)
motionManager.setBodyOrientationTargetRelative(x: number, y: number, speedPerS?: number): void
```

### Lip Sync

Three sources are supported. Audio sources (file or buffer) take priority over manual control; when audio finishes, the manager automatically reverts to the manual value.

#### Audio-driven lip sync

The audio is played through the browser's speakers while its RMS amplitude drives the model's mouth parameter in real time. Supports both WAV and MP3 formats.

```ts
// Load from a URL (WAV or MP3) — fetches, decodes, and plays
motionManager.startLipSyncFromFile(url: string): Promise<void>

// Load from an ArrayBuffer (e.g. user-uploaded file via FileReader)
motionManager.startLipSyncFromBuffer(buffer: ArrayBuffer): Promise<void>

// Stop audio playback and revert to manual control
motionManager.stopLipSync(): void

// Returns true while audio is playing and driving the mouth
motionManager.isSpeaking(): boolean
```

#### Motion sound files

Play a motion and automatically start lip sync from its bundled sound file (if the model defines one in the `.model3.json` `Motions` section):

```ts
motionManager.setMotionWithSound(
  groupName: string,
  id: number,
  priority?: number,                    // default: 2
  onFinishedMotionHandler?: () => void,
  onBeganMotionHandler?: () => void
): void
```

If the motion has no sound file, this behaves identically to `setMotion`.

#### Manual control

```ts
// value: 0.0 (closed) to 1.0 (fully open)
// speedPerS: interpolation speed in units/second, 0 = instant
motionManager.setLipValue(value: number, speedPerS?: number): void
```

The manual value is used when no audio is playing.

### Scale & Position

Control the model's size and position on the canvas at runtime.

```ts
// Uniform scale multiplier. 1.0 = default, 2.0 = double size, 0.5 = half size.
motionManager.setScale(scale: number): void

// Offset the model's position in NDC units.
// x: ±1 = half canvas width (positive = right)
// y: ±1 = half canvas height (positive = up)
motionManager.setPosition(x: number, y: number): void
```

Eye/body tracking (both absolute pixel and relative coordinates) automatically accounts for the model's visual center offset and scale so gaze follows the mouse correctly.

### Hit Zones

Query which hit areas a model defines and manually perform hit tests.

```ts
// List all hit area names defined in the model's .model3.json
motionManager.getHitAreaNames(): string[]

// Hit-test the model at page coordinates (event.clientX + scrollX, event.clientY + scrollY).
// Returns names of all hit areas that contain the point. Empty array if none.
motionManager.hitTest(pageX: number, pageY: number): string[]

// Draw cyan bounding-box outlines for all defined hit areas on the canvas.
motionManager.setShowHitAreas(show: boolean): void
```

Automatic hit zone detection is enabled by passing an `onHitZone` prop to `<Live2DModel>`. See [Live2DModel](#live2dmodel) for the full API.

```tsx
<Live2DModel
  modelJsonPath="/models/Haru/Haru.model3.json"
  onHitZone={({ hitAreas, originalEvent }) => {
    console.log('clicked:', hitAreas); // e.g. ['Head']
    if (hitAreas.includes('Head')) {
      motionManager.setRandomExpression();
    }
  }}
>
  ...
</Live2DModel>
```

---

## Complete Usage Example

```tsx
import { Live2DRunner, Live2DCanvas, Live2DModel, Live2DCanvasContext, useTicker, useLive2DModelContext } from 'react-live2d';
import { useEffect, useRef } from 'react';

const ModelControls = () => {
  const { motionManager } = useLive2DModelContext();

  useEffect(() => {
    if (!motionManager) return;

    // Make eyes follow the mouse
    const handleMouseMove = (e: MouseEvent) => {
      motionManager.setLookTarget(e.clientX, e.clientY, 5);
      motionManager.setBodyOrientationTarget(e.clientX, e.clientY, 3);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [motionManager]);

  if (!motionManager) return <p>Loading...</p>;

  return (
    <div>
      {motionManager.getExpressionsList().map((name) => (
        <button key={name} onClick={() => motionManager.setExpression(name)}>
          {name}
        </button>
      ))}
    </div>
  );
};

const App = () => {
  const ticker = useTicker();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Live2DRunner ticker={ticker}>
      <Live2DCanvas>
        <div ref={containerRef} style={{ width: '100%', height: '100vh', position: 'relative' }}>
          <Live2DCanvasContext.Consumer>
            {({ setCanvas }) => (
              <canvas
                style={{ position: 'absolute' }}
                ref={(el) => {
                  setCanvas(el);
                  canvasRef.current = el;
                }}
              />
            )}
          </Live2DCanvasContext.Consumer>

          <Live2DModel modelJsonPath="/models/Haru/Haru.model3.json" onLoad={() => console.log('loaded')}>
            <ModelControls />
          </Live2DModel>
        </div>
      </Live2DCanvas>
    </Live2DRunner>
  );
};

export default App;
```

---

## Architecture

### Layer overview

```
React layer (src/lib/)
  Live2DRunner       — Cubism SDK lifecycle, rAF loop
  Live2DCanvas       — WebGL2 context, canvas registration
  Live2DModel        — Model loading, context provider

Manager layer (src/lib/cubism/)
  Live2DCanvasManager      — Projection matrices, shader, per-frame render dispatch
  Live2DModelManager       — Loads/renders a single model; owns all Cubism effects
  Live2DModelMotionManager — Public API: expressions, motions, look, body, lip sync
  Live2DLipSyncManager     — Web Audio API analysis; drives mouth parameter from RMS amplitude
  Live2DTextureManager     — Texture fetch, cache, WebGL texture objects
  Live2DCubismUserModel    — Thin wrapper around CubismUserModel from the SDK
```

### Data flow per frame

```
rAF tick
  → ticker.updateTime()
  → Live2DCanvasManager.render(deltaTime)
      → Live2DModelManager.render(deltaTime, viewport, matrices, ...)
          → motionManager.updateMotion()
          → eyeBlink.updateParameters()
          → expressionManager.updateMotion()
          → body orientation interpolation
          → look target interpolation
          → breath.updateParameters()
          → physics.evaluate()
          → lip sync update (Live2DLipSyncManager.update → RMS or manual value)
          → pose.updateParameters()
          → model.update()
          → renderer.drawModel()
```

### Automatic model features

These features are set up automatically when a model is loaded, if the model's `.model3.json` defines the relevant parameters:

| Feature | Description |
|---|---|
| Eye blink | Automatic periodic blinking using the model's eye blink parameters |
| Breathing | Subtle idle animation on head and body angle parameters |
| Physics | Cloth/hair simulation evaluated each frame |
| Pose | Maintains part visibility defined in the pose file |
| Lip sync | Parameter IDs wired up for manual or motion-driven control |
