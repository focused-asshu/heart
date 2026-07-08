const heart = document.querySelector('#heart');
const stage = document.querySelector('#heartStage');

const TEXT = 'I love you';
const BAND_COUNT = 14;
const MAX_ELEMENTS = 336;
const curveSamples = buildHeartSamples(1600);
let textNodes = [];
let stageWidth = 0;
let stageHeight = 0;

function heartPoint(t) {
  return {
    x: 16 * Math.sin(t) ** 3,
    y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
  };
}

function buildHeartSamples(count) {
  const samples = [];

  for (let i = 0; i < count; i += 1) {
    const t = (i / count) * Math.PI * 2;
    samples.push(heartPoint(t));
  }

  return samples;
}

function widthAtY(y) {
  const slice = curveSamples.filter((point) => Math.abs(point.y - y) < 0.34);

  if (!slice.length) return 0;

  return Math.max(...slice.map((point) => Math.abs(point.x)));
}

function createHeartBands() {
  const fragment = document.createDocumentFragment();
  const minY = -16.35;
  const maxY = 11.8;

  for (let band = 0; band < BAND_COUNT; band += 1) {
    const progress = band / (BAND_COUNT - 1);
    const y = maxY - progress * (maxY - minY);
    const width = widthAtY(y);

    if (width < 1.6) continue;

    const depth = Math.max(2.6, width * 0.44);
    const bandDensity = Math.round(12 + width * 0.78);
    const itemCount = Math.min(26, Math.max(12, bandDensity));
    const verticalLean = (progress - 0.5) * -9;

    for (let i = 0; i < itemCount; i += 1) {
      if (textNodes.length >= MAX_ELEMENTS) break;

      const theta = (i / itemCount) * Math.PI * 2;
      const x = Math.cos(theta) * width;
      const z = Math.sin(theta) * depth;
      const tangentYaw = 90 - (theta * 180) / Math.PI;
      const sideFade = 0.72 + Math.max(0, Math.sin(theta)) * 0.2;
      const crownFade = band < 2 ? 0.7 + band * 0.1 : 1;
      const node = document.createElement('span');

      node.className = 'love-text';
      node.textContent = TEXT;
      node.dataset.x = x.toFixed(4);
      node.dataset.y = y.toFixed(4);
      node.dataset.z = z.toFixed(4);
      node.dataset.yaw = tangentYaw.toFixed(3);
      node.dataset.roll = (Math.sin(theta) * verticalLean).toFixed(3);
      node.style.opacity = (sideFade * crownFade).toFixed(2);
      fragment.appendChild(node);
      textNodes.push(node);
    }
  }

  heart.appendChild(fragment);
}

function layoutHeart() {
  const rect = stage.getBoundingClientRect();
  stageWidth = rect.width;
  stageHeight = rect.height;
  const scale = Math.min(stageWidth / 39, stageHeight / 34);
  const yLift = scale * 1.35;

  for (const node of textNodes) {
    const x = Number(node.dataset.x) * scale;
    const y = -Number(node.dataset.y) * scale + yLift;
    const z = Number(node.dataset.z) * scale;
    const yaw = Number(node.dataset.yaw);
    const roll = Number(node.dataset.roll);

    node.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateY(${yaw}deg) rotateZ(${roll}deg)`;
  }
}

createHeartBands();
layoutHeart();
window.addEventListener('resize', layoutHeart, { passive: true });
