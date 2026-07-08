import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const canvas = document.querySelector('#heartCanvas');
const PHRASE = 'I love you';

const HEART_SEGMENTS = 150;
const CROSS_SECTION_BANDS = 9;
const TUBE_RADIUS = 1.08;
const HEART_SCALE = 0.56;
const HEART_CENTER_Y = -1.35;
const TREAD_REVOLUTION_SECONDS = 7.5;
const SUBTLE_ORBIT_SECONDS = 80;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.2, 42);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: false,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const heartTire = new THREE.Group();
heartTire.rotation.x = THREE.MathUtils.degToRad(7);
scene.add(heartTire);

const textTexture = createTextTexture();
const treadMeshes = [];
const clock = new THREE.Clock();
const tempMatrix = new THREE.Matrix4();

buildHeartTubeTread();
resize();
window.addEventListener('resize', resize, { passive: true });
renderer.setAnimationLoop(animate);

// Classic parametric heart curve used as the tube/tire centerline.
function heartPoint(t) {
  return new THREE.Vector3(
    16 * Math.sin(t) ** 3 * HEART_SCALE,
    (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * HEART_SCALE + HEART_CENTER_Y,
    0,
  );
}

// Analytic derivative of the heart curve. This becomes the direction text reads along.
function heartTangent(t) {
  return new THREE.Vector3(
    48 * Math.sin(t) ** 2 * Math.cos(t) * HEART_SCALE,
    (-13 * Math.sin(t) + 10 * Math.sin(2 * t) + 6 * Math.sin(3 * t) + 4 * Math.sin(4 * t)) * HEART_SCALE,
    0,
  ).normalize();
}

function buildHeartTubeTread() {
  const plane = new THREE.PlaneGeometry(2.12, 0.38);

  for (let i = 0; i < HEART_SEGMENTS; i += 1) {
    const t = (i / HEART_SEGMENTS) * Math.PI * 2;
    const center = heartPoint(t);
    const tangent = heartTangent(t);

    // For this flat heart curve, the normal points inward/outward in the XY plane and
    // the binormal points through the screen. Together they define a circular tire tube.
    const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const binormal = new THREE.Vector3(0, 0, 1);

    for (let band = 0; band < CROSS_SECTION_BANDS; band += 1) {
      const phase = (band / CROSS_SECTION_BANDS) * Math.PI * 2 + (i % 2) * 0.16;
      const material = new THREE.MeshBasicMaterial({
        map: textTexture,
        color: 0xff86bd,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.82,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(plane, material);
      mesh.userData = { center, tangent, normal, binormal, phase };
      heartTire.add(mesh);
      treadMeshes.push(mesh);
    }
  }
}

function createTextTexture() {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 128;
  const ctx = textureCanvas.getContext('2d');

  ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  ctx.font = '600 42px Inter, Helvetica Neue, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Keep the glow deliberately restrained so the tread remains crisp and readable.
  ctx.shadowColor = 'rgba(255, 128, 190, 0.26)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ff8fc5';
  ctx.fillText(PHRASE, textureCanvas.width / 2, textureCanvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const crossSectionSpin = (elapsed / TREAD_REVOLUTION_SECONDS) * Math.PI * 2;

  // Only a very slow overall yaw is used for depth; the tread rotation is the main motion.
  heartTire.rotation.y = Math.sin((elapsed / SUBTLE_ORBIT_SECONDS) * Math.PI * 2) * 0.18;
  heartTire.rotation.z = Math.sin(elapsed * 0.16) * 0.012;

  for (const mesh of treadMeshes) {
    updateTreadMesh(mesh, crossSectionSpin);
  }

  renderer.render(scene, camera);
}

function updateTreadMesh(mesh, crossSectionSpin) {
  const { center, tangent, normal, binormal, phase } = mesh.userData;
  const angle = phase + crossSectionSpin;

  // Tire-tread animation: every text tile moves around the circular cross-section
  // while staying attached to the heart-shaped centerline.
  const radial = normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle)).normalize();
  const position = center.clone().addScaledVector(radial, TUBE_RADIUS);

  // Text lies on the tube surface: X follows the heart tangent, Y follows the local
  // cross-section radial direction, and Z is the local surface normal for depth tests.
  const surfaceNormal = new THREE.Vector3().crossVectors(tangent, radial).normalize();
  tempMatrix.makeBasis(tangent, radial, surfaceNormal);
  mesh.quaternion.setFromRotationMatrix(tempMatrix);
  mesh.position.copy(position);

  const frontDepth = THREE.MathUtils.clamp((position.z + TUBE_RADIUS) / (TUBE_RADIUS * 2), 0, 1);
  mesh.material.opacity = THREE.MathUtils.lerp(0.16, 0.9, frontDepth);
  const scale = THREE.MathUtils.lerp(0.92, 1.06, frontDepth);
  mesh.scale.setScalar(scale);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.position.z = width < 560 ? 51 : 42;
  camera.fov = width < 560 ? 45 : 38;
  camera.updateProjectionMatrix();
}
