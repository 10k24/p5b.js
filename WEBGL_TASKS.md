# WebGL / Shader Tasks for p5b v2.0.0

WebGL and shader support was prototyped in `p5b-hotfix/` on the old monolithic architecture.
Re-implement each item below in the current split architecture (`p5b-base.js`, `p5b-dom.js`).

> Note: hotfix WebGL was accidentally v2-only — verify each item works for both v1 and v2.

---

## 1. `p5b-dom.js` — canvas `parentElement` property

`RendererGL` calls `this.canvas.parentElement.insertBefore(...)` during init. Without this, WebGL mode crashes.

```diff
+            // parentElement mirrors parentNode so RendererGL's textCanvas insertion
+            // (this.canvas.parentElement.insertBefore) always has a valid target.
+            Object.defineProperty(c, "parentElement", {
+                get: () => c.parentNode,
+                configurable: true,
+            });
```

Also update `detachedParent` to include `insertBefore`:

```diff
-        const detachedParent = { removeChild: noop, appendChild: noop };
+        const detachedParent = { removeChild: noop, appendChild: noop, insertBefore: noop };
```

And `document.body.insertBefore`:

```diff
+                insertBefore: (el, _ref) => { bodyChildren.push(el); if (el && typeof el === "object") { el.parentNode = document.body; el.parentElement = document.body; } return el; },
```

---

## 2. `p5b-dom.js` — WebGL context via `headless-gl`

`canvas` package only provides 2D contexts. Intercept `getContext` to route WebGL requests to `headless-gl`.

```diff
+            // Intercept WebGL context requests and satisfy them with headless-gl.
+            // The `canvas` package only provides 2D contexts; headless-gl provides
+            // real WebGL 1/2 via native bindings so p5.js WEBGL mode works headlessly.
+            const origGetContext = c.getContext.bind(c);
+            c.getContext = (type, attrs) => {
+                // headless-gl only supports WebGL 1. Return null for webgl2
+                // so p5.js falls back to requesting webgl (WebGL 1).
+                if (type === "webgl2") return null;
+                if (type === "webgl" || type === "webgl-strict") {
+                    if (!c._glCtx) {
+                        const gl = require("gl");
+                        c._glCtx = gl(c.width, c.height, { preserveDrawingBuffer: true });
+                    }
+                    return c._glCtx;
+                }
+                return origGetContext(type, attrs);
+            };
```

New dependency: `gl` (headless-gl).

---

## 3. `p5b-dom.js` — canvas width/height resize drawingbuffer

When p5 resizes the canvas (e.g. `createCanvas(w, h, WEBGL)`), the headless-gl drawingbuffer must be resized via the `STACKGL_resize_drawingbuffer` extension.

```diff
+            // Intercept canvas width/height writes so that when p5.js resizes the
+            // canvas (e.g. after createCanvas(w, h, WEBGL)), the headless-gl
+            // drawingbuffer is resized to match via the STACKGL extension.
+            let _w = c.width, _h = c.height;
+            Object.defineProperty(c, "width", {
+                get: () => _w,
+                set: (v) => {
+                    _w = v;
+                    // Resize underlying node-canvas buffer too
+                    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "width");
+                    if (desc && desc.set) desc.set.call(c, v);
+                    if (c._glCtx) {
+                        const ext = c._glCtx.getExtension("STACKGL_resize_drawingbuffer");
+                        if (ext) ext.resize(_w, _h);
+                    }
+                },
+                configurable: true,
+            });
+            Object.defineProperty(c, "height", {
+                get: () => _h,
+                set: (v) => {
+                    _h = v;
+                    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(c), "height");
+                    if (desc && desc.set) desc.set.call(c, v);
+                    if (c._glCtx) {
+                        const ext = c._glCtx.getExtension("STACKGL_resize_drawingbuffer");
+                        if (ext) ext.resize(_w, _h);
+                    }
+                },
+                configurable: true,
+            });
```

---

## 4. `p5b-dom.js` — `window` Proxy for shader hooks

p5.js shaders inject hook functions via `window[name] = fn`. Wrap `win` in a Proxy to forward unknown property writes to Node.js `global` so hook names are accessible as bare identifiers inside `modify()`.

Replace:
```diff
-        global.window = win;
+        const knownWinKeys = new Set(Object.keys(win));
+        global.window = new Proxy(win, {
+            set(target, key, value) {
+                target[key] = value;
+                // Forward non-window-specific properties to Node.js global so
+                // shader hook names are accessible as unqualified identifiers.
+                if (!knownWinKeys.has(key)) global[key] = value;
+                return true;
+            },
+            get(target, key) {
+                if (key in target) return target[key];
+                return global[key];
+            },
+        });
```

