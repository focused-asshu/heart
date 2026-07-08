import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const canvas = document.querySelector('#heartCanvas');

const PHRASE = 'I love you';
const REVOLUTION_SECONDS = 26;
const HEART_SEGMENTS = 128;
const TUBE_RINGS = 7;
const TUBE_RADIUS = 1.15;
const HEART_SCALE = 0.58;
const HEART_CENTER_Y = -1.45;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.3, 42);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: false,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const heartWheel = new THREE.Group();
heartWheel.rotation.x = THREE.MathUtils.degToRad(8);
scene.add(heartWheel);

const textTexture = createTextTexture();
const textSprites = [];
const clock = new THREE.Clock();

buildHeartTire();
resize();
window.addEventListener('resize', resize, { passive: true });
renderer.setAnimationLoop(animate);

function heartPoint(t) {
  const x = 16 * Math.sin(t) ** 3;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return new THREE.Vector2(x * HEART_SCALE, y * HEART_SCALE + HEART_CENTER_Y);
}

function heartTangent(t) {
  const dx = 48 * Math.sin(t) ** 2 * Math.cos(t);
  const dy = -13 * Math.sin(t) + 10 * Math.sin(2 * t) + 6 * Math.sin(3 * t) + 4 * Math.sin(4 * t);
  return new THREE.Vector2(dx, dy).normalize();
}

function buildHeartTire() {
  for (let i = 0; i < HEART_SEGMENTS; i += 1) {
    const t = (i / HEART_SEGMENTS) * Math.PI * 2;
    const center = heartPoint(t);
    const tangent = heartTangent(t);
    const normal = new THREE.Vector2(-tangent.y, tangent.x).normalize();
    const tangentAngle = Math.atan2(tangent.y, tangent.x);

    for (let ring = 0; ring < TUBE_RINGS; ring += 1) {
      const a = (ring / TUBE_RINGS) * Math.PI * 2;
      const radialOffset = Math.cos(a) * TUBE_RADIUS;
      const depthOffset = Math.sin(a) * TUBE_RADIUS * 1.12;
      const material = new THREE.SpriteMaterial({
        map: textTexture,
        color: new THREE.Color(0xff82b8),
        transparent: true,
        depthWrite: false,
        depthTest: true,
        opacity: 0.78,
      });
      const sprite = new THREE.Sprite(material);

      sprite.position.set(
        center.x + normal.x * radialOffset,
        center.y + normal.y * radialOffset,
        depthOffset,
      );
      sprite.scale.set(2.25, 0.46, 1);
      sprite.material.rotation = tangentAngle;
      sprite.userData.baseOpacity = 0.38 + 0.4 * ((Math.sin(a) + 1) / 2);
      sprite.userData.ringPhase = a;
      sprite.userData.tangentAngle = tangentAngle;

      heartWheel.add(sprite);
      textSprites.push(sprite);
    }
  }
}

function createTextTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 128;
  const ctx = textureCanvas.getContext('2d');

  ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  ctx.font = '500 42px Inter, Helvetica Neue, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 130, 184, 0.24)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = '#ff82b8';
  ctx.fillText(PHRASE, textureCanvas.width / 2, textureCanvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const rotationProgress = (elapsed % REVOLUTION_SECONDS) / REVOLUTION_SECONDS;
  const breath = 1 + Math.sin(elapsed * 0.85) * 0.006;

  heartWheel.rotation.y = rotationProgress * Math.PI * 2;
  heartWheel.rotation.z = Math.sin(elapsed * 0.18) * 0.035;
  heartWheel.scale.setScalar(breath);
  updateDepthFade();

  renderer.render(scene, camera);
}

function updateDepthFade() {
  const worldPosition = new THREE.Vector3();
  for (const sprite of textSprites) {
    sprite.getWorldPosition(worldPosition);
    const frontAmount = THREE.MathUtils.clamp((worldPosition.z + 8) / 16, 0, 1);
    const opacity = THREE.MathUtils.lerp(0.18, sprite.userData.baseOpacity, frontAmount);
    const scaleBoost = THREE.MathUtils.lerp(0.92, 1.06, frontAmount);
    sprite.material.opacity = opacity;
    sprite.scale.set(2.25 * scaleBoost, 0.46 * scaleBoost, 1);
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.z = width < 560 ? 52 : 42;
  camera.fov = width < 560 ? 44 : 38;
  camera.updateProjectionMatrix();
}
