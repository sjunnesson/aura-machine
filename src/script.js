import "./style.css";
import * as THREE from "three";
import { GUI } from "dat.gui";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module";
import { Vector3 } from "three";
import { TWEEN } from "three/examples/jsm/libs/tween.module.min";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

let camera, scene, renderer, video, stats, gui, card, rotate;

const ENTIRE_SCENE = 0,
  BLOOM_SCENE = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const params = {
  exposure: 1,
  bloomStrength: 0.6,
  bloomThreshold: 0,
  bloomRadius: 2.5,
  scene: "Scene with Glow",
};

const darkMaterial = new THREE.MeshBasicMaterial({ color: "black"});
const materials = {};

init();

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.threshold = params.bloomThreshold;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = params.bloomRadius;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const finalPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: document.getElementById("vertexshader").textContent,
    fragmentShader: document.getElementById("fragmentshader").textContent,
    defines: {},
  }),
  "baseTexture"
);
finalPass.needsSwap = true;

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(finalPass);

gui
  .add(params, "scene", ["Scene with Glow", "Glow only", "Scene only"])
  .onChange(function (value) {
    switch (value) {
      case "Scene with Glow":
        bloomComposer.renderToScreen = false;
        break;
      case "Glow only":
        bloomComposer.renderToScreen = true;
        break;
      case "Scene only":
        // nothing to do
        break;
    }

    render();
  });

gui.add(params, "exposure", 0.1, 2).onChange(function (value) {
  renderer.toneMappingExposure = Math.pow(value, 4.0);
  render();
});

gui.add(params, "bloomThreshold", 0.0, 1.0).onChange(function (value) {
  bloomPass.threshold = Number(value);
});

gui.add(params, "bloomStrength", 0.0, 3.0).onChange(function (value) {
  bloomPass.strength = Number(value);
});

gui
  .add(params, "bloomRadius", 0.0, 5.0)
  .step(0.01)
  .onChange(function (value) {
    bloomPass.radius = Number(value);
  });

setupScene();

animate();

function init() {
  document
    .getElementById("takePicture")
    .addEventListener("click", startSpin, false);

  initCamera();

  scene = new THREE.Scene();

  initLights();

  video = document.getElementById("video");

  stats = Stats();
  document.body.appendChild(stats.dom);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;

  window.addEventListener("resize", onWindowResize);

  makeCard();

  gui = new GUI();
  // const cardFolder = gui.addFolder("Card");
  // cardFolder.add(card.rotation, "x", 0.0, Math.PI * 2, 0.01);
  // cardFolder.add(card.rotation, "y", 0.0, Math.PI * 2, 0.01);
  // cardFolder.add(card.rotation, "z", 0.0, Math.PI * 2, 0.01);
  // cardFolder.open();
}

function animate() {
  requestAnimationFrame(animate);
  render();
  stats.update();
  TWEEN.update();

  // rotateCard();
}

function render() {
  switch (params.scene) {
    case "Scene only":
      renderer.render(scene, camera);
      break;
    case "Glow only":
      renderBloom(false);
      break;
    case "Scene with Glow":
    default:
      // render scene with bloom
      renderBloom(true);

      // render the entire scene, then render bloom scene on top
      finalComposer.render();
      break;
  }
}

function makeCard() {
  rotate = false;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const constraints = {
      video: {
        width: { min: 1024, ideal: 1280, max: 1920 },
        height: { min: 576, ideal: 720, max: 1080 },
        facingMode: "user",
        deviceId:
          "5520c38b1ec6aaa02586eccb87e9f98c45206870d8a41fb5cc91004fe7844254",
      },
    };
    const textureFront = new THREE.VideoTexture(video);

    const geometry = new THREE.PlaneGeometry(16, 9);
    geometry.scale(0.5, 0.5, 0.5);

    const material = new THREE.MeshBasicMaterial({
      map: textureFront,
      side: THREE.DoubleSide,
    });

    card = new THREE.Mesh(geometry, material);
    card.lookAt(camera.position);

    scene.add(card);

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        // apply the stream to the video element used in the texture

        video.srcObject = stream;
        video.play();
      })
      .catch(function (error) {
        console.error("Unable to access the camera/webcam.", error);
      });
  } else {
    console.error("MediaDevices interface not available.");
  }
}

// function rotateCard() {
//   if (rotate ==true) {
//     var SPEED = 0.01;

//     card.rotation.x -= SPEED * 2;
//     card.rotation.y -= SPEED;
//     card.rotation.z -= SPEED * 2;
//   }
// }

function startSpin() {
  console.log("start Spining");
  card.rotation.x = 0;
  card.rotation.y = 0;
  card.rotation.z = 0;
  new TWEEN.Tween(card.rotation)
    .to({ y: Math.PI * 2, x: Math.PI * 2, z: Math.PI * 2 }, 2000)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .start()
    .onComplete(() => {
      card.layers.enable(BLOOM_SCENE);

      console.log("tween done");
    });
  // returnToStart()
  // setTimeout(stopSpin, 2000);
}

// function stopSpin() {
//   console.log("Stop Spining");
//   rotate = false;
//  // returnToStart();
// }

// function returnToStart() {
//   new TWEEN.Tween(card.rotation)
//     .to({ y: 0, x:0, z:0 }, 2000)
//     .easing(TWEEN.Easing.Cubic.Out)
//     .start()
//     .onComplete(() => {
//       console.log("tween done");
//     }
//     );
// }

function initCamera() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 10;
}

function getVideoIDs() {
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    var videoDevices = [0, 0];
    var videoDeviceIndex = 0;
    devices.forEach(function (device) {
      console.log(
        device.kind + ": " + device.label + " id = " + device.deviceId
      );
      if (device.kind == "videoinput") {
        videoDevices[videoDeviceIndex++] = device.deviceId;
      }
    });
  });
}

function onWindowResize() {
  cd;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  bloomComposer.setSize(width, height);
  finalComposer.setSize(width, height);
}

function initLights() {
  scene.add(new THREE.AmbientLight(0x404040));
  const pointLight = new THREE.PointLight(0xffffff, 1);
 camera.add(pointLight);
}

function renderBloom(mask) {
  if (mask === true) {
    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);
  } else {
    camera.layers.set(BLOOM_SCENE);
    bloomComposer.render();
    camera.layers.set(ENTIRE_SCENE);
  }
}

function darkenNonBloomed(obj) {
  if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
    materials[obj.uuid] = obj.material;
    obj.material = darkMaterial;
  }
}

function restoreMaterial(obj) {
  if (materials[obj.uuid]) {
    obj.material = materials[obj.uuid];
    delete materials[obj.uuid];
  }
}
function setupScene() {
  // scene.traverse( disposeMaterial );
  // scene.children.length = 0;

  const geometry = new THREE.IcosahedronGeometry(1, 15);

  for (let i = 0; i < 10; i++) {
    const color = new THREE.Color();
    color.setHSL(Math.random(), 0.7, Math.random() * 0.2 + 0.05);

    const material = new THREE.MeshBasicMaterial({ color: color , wireframe: true });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.x = Math.random() * 10 - 5;
    sphere.position.y = Math.random() * 10 - 5;
    sphere.position.z = Math.random() * 10 - 5;
    sphere.position.normalize().multiplyScalar(Math.random() * 4.0 + 2.0);
    sphere.scale.setScalar(Math.random() * Math.random() + 0.5);
    scene.add(sphere);

    sphere.layers.enable(BLOOM_SCENE);
  }

  render();
}

function disposeMaterial(obj) {
  if (obj.material) {
    obj.material.dispose();
  }
}
