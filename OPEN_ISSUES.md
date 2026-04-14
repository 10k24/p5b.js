# Open Issues - p5b.js

## Fixed in Recent Updates

The following have been implemented:

- **Math Constants**: PI, TWO_PI, HALF_PI, QUARTER_PI, TAU, DEGREES, RADIANS
- **Math Functions**: abs, ceil, floor, round, pow, sqrt, exp, log, max, min, sin, cos, tan, asin, acos, atan, atan2
- **p5 Math Functions**: sq, mag, fract
- **Shape Constants**: CORNER, CORNERS, RADIUS, CENTER, LEFT, RIGHT, TOP, BOTTOM, BASELINE, etc.
- **Blend Modes**: BLEND, ADD, REMOVE, DARKEST, LIGHTEST, DIFFERENCE, SUBTRACT, etc.
- **Cursor/Input**: ARROW, CROSS, HAND, MOVE, TEXT, WAIT, key codes
- **Typography**: NORMAL, ITALIC, BOLD, BOLDITALIC, CHAR, WORD
- **Other**: AUTO, STROKE, FILL, TEXTURE, NEAREST, REPEAT, CLAMP, etc.

---

## Missing Functionality (vs p5.js v1.x)

This document lists features from p5.js that are not implemented or incomplete in p5b.

---

## High Priority

### Binding global variables (declared outside a function)

e.g.

```js
let hello = "I am undefined in global scope";
function preload() {}
function setup() {}
function draw() {}
```

### Time Functions

| Function | Description |
|----------|-------------|
| `year()` | Current year |
| `month()` | Current month (1-12) |
| `day()` | Current day of month |
| `hour()` | Current hour (0-23) |
| `minute()` | Current minute (0-59) |
| `second()` | Current second (0-59) |

### Environment

| Function/Property | Description |
|-------------------|-------------|
| `frameRate()` | Get current FPS (currently only settable via config) |
| `loop()` | Resume drawing after noLoop() |
| `isLooping()` | Check if draw loop is running |
| `cursor()` | Change cursor appearance |
| `noCursor()` | Hide cursor |

---

## Medium Priority

### Mode/Style Functions (ALL_CAPS constants)

| Function | Constants |
|----------|-----------|
| `imageMode()` | CORNER, CENTER, CORNERS |
| `rectMode()` | CORNER, CORNERS, CENTER, RADIUS |
| `ellipseMode()` | CENTER, CORNER, CORNERS, RADIUS |
| `strokeCap()` | ROUND, SQUARE, PROJECT |
| `strokeJoin()` | MITER, BEVEL, ROUND |
| `textAlign()` | LEFT, CENTER, RIGHT, TOP, BOTTOM, BASELINE |
| `colorMode()` | RGB, HSB, HSL |
| `angleMode()` | DEGREES, RADIANS |
| `blendMode()` | BLEND, ADD, DARKEST, LIGHTEST, MULTIPLY, SCREEN, etc. |

### Typography

| Function | Description |
|----------|-------------|
| `textAlign()` | Text horizontal/vertical alignment |
| `textLeading()` | Line height for text |
| `textStyle()` | NORMAL, BOLD, ITALIC |
| `textWidth()` | Calculate width of text |
| `textWrap()` | WORD, CHAR |

### Data/IO

| Function | Description |
|----------|-------------|
| `loadTable()` | Load CSV/TSV files |
| `saveTable()` | Save to CSV/TSV |
| `loadStrings()` | Load text file as array of lines |

### DOM Functions

| Function | Description |
|----------|-------------|
| `select()` | Find element by selector |
| `selectAll()` | Find all matching elements |
| `createDiv()` | Create div element |
| `createButton()` | Create button element |
| `createSlider()` | Create slider element |
| `createSelect()` | Create dropdown select |
| `createInput()` | Create input field |
| `createFileInput()` | Create file input |

---

## Low Priority

### Environment (Low)

| Function/Property | Description |
|-------------------|-------------|
| `pixelDensity()` | Get/set pixel density |
| `drawingContext` | Direct Canvas 2D API access |
| `windowWidth`, `windowHeight` | Current window dimensions |

---

## Known Unsupported (By Design)

These features require browser APIs and cannot be implemented in a Node.js headless environment:

### Sound (p5.sound)

Full module not implemented. Audio playback requires Web Audio API.

