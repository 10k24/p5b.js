const x = 10, y = 20;
const idx = (y * width + x) * 4;
const [r, g, b, a] = buffer.slice(idx, idx + 4);
