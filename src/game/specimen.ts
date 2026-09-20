import * as THREE from "three";
import { createZebra, disposeScene } from "./zebra";

export function createSpecimen(
  container: HTMLElement,
  reducedMotion: boolean,
): { dispose(): void } {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute(
    "aria-label",
    "Animated plains zebra. Drag, or use left and right arrow keys, to rotate the model.",
  );
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.style.cursor = "grab";
  container.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 50);
  camera.position.set(2.6, 2.2, 4.6);
  camera.lookAt(0, 1, 0);
  scene.add(new THREE.HemisphereLight(0xffefd8, 0x839078, 3));
  const sun = new THREE.DirectionalLight(0xffe6c1, 3);
  sun.position.set(4, 6, 4);
  scene.add(sun);
  const animal = createZebra(0, (state) => {
    renderer.domElement.dataset.modelState = state;
  });
  scene.add(animal.root);
  animal.root.rotation.y = -0.3;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.9, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0xc2b987, roughness: 1 }),
  );
  base.position.y = -0.09;
  scene.add(base);
  let dragging = false;
  let lastX = 0;
  let disposed = false;
  let frame = 0;
  const onDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = "grabbing";
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) return;
    animal.root.rotation.y += (event.clientX - lastX) * 0.012;
    lastX = event.clientX;
  };
  const onUp = () => {
    dragging = false;
    renderer.domElement.style.cursor = "grab";
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    animal.root.rotation.y += event.key === "ArrowLeft" ? -0.2 : 0.2;
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onUp);
  renderer.domElement.addEventListener("keydown", onKey);
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 1 ? 6.3 : 4.6;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  const animate = (time: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (document.hidden) return;
    animal.animate(time / 1000, "walking", reducedMotion);
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(animate);
  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      renderer.domElement.removeEventListener("keydown", onKey);
      animal.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
