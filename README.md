# react-live2d

A composable React component library for rendering Live2D Cubism 4 models in the browser using WebGL2.

## Features

- Cubism SDK initialization and lifecycle management
- WebGL2 rendering with hardware-accelerated compositing
- Model loading from `.model3.json` URLs or `.zip` archives
- Eye blink, breathing, physics, lip sync, and head/body tracking
- Expression and motion playback
- Click-based hit zone detection
- Multiple models on a single canvas

## Prerequisites

The Live2D Cubism Core is a closed-source binary that **must be loaded before rendering any model**. Add it to your `index.html`:

```html
<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
```

Or load it dynamically in React and gate rendering until it's ready:

```tsx
const [cubismReady, setCubismReady] = useState(false);

useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
  script.onload = () => setCubismReady(true);
  document.body.appendChild(script);
}, []);

if (!cubismReady) return null;
```

## Installation

```bash
npm install react-live2d
# or
pnpm add react-live2d
```

**Peer dependencies** (must be installed in your project):

```bash
npm install react react-dom
```

## Quick Start

```tsx
import { Live2DRunner, Live2DCanvas, Live2DModel, Live2DCanvasContext, useTicker } from 'react-live2d';
import { useEffect, useRef } from 'react';

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
        <div ref={containerRef} style={{ width: '400px', height: '600px', position: 'relative' }}>
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

          <Live2DModel modelJsonPath="/models/Haru/Haru.model3.json" />
        </div>
      </Live2DCanvas>
    </Live2DRunner>
  );
};
```

## Component Hierarchy

Components must be nested in this exact order:

```
<Live2DRunner ticker={ticker}>
  └─ <Live2DCanvas>
      └─ <canvas ref={setCanvas} />     ← actual DOM element
      └─ <Live2DModel modelJsonPath>
          └─ {children}                 ← access motionManager via useLive2DModelContext
```

## Loading Models

### From a URL

```tsx
<Live2DModel modelJsonPath="https://example.com/models/model.model3.json" />
```

### From a ZIP archive

```tsx
<Live2DModel modelZipPath="/models/Haru.zip" />
```

The ZIP must contain exactly one `.model3.json` file. All assets (textures, motions, expressions) must be present in the archive with paths relative to the `.model3.json`.

### Load and error callbacks

```tsx
<Live2DModel
  modelJsonPath="/models/Haru/Haru.model3.json"
  onLoad={() => console.log('Model ready')}
  onError={(err) => console.error('Failed to load:', err)}
/>
```

## Controlling a Model

Access the motion manager inside any child of `<Live2DModel>` via the `useLive2DModelContext` hook:

```tsx
import { useLive2DModelContext } from 'react-live2d';

const ModelControls = () => {
  const { motionManager } = useLive2DModelContext();

  // motionManager is undefined until the model finishes loading
  if (!motionManager) return null;

  return (
    <div>
      <button onClick={() => motionManager.setExpression('smile')}>Smile</button>
      <button onClick={() => motionManager.setMotion('TapBody', 0)}>Wave</button>
    </div>
  );
};

// Usage:
<Live2DModel modelJsonPath="...">
  <ModelControls />
</Live2DModel>
```

### Eye and body tracking

```tsx
// Make eyes follow the mouse
window.addEventListener('mousemove', (e) => {
  motionManager.setLookTarget(e.clientX, e.clientY, 5);
  motionManager.setBodyOrientationTarget(e.clientX, e.clientY, 3);
});
```

### Lip sync

```tsx
// From a URL (WAV or MP3)
await motionManager.startLipSyncFromFile('/audio/speech.mp3');

// Manual control (0 = closed, 1 = fully open)
motionManager.setLipValue(0.8);
```

### Scale and position

```tsx
// Via props
<Live2DModel modelJsonPath="..." scale={1.5} positionX={0} positionY={-0.2} />

// Or at runtime
motionManager.setScale(1.5);
motionManager.setPosition(0, -0.2); // NDC units: ±1 = half canvas
```

### Hit zones

```tsx
<Live2DModel
  modelJsonPath="..."
  onHitZone={({ hitAreas }) => {
    if (hitAreas.includes('Head')) motionManager.setExpression('surprised');
  }}
/>
```

## Live2DModel Props

| Prop | Type | Description |
|---|---|---|
| `modelJsonPath` | `string` | URL to the `.model3.json` file. Required unless `modelZipPath` is set. |
| `modelZipPath` | `string` | URL to a `.zip` archive containing the model. Required unless `modelJsonPath` is set. |
| `scale` | `number` | Uniform scale multiplier. Default: `1.0`. |
| `positionX` | `number` | Horizontal offset in NDC units (±1 = half canvas width). Default: `0`. |
| `positionY` | `number` | Vertical offset in NDC units (±1 = half canvas height, +Y = up). Default: `0`. |
| `onHitZone` | `(event: HitZoneEvent) => void` | Called when the user clicks a defined hit area. |
| `showHitAreas` | `boolean` | Draw debug outlines for hit areas. Default: `false`. |
| `onLoad` | `() => void` | Called when the model finishes loading. |
| `onError` | `(error: Error) => void` | Called if loading fails. |

## Motion Manager API

Accessible via `useLive2DModelContext().motionManager`:

```ts
// Expressions
motionManager.getExpressionsList(): string[]
motionManager.setExpression(name: string): void

// Motions
motionManager.getMotionGroups(): ReadonlyMap<string, number>
motionManager.setMotion(group: string, id: number, priority?: number): void
motionManager.setMotionWithSound(group: string, id: number, priority?: number): void

// Look target (absolute page coordinates)
motionManager.setLookTarget(x: number, y: number, speedPerS?: number): void
motionManager.setBodyOrientationTarget(x: number, y: number, speedPerS?: number): void

// Lip sync
motionManager.startLipSyncFromFile(url: string): Promise<void>
motionManager.startLipSyncFromBuffer(buffer: ArrayBuffer): Promise<void>
motionManager.setLipValue(value: number, speedPerS?: number): void
motionManager.stopLipSync(): void
motionManager.isSpeaking(): boolean

// Scale & position (NDC units)
motionManager.setScale(scale: number): void
motionManager.setPosition(x: number, y: number): void

// Hit zones
motionManager.getHitAreaNames(): string[]
motionManager.hitTest(pageX: number, pageY: number): string[]
motionManager.setShowHitAreas(show: boolean): void
```

## Cross-Origin Models

When loading from an external URL, the server must include CORS headers (`Access-Control-Allow-Origin`). Without them the fetch fails and `onError` is called.

---

## Examples

The repository includes a runnable example app (`examples/`) with two demos:

- **Model Viewer** — load any model by name or URL, adjust scale/position, trigger expressions and motions, toggle hit area debug overlays
- **Lip Sync Demo** — upload a WAV/MP3 file to drive mouth sync from audio amplitude, trigger motion sounds, or manually control mouth openness via a slider

To run the examples locally, see [Development](#development) below.

---

## Development

```bash
git submodule update --init --recursive
pnpm install
pnpm run setup       # Adds ts-nocheck pragmas to CubismWebFramework sources
pnpm run dev:examples  # Example app dev server
```

Other useful commands:

```bash
pnpm run build         # Build library to dist/
pnpm run test          # Jest tests
pnpm run lint:types    # TypeScript type check
pnpm run lint:code     # ESLint
pnpm start:docs        # Storybook on port 6006
```
