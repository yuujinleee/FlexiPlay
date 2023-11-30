import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as CANNON from "cannon-es";
import { GUI } from "dat.gui";
import Stats from "three/examples/jsm/libs/stats.module";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";

// Basic Three.js Settings - Renderer / Scene / Camera / Controls
const renderer = new THREE.WebGLRenderer({ antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  24,
  window.innerWidth / window.innerHeight,
  1,
  2000
);
const controls = new OrbitControls(camera, renderer.domElement);
// const controls = new DragControls([...objects], camera, renderer.domElement);
// controls.addEventListener("drag", onMouseDrag);

const timeStep = 1 / 60;

// Cannon.js Basic Settings
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.81, 0),
});

let clothGeometry, sphereMesh, clothMesh, particlePhysMat;
const sphereSize = 0.1;
let movementRadius = 0.2;
let speed = 1.5;
let particles = [];

// Cloth Properties (Particle Settings)
let cols = 15; // cols
let rows = 15; // rows
let mass = 5;
// const clothSize = 1;
let dist = 0.05; // distantce between spheres
let distOffest = 1;

// Stats
const stats = new Stats();
document.body.appendChild(stats.dom);

// Mouse Interaction
let isMouseDown = false;

init();

function init() {
  // Basic Three.js Settings - Renderer / Scene / Camera / Controls
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xa3a3a3);
  document.body.appendChild(renderer.domElement);
  camera.position.set(4, 1, 1);
  camera.lookAt(0, 0, 0);

  controls.update();

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  const spotLight = new THREE.SpotLight(0xffffff, 0.9, 0, Math.PI / 8, 1);
  spotLight.position.set(-3, 3, 10);
  spotLight.target.position.set(0, 0, 0);
  scene.add(spotLight);

  const directionalLight = new THREE.DirectionalLight(0xff0000, 0.5);
  directionalLight.position.set(0, 0, -10);
  directionalLight.target.position.set(0, 0, 0);
  scene.add(directionalLight);

  createClothGeometry();

  // Sphere Geometry (Ball)
  const sphereGeometry = new THREE.SphereGeometry(sphereSize);
  const sphereMat = new THREE.MeshPhongMaterial();
  sphereMesh = new THREE.Mesh(sphereGeometry, sphereMat);
  scene.add(sphereMesh);

  const spherePhysMat = new CANNON.Material();
  const sphereShape = new CANNON.Sphere(sphereSize * 1.3); // mutiply offset 1.3 to prevent coliding
  sphereBody = new CANNON.Body({
    mass: 0,
    shape: sphereShape,
    material: spherePhysMat,
  });
  world.addBody(sphereBody);

  // Friction, Restitution;
  const particleSphereContactMat = new CANNON.ContactMaterial(
    spherePhysMat,
    particlePhysMat,
    { friction: 0, restitution: 0 }
  );
  world.addContactMaterial(particleSphereContactMat);

  // GUI settings - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const gui = new GUI();
  const clothFolder = gui.addFolder("Cloth Properties");
  clothFolder.add({ mass: mass }, "mass", 0, 300, 1).onChange(function (value) {
    mass = Number(value);

    let a = particles.map((e) => {
      e.map((b) => world.removeBody(b));
      // console.log(e);
    });
    particles = [];
    scene.remove(clothMesh);
    // console.log(world);
    createClothGeometry();
  });
  clothFolder
    .add({ distOffest: distOffest }, "distOffest", 1, 2, 0.02)
    .onChange(function (value) {
      distOffest = Number(value);

      let a = particles.map((e) => {
        e.map((b) => world.removeBody(b));
      });
      particles = [];

      scene.remove(clothMesh);
      createClothGeometry();
    });
  clothFolder.open();

  const worldFolder = gui.addFolder("World Properties");
  worldFolder
    .add({ movementRadius: movementRadius }, "movementRadius", 0, 0.5, 0.05)
    .onChange(function (value) {
      movementRadius = Number(value);
    });
  worldFolder
    .add({ speed: speed }, "speed", 0.5, 5, 0.5)
    .onChange(function (value) {
      speed = Number(value);
    });
  worldFolder.add(clothMesh.material, "wireframe").listen();
  worldFolder.open();

  // User Interaction (Mouse) - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // document.addEventListener("drag", onMouseDrag);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("pointermove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

function createClothGeometry() {
  // Cloth Geometry
  particlePhysMat = new CANNON.Material();
  for (let i = 0; i < cols + 1; i++) {
    particles.push([]);
    for (let j = 0; j < rows + 1; j++) {
      const particle = new CANNON.Body({
        // mass: j == rows || (j == 0) | (i == cols) || i == 0 ? 0 : mass,
        mass: j == rows ? 0 : mass,
        shape: new CANNON.Particle(),
        position: new CANNON.Vec3(
          (i - cols * 0.5) * dist,
          (j - rows * 0.5) * dist,
          0
        ),
        material: particlePhysMat,
      });
      particles[i].push(particle);
      world.addBody(particle);
    }
  }
  // console.log(particles);
  // Distance Constraint
  function connect(i1, j1, i2, j2) {
    world.addConstraint(
      new CANNON.DistanceConstraint(
        particles[i1][j1],
        particles[i2][j2],
        dist * distOffest
      )
    );
  }

  for (let i = 0; i < cols + 1; i++) {
    for (let j = 0; j < rows + 1; j++) {
      if (i < cols) connect(i, j, i + 1, j);
      if (j < rows) connect(i, j, i, j + 1);
    }
  }

  // Cloth Geometry
  clothGeometry = new THREE.PlaneGeometry(1, 1, cols, rows);
  const clothMat = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    wireframe: true,
    color: 0x555555,
    // map: new THREE.TextureLoader().load("./texture.jpg"),
  });
  clothMesh = new THREE.Mesh(clothGeometry, clothMat);
  scene.add(clothMesh);
  // console.log(clothMesh);
}

function updateParticules() {
  for (let i = 0; i < cols + 1; i++) {
    for (let j = 0; j < rows + 1; j++) {
      const index = j * (cols + 1) + i;
      const positionAttribute = clothGeometry.attributes.position;
      const position = particles[i][rows - j].position;
      positionAttribute.setXYZ(index, position.x, position.y, position.z);
      positionAttribute.needsUpdate = true;
    }
  }
  clothGeometry.normalsNeedUpdate = true;
  clothGeometry.verticesNeedUpdate = true;
}

let pointer = { x: 0, y: 0 };

function onMouseDown(event) {
  isMouseDown = true;
  pointer.x = event.pageX;
  pointer.y = event.pageY;
}

function onMouseMove(event) {
  if (isMouseDown) {
    const diffX = event.pageX - pointer.x;
    console.log(diffX);

    let mouseMoveDistance = diffX > -350 ? diffX : -350;
    mouseMoveDistance = mouseMoveDistance < 350 ? mouseMoveDistance : 350;

    sphereBody.position.set(0, 0, -movementRadius * (mouseMoveDistance / 350));
    sphereMesh.position.copy(sphereBody.position);
  }
}

function onMouseUp() {
  isMouseDown = false;
}

function onMouseDrag() {
  console.log("Mouse Dragged");
}

function animate(time) {
  updateParticules();
  world.step(timeStep);
  sphereBody.position.set(
    // movementRadius * Math.sin(time / 1000),
    0,
    0,
    movementRadius * Math.cos((time / 1000) * speed)
  );
  sphereMesh.position.copy(sphereBody.position);
  render();
  stats.update();
}

function render() {
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
