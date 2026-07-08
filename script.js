import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const canvas = document.querySelector('#heartCanvas');

const PHRASE = 'I love you ❤️';
const HEART_COLOR = '#ff6aa8';
const REVOLUTION_SECONDS = 22;
const BREATH_SECONDS = 6.8;
const CONTOUR_COUNT = 9;
const DEPTH_LAYERS = 5;
const SEGMENTS_PER_CONTOUR = 112;
const SPARKLE_COUNT = 22;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.15, 42);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: false,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const heartGroup = new THREE.Group();
heartGroup.rotation.x = THREE.MathUtils.degToRad(9);
scene.add(heartGroup);

const textTexture = createTextTexture();
const textMaterial = new THREE.MeshBasicMaterial({
  map: textTexture,
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
  opacity: 0.88,
  side: THREE.DoubleSide,
});

const sparkleTexture = createSparkleTexture();
const sparkleMaterial = new THREE.SpriteMaterial({
  map: sparkleTexture,
  color: 0xffbed8,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  opacity: 0,
});

const sparkles = [];
const pulse = { start: -Infinity };
const clock = new THREE.Clock();

buildTextHeart();
createDust();
createSparkles();
resize();
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('pointerdown', triggerPulse, { passive: true });
renderer.setAnimationLoop(animate);

function heartPoint(t) {
  // Classic parametric heart equation requested in the brief.
  const x = 16 * Math.sin(t) ** 3;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return new THREE.Vector2(x, y);
}

function heartTangent(t) {
  // Analytical derivative of the heart curve. Text planes are rotated to this tangent.
  const dx = 48 * Math.sin(t) ** 2 * Math.cos(t);
  const dy = -13 * Math.sin(t) + 10 * Math.sin(2 * t) + 6 * Math.sin(3 * t) + 4 * Math.sin(4 * t);
  return new THREE.Vector2(dx, dy).normalize();
}

function buildTextHeart() {
  const geometry = new THREE.PlaneGeometry(2.45, 0.42);
  const centerOffset = new THREE.Vector2(0, -1.65);
  const totalInstances = CONTOUR_COUNT * DEPTH_LAYERS * SEGMENTS_PER_CONTOUR;
  const textMesh = new THREE.InstancedMesh(geometry, textMaterial, totalInstances);
  const transform = new THREE.Object3D();
  let index = 0;

  for (let contour = 0; contour < CONTOUR_COUNT; contour += 1) {
    const contourScale = THREE.MathUtils.lerp(1, 0.68, contour / (CONTOUR_COUNT - 1));

    for (let layer = 0; layer < DEPTH_LAYERS; layer += 1) {
      const z = (layer - (DEPTH_LAYERS - 1) / 2) * 0.58;

      for (let i = 0; i < SEGMENTS_PER_CONTOUR; i += 1) {
        const t = (i / SEGMENTS_PER_CONTOUR) * Math.PI * 2;
        const point = heartPoint(t).add(centerOffset).multiplyScalar(contourScale * 0.66);
        const tangent = heartTangent(t);
        const scale = 1 + (1 - contourScale) * 0.1;

        transform.position.set(point.x, point.y, z);
        transform.rotation.set(0, 0, Math.atan2(tangent.y, tangent.x));
        transform.scale.setScalar(scale);
        transform.updateMatrix();
        textMesh.setMatrixAt(index, transform.matrix);
        index += 1;
      }
    }
  }

  textMesh.instanceMatrix.needsUpdate = true;
  heartGroup.add(textMesh);
}

function createTextTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 96;
  const ctx = textureCanvas.getContext('2d');

  ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  ctx.font = '300 34px Inter, Helvetica Neue, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 106, 168, 0.32)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = HEART_COLOR;
  ctx.fillText(PHRASE, textureCanvas.width / 2, textureCanvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createDust() {
  const positions = [];
  for (let i = 0; i < 90; i += 1) {
    positions.push((Math.random() - 0.5) * 58, (Math.random() - 0.5) * 36, (Math.random() - 0.5) * 26);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xff9ac3,
    size: 0.026,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
  });
  scene.add(new THREE.Points(geometry, material));
}

function createSparkles() {
  for (let i = 0; i < SPARKLE_COUNT; i += 1) {
    const sprite = new THREE.Sprite(sparkleMaterial.clone());
    sprite.visible = false;
    scene.add(sprite);
    sparkles.push(sprite);
  }
}

function createSparkleTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 64;
  textureCanvas.height = 64;
  const ctx = textureCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.26, 'rgba(255,178,214,0.45)');
  gradient.addColorStop(1, 'rgba(255,106,168,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(textureCanvas);
}

function triggerPulse() {
  pulse.start = clock.getElapsedTime();

  for (const sparkle of sparkles) {
    const radius = THREE.MathUtils.randFloat(6.5, 11.5);
    const angle = THREE.MathUtils.randFloat(0, Math.PI * 2);
    sparkle.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72, THREE.MathUtils.randFloat(-1.5, 3.5));
    sparkle.scale.setScalar(THREE.MathUtils.randFloat(0.14, 0.38));
    sparkle.userData.birth = pulse.start;
    sparkle.userData.life = THREE.MathUtils.randFloat(0.55, 0.95);
    sparkle.userData.drift = new THREE.Vector3(Math.cos(angle) * 0.52, Math.sin(angle) * 0.36, 0);
    sparkle.visible = true;
  }
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const rotationProgress = (elapsed % REVOLUTION_SECONDS) / REVOLUTION_SECONDS;
  const breath = 1 + Math.sin((elapsed / BREATH_SECONDS) * Math.PI * 2) * 0.018;
  const pulseAge = elapsed - pulse.start;
  const clickPulse = pulseAge >= 0 && pulseAge < 0.75 ? Math.sin((pulseAge / 0.75) * Math.PI) * 0.055 : 0;

  heartGroup.rotation.y = rotationProgress * Math.PI * 2;
  heartGroup.scale.setScalar(breath + clickPulse);

  for (const sparkle of sparkles) {
    if (!sparkle.visible) continue;
    const age = elapsed - sparkle.userData.birth;
    const life = sparkle.userData.life;
    if (age > life) {
      sparkle.visible = false;
      sparkle.material.opacity = 0;
      continue;
    }
    const progress = age / life;
    sparkle.position.addScaledVector(sparkle.userData.drift, 0.012);
    sparkle.material.opacity = Math.sin(progress * Math.PI) * 0.32;
  }

  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.z = width < 640 ? 47 : 42;
  camera.updateProjectionMatrix();
}