---

## 5. `p5b-dom.js` — `document.fonts` API

Required by p5 v2 font loading in WebGL mode.

```diff
+            fonts: { add: noop, ready: Promise.resolve(), values: () => [][Symbol.iterator]() },
```

> Note: currently only in hotfix. Already has `scripts: []` in dev-2.0 for FES — keep both.

---

## 6. `p5b-base.js` — `toFrame()` WebGL read path

WebGL canvas pixels can't be read via `drawImage`. Detect `isP3D`, use `loadPixels()` + `putImageData` to copy into a temporary 2D canvas, then proceed with normal scale/blit.

Also remove the existing WEBGL throw in `_validateConfig` — WebGL is now supported.

```diff
     toFrame() {
         const srcCanvas = this._myP5?.canvas;
         if (!srcCanvas) {
             throw new Error("Canvas not initialized. Call run() first.");
         }

         const srcW = srcCanvas.width;
         const srcH = srcCanvas.height;
+        const isP3D = Boolean(this._myP5._renderer?.isP3D);

-        // Happy path: canvas dimensions match p5b config — skip drawImage blit.
+        // Happy path: canvas dimensions match p5b config — return RGBA pixels directly.
+        // node-canvas getImageData() (used by loadPixels) and p5 WebGL loadPixels both return RGBA.
         if (srcW === this.width && srcH === this.height) {
             this._myP5.loadPixels();
             return new Uint8Array(this._myP5.pixels.buffer);
         }

+        // WebGL canvas can't be passed to drawImage directly; read pixels via loadPixels
+        // and copy into a temporary 2D canvas. 2D canvas can be used as-is.
+        let srcDrawable;
+        if (isP3D) {
+            this._myP5.loadPixels();
+            srcDrawable = canvas.createCanvas(srcW, srcH);
+            srcDrawable.getContext("2d").putImageData(
+                new canvas.ImageData(new Uint8ClampedArray(this._myP5.pixels.buffer), srcW, srcH),
+                0, 0
+            );
+        } else {
+            srcDrawable = srcCanvas;
+        }

         if (!this._destCanvas || ...) {
             this._destCanvas = canvas.createCanvas(this.width, this.height);
         }
         const ctx = this._destCanvas.getContext("2d");
         ctx.clearRect(...);
-        ctx.drawImage(srcCanvas, ...);
+        ctx.drawImage(srcDrawable, 0, 0, srcW, srcH, 0, 0, this.width, this.height);
         return reorderBuffer(this._destCanvas.toBuffer("raw"));
     }
```

---

## 7. `patches/gifenc@1.0.3.patch` — fix `ERR_PACKAGE_PATH_NOT_EXPORTED`

p5-v2 transitively depends on `gifenc` which lacks an `exports` field. Causes `ERR_PACKAGE_PATH_NOT_EXPORTED` when `build-readme.js` runs under p5-v2.

Create `patches/gifenc@1.0.3.patch`:

```patch
diff --git a/package.json b/package.json
index 228d927a5ce8c7f86ef26a04313fa7a263e8f228..d8f7f25a6d589bf0ec054e3b09c6ac02de90a757 100644
--- a/package.json
+++ b/package.json
@@ -8,6 +8,12 @@
   "unpkg": "./dist/gifenc.esm.js",
   "jsdelivr": "./dist/gifenc.esm.js",
   "module": "./dist/gifenc.esm.js",
+  "exports": {
+    ".": {
+      "import": "./dist/gifenc.esm.js",
+      "require": "./dist/gifenc.js"
+    }
+  },
   "license": "MIT",
```

Add to `package.json` `scripts` (bun supports patchedDependencies natively):

---

## 8. Memory leak — headless-gl WebGL mode

**Symptom:** Node process balloons >600MB rapidly when running a WEBGL sketch with shaders (`sketch-earthday.js` with `baseMaterialShader().modify(...)`).

**Suspected cause:** headless-gl doesn't release GPU/CPU buffers between frames — likely shader objects, textures, or framebuffers accumulating without cleanup.

**Investigate:**
- GL resource lifecycle in `toFrame()` — are textures/framebuffers being freed?
- p5's WebGL renderer cleanup path — does `remove()` properly destroy GL resources?
- Explicit `gl.deleteTexture`, `gl.deleteFramebuffer` calls may be needed
- Consider pooling or capping GL object counts

Add to `package.json`:

```json
"patchedDependencies": {
    "gifenc@1.0.3": "patches/gifenc@1.0.3.patch"
}
```
