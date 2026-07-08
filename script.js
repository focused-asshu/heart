const scene = document.querySelector('.scene');
const heart = document.querySelector('#heart');
const stage = document.querySelector('#heartStage');
const sparkles = document.querySelector('#sparkles');

const PARTICLE_COUNT = 120;
const BAND_COUNT = 4;
const particles = [];
let stageWidth = 0;
let stageHeight = 0;
let scale = 1;
let animationStart = performance.now();
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function heartPoint(t) {
  const x = 16 * Math.sin(t) ** 3;
  const y = -(
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t)
  );

  return { x, y };
}

function heartTangent(t) {
  const before = heartPoint(t - 0.02);
  const after = heartPoint(t + 0.02);
  return Math.atan2(after.y - before.y, after.x - before.x) * (180 / Math.PI);
}

function createParticles() {
  const fragment = document.createDocumentFragment();
  const perBand = PARTICLE_COUNT / BAND_COUNT;
  const bandScales = [1, 0.9, 0.78, 0.66];
  const bandOffsets = [0, Math.PI / perBand, Math.PI / (perBand * 0.7), Math.PI / (perBand * 0.54)];

  for (let band = 0; band < BAND_COUNT; band += 1) {
    for (let i = 0; i < perBand; i += 1) {
      const particle = document.createElement('span');
      const progress = i / perBand;
      const t = progress * Math.PI * 2 + bandOffsets[band];
      const point = heartPoint(t);
      const tangent = heartTangent(t);
      const bandDepth = (band - 1.5) * 30;

      particle.className = 'love-particle';
      particle.textContent = 'I love you';
      particle.style.opacity = `${0.68 + (BAND_COUNT - band) * 0.06}`;

      particles.push({
        element: particle,
        point,
        t,
        tangent,
        bandScale: bandScales[band],
        depth: bandDepth + Math.sin(t * 2) * 14,
        phase: band * 0.65 + progress * Math.PI * 2,
      });
      fragment.appendChild(particle);
    }
  }

  heart.appendChild(fragment);
}

function measureStage() {
  const rect = stage.getBoundingClientRect();
  stageWidth = rect.width;
  stageHeight = rect.height;
  scale = Math.min(stageWidth / 35, stageHeight / 31);
}

function render(now) {
  const elapsed = (now - animationStart) / 1000;
  const breath = reducedMotion ? 1 : 1 + Math.sin(elapsed * 1.18) * 0.025;
  const rotation = reducedMotion ? 0 : Math.sin(elapsed * 0.48) * 18;
  const reel = reducedMotion ? 0 : elapsed * 0.72;
  const tilt = reducedMotion ? 0 : Math.sin(elapsed * 0.52) * 5;

  heart.style.transform = `scale(${breath}) rotateX(${tilt}deg) rotateY(${rotation}deg) rotateZ(${Math.sin(elapsed * 0.32) * 1.5}deg)`;

  for (const particle of particles) {
    const bandBreath = reducedMotion ? 1 : 1 + Math.sin(elapsed * 1.08 + particle.phase) * 0.012;
    const x = particle.point.x * scale * particle.bandScale * bandBreath;
    const y = particle.point.y * scale * particle.bandScale * bandBreath;
    const orbit = reducedMotion ? 0 : Math.cos(reel + particle.t + particle.phase * 0.16);
    const z = particle.depth + orbit * 54;
    const facing = (orbit + 1) / 2;
    const size = 0.92 + facing * 0.1 - (1 - particle.bandScale) * 0.08;
    const opacity = 0.5 + facing * 0.35 + particle.bandScale * 0.12;
    const rotateText = particle.tangent + Math.sin(elapsed * 0.36 + particle.phase) * 2;

    particle.element.style.opacity = opacity.toFixed(2);
    particle.element.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateZ(${rotateText}deg) rotateY(${-rotation}deg) scale(${size})`;
  }

  requestAnimationFrame(render);
}

function burstSparkles() {
  scene.classList.add('message-visible');
  stage.classList.remove('pulse');
  void stage.offsetWidth;
  stage.classList.add('pulse');

  if (reducedMotion) return;

  for (let i = 0; i < 14; i += 1) {
    const sparkle = document.createElement('i');
    const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.28;
    const distance = 42 + Math.random() * 64;

    sparkle.className = 'sparkle';
    sparkle.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
    sparkle.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
    sparkle.style.transform = `translate(${(Math.random() - 0.5) * 54}px, ${(Math.random() - 0.5) * 48}px)`;
    sparkles.appendChild(sparkle);

    sparkle.addEventListener('animationend', () => sparkle.remove(), { once: true });
  }
}

createParticles();
measureStage();
requestAnimationFrame(render);

stage.addEventListener('pointerup', burstSparkles);
window.addEventListener('resize', measureStage, { passive: true });
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
  reducedMotion = event.matches;
});