| Missing Functions |
|-------------------|
| `loadSound`, `loadAudio`, `createAudio` |
| `Oscillator`, `p5.AudioIn` |
| `p5.FFT`, `p5.Amplitude`, `p5.PeakDetect` |
| `p5.Delay`, `p5.Reverb`, `p5.Filter` |
| `play`, `pause`, `loop`, `stop`, `jump`, `rate`, `amp` |

### Video/Capture

Requires `getUserMedia` for webcam/microphone access.

| Missing Functions |
|-------------------|
| `createCapture(VIDEO)`, `createCapture(AUDIO)` |
| `createVideo()`, `createAudio()` |

### 3D/WebGL

WEBGL renderer not supported - throws error.

| Missing Functions |
|-------------------|
| `createCanvas(w, h, WEBGL)` |
| `plane`, `box`, `sphere`, `cylinder`, `cone`, `torus` |
| `loadModel`, `model` |
| `ambientLight`, `directionalLight`, `pointLight` |
| `camera`, `orbitControl`, `perspective` |

---

## Low Priority (Internal)

### 1. Graphics Pool State on Reuse

Pooled graphics retain previous state (draw settings, transformations, pixel data) between frames.

**Location:** `p5b.js` - `createGraphics` function around line 261-280

**Fix would require:** Resetting graphics state when pulled from pool.

---

### 2. noLoop() Doesn't Stop Frame Emission

In real p5.js, `noLoop()` stops the draw loop entirely. Here, p5b continues emitting frames via `toFrame()` after every draw execution.

**Location:** `p5b.js` - Draw handling in `_initSketch` around line 144-169

**Fix would require:** Adding a flag to check `p5.prototype._isLooping()` before calling `toFrame()`.

---

### 3. Graphics Pool Unbounded Growth

If a sketch creates graphics of many different sizes, the pool grows indefinitely and never cleans up old entries.

**Location:** `p5b.js` - Pool management in `_initSketch` around line 156-166

**Fix would require:** Adding a maximum pool size or TTL-based cleanup.

---

## Testing Scenarios: p5.js v1.x Globals

This section documents the complete set of p5.js globals that need testing to verify they work in p5b.

### Constants to Test

Create test: `test/integration/globals.test.js`

#### Trigonometry Constants
| Constant | Expected Value | Test |
|-----------|----------------|------|
| `PI` | `Math.PI` | `expect(global.PI).toBe(Math.PI)` |
| `TWO_PI` | `Math.PI * 2` | `expect(global.TWO_PI).toBe(Math.PI * 2)` |
| `HALF_PI` | `Math.PI / 2` | `expect(global.HALF_PI).toBe(Math.PI / 2)` |
| `QUARTER_PI` | `Math.PI / 4` | `expect(global.QUARTER_PI).toBe(Math.PI / 4)` |
| `TAU` | `Math.PI * 2` | `expect(global.TAU).toBe(Math.PI * 2)` |
| `DEGREES` | `'degrees'` | `expect(global.DEGREES).toBe('degrees')` |
| `RADIANS` | `'radians'` | `expect(global.RADIANS).toBe('radians')` |

#### Graphics Renderer Constants
| Constant | Expected Value | Test |
|-----------|----------------|------|
| `P2D` | `'p2d'` | `expect(global.P2D).toBe('p2d')` |
| `WEBGL` | `'webgl'` | `expect(global.WEBGL).toBe('webgl')` |
| `WEBGL2` | `'webgl2'` | `expect(global.WEBGL2).toBe('webgl2')` |

#### Shape/Mode Constants
| Constant | Expected Value |
|-----------|----------------|
| `CORNER`, `CORNERS`, `RADIUS`, `CENTER` |
| `LEFT`, `RIGHT`, `TOP`, `BOTTOM`, `BASELINE` |
| `POINTS`, `LINES`, `LINE_STRIP`, `LINE_LOOP` |
| `TRIANGLES`, `TRIANGLE_FAN`, `TRIANGLE_STRIP` |
| `QUADS`, `QUAD_STRIP`, `TESS` |
| `CLOSE`, `OPEN`, `CHORD`, `PIE` |
| `PROJECT`, `SQUARE`, `ROUND`, `BEVEL`, `MITER` |
| `LINEAR`, `QUADRATIC`, `BEZIER`, `CURVE` |

#### Color Constants
| Constant | Expected Value |
|-----------|----------------|
| `RGB`, `HSB`, `HSL` |
| `THRESHOLD`, `GRAY`, `OPAQUE`, `INVERT`, `POSTERIZE`, `DILATE`, `ERODE`, `BLUR` |

#### Blend Mode Constants
| Constant | Expected Value |
|-----------|----------------|
| `BLEND`, `REMOVE`, `ADD`, `DARKEST`, `LIGHTEST` |
| `DIFFERENCE`, `SUBTRACT`, `EXCLUSION`, `MULTIPLY` |
| `SCREEN`, `REPLACE`, `OVERLAY` |
| `HARD_LIGHT`, `SOFT_LIGHT`, `DODGE`, `BURN` |

#### Cursor/Input Constants
| Constant | Expected Value |
|-----------|----------------|
| `ARROW`, `CROSS`, `HAND`, `MOVE`, `TEXT`, `WAIT` |
| `ALT`, `CONTROL`, `SHIFT`, `OPTION` |
| `BACKSPACE`, `DELETE`, `TAB`, `ENTER`, `RETURN`, `ESCAPE` |
| `UP_ARROW`, `DOWN_ARROW`, `LEFT_ARROW`, `RIGHT_ARROW` |

#### Typography Constants
| Constant | Expected Value |
|-----------|----------------|
| `NORMAL`, `ITALIC`, `BOLD`, `BOLDITALIC` |
| `CHAR`, `WORD` |

#### Other Constants
| Constant | Expected Value |
|-----------|----------------|
| `AUTO` |
| `STROKE`, `FILL`, `TEXTURE`, `IMMEDIATE` |
| `NEAREST`, `REPEAT`, `CLAMP`, `MIRROR` |
| `FLAT`, `SMOOTH` |
| `LANDSCAPE`, `PORTRAIT` |
| `LABEL`, `FALLBACK`, `CONTAIN`, `COVER` |

---

### Math Functions to Test

Test strategy: Check if function exists and/or equals Math equivalent.

| Function | Pass-through Test |
|----------|-------------------|
| `abs` | `global.abs === Math.abs` |
| `ceil` | `global.ceil === Math.ceil` |
| `floor` | `global.floor === Math.floor` |
| `round` | `global.round === Math.round` |
| `pow` | `global.pow === Math.pow` |
| `sqrt` | `global.sqrt === Math.sqrt` |
| `sq` | Check `global.sq(4)` returns `16` |
| `exp` | `global.exp === Math.exp` |
| `log` | `global.log === Math.log` |
| `max` | `global.max === Math.max` |
| `min` | `global.min === Math.min` |
| `mag` | Check `global.mag(3, 4)` returns `5` |
| `fract` | Check `global.fract(1.5)` returns `0.5` |

### Random/Noise Functions

| Function | Test |
|----------|------|
| `random` | Check `global.random()` returns number 0-1 |
| `randomSeed` | Check function exists |
| `randomGaussian` | Check `global.randomGaussian()` returns number |
| `noise` | Check `global.noise(0)` returns 0-1 |
| `noiseSeed` | Check function exists |
| `noiseDetail` | Check function exists |

### Utility Functions

| Function | Test |
|----------|------|
| `map` | Check `global.map(50, 0, 100, 0, 1000)` returns `500` |
| `lerp` | Check `global.lerp(0, 100, 0.5)` returns `50` |
| `lerpColor` | Check function exists |
| `constrain` | Check `global.constrain(150, 0, 100)` returns `100` |
| `dist` | Check `global.dist(0, 0, 3, 4)` returns `5` |

### String Formatting Functions

| Function | Test |
|----------|------|
| `nf` | Check function exists |
| `nfc` | Check function exists |
| `nfp` | Check function exists |
| `nfs` | Check function exists |
| `join` | Check function exists |
| `split` | Check function exists |
| `splitTokens` | Check function exists |
| `trim` | Check function exists |

### Other Functions

| Function | Test |
|----------|------|
| `createVector` | Check function exists and returns p5.Vector |
| `loadBytes` | Check function exists |

---

### Testing Approach

1. Create `test/integration/globals.test.js`
2. Test each constant: `expect(global.XXX).toBeDefined()`
3. For pass-through functions, verify: `global.func === Math.func`
4. For working functions, verify behavior with actual calls
5. Categorize results: Working / Missing / Needs Fix