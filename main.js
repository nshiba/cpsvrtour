'use strict';

const THREE = require('three');
const TWEEN = require('tween.js');
const OrbitControls = require('three-orbit-controls')(THREE);
const data = require('./data.json');
// オブジェクト格納グローバル変数
const mouse = {x: 0, y: 0};
const width = window.innerWidth;
const height = window.innerHeight;
const scene = new THREE.Scene();
const sphereGeo = new THREE.SphereGeometry(10, 120, 80);
const loader = new THREE.TextureLoader();
let imageId = 'image1';
const contentsIconList = [];
const scaleItems = [];
const modalBgMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(width, height),
  new THREE.MeshBasicMaterial({color: 0x000000, opacity: 0.5, transparent: true})
);
let isWindowChanged4Modal = false;

let modalMesh = new THREE.Mesh();

sphereGeo.scale(-1, 1, 1);
const sphere = new THREE.Mesh(sphereGeo, loadSphereImage(data[imageId].path));
imageId = data[imageId].id;
scene.add(sphere);

// camera
const camera = new THREE.PerspectiveCamera(75, width / height, 1, 2000);
camera.position.set(0, 0, 0.1);
camera.lookAt(sphere.position);

requestAnimationFrame(animate);

// iconを作る
const icon1Mesh = getLinkIconMesh(data[imageId].link[0]);
const icon2Mesh = getLinkIconMesh(data[imageId].link[1]);
scene.add(icon1Mesh);
scene.add(icon2Mesh);

// contents
addContentsIcon(imageId);

// render
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize(width, height);
renderer.setClearColor({color: 0x000000});
document.getElementById('stage').appendChild(renderer.domElement);
renderer.render(scene, camera);

const controls = new OrbitControls(camera, renderer.domElement);
initCameraControls();
render();

function getMouseRay(e) {
  if (e.target !== renderer.domElement) {
    return;
  }

  // マウス座標2D変換
  const rect = e.target.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;

  // マウス座標3D変換 width（横）やheight（縦）は画面サイズ
  mouse.x = ((mouse.x / width) * 2) - 1;
  mouse.y = -((mouse.y / height) * 2) + 1;

  // マウスベクトル
  const vector = new THREE.Vector3(mouse.x, mouse.y, 1);

  // vector はスクリーン座標系なので, オブジェクトの座標系に変換
  vector.unproject(camera);

  // 始点, 向きベクトルを渡してレイを作成
  return new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
}

// マウスが動いた時
window.onmousemove = function (e) {
  const ray = getMouseRay(e);

  // 交差判定
  const contensIntersect = ray.intersectObjects(contentsIconList);
  const moveIntersect = ray.intersectObjects([icon1Mesh, icon2Mesh]);
  if (contensIntersect.length > 0) {
    const target = contensIntersect[0].object;
    const tween = new TWEEN.Tween(target.scale);
    tween.to({x: 1.2, y: 1.2, z: 1.2}, 50).start();
    scaleItems.push(target);
  } else if (moveIntersect.length > 0) {
    const target = moveIntersect[0].object;
    const tween = new TWEEN.Tween(target.scale);
    tween.to({x: 1.2, y: 1.2, z: 1.2}, 30).start();
    scaleItems.push(target);
  } else if (scaleItems.length > 0) {
    for (let i = 0; i < scaleItems.length; i++) {
      const tween = new TWEEN.Tween(scaleItems[i].scale);
      tween.to({x: 1.0, y: 1.0, z: 1.0}, 30).start();
    }
  }
};

// マウスが押された時
window.onmousedown = function (ev) {
  const ray = getMouseRay(ev);

  if (!controls.enabled) {
    const modalIntersect = ray.intersectObjects([modalMesh]);
    if (modalIntersect.length > 0) {
      scene.remove(modalMesh);
      scene.remove(modalBgMesh);
      controls.enabled = true;
    }
    return;
  }

  // クリック判定
  const icon1 = ray.intersectObjects([icon1Mesh]);
  const icon2 = ray.intersectObjects([icon2Mesh]);

  if (icon1.length > 0) {
    for (let key in data) {
      if (imageId !== key) {
        continue;
      }

      trasition(0);
      return;
    }
  }

  if (icon2.length > 0) {
    for (let key in data) {
      if (imageId !== key) {
        continue;
      }

      trasition(1);
      return;
    }
  }

  // contents クリック判定
  const contensIntersect = ray.intersectObjects(contentsIconList);
  if (contensIntersect.length > 0) {
    openModalWindow(imageId, contensIntersect[0].object.name);
  }
};

function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
}

function initCameraControls() {
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enablePan = true;
  controls.enableZoom = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 20.0;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Number(Math.PI) * 1; // 0.5なら下からのぞき込めなくなる
}

function removeContentsIcon() {
  for (let i = 0; i < contentsIconList.length; i++) {
    const removeItem = contentsIconList[i];
    scene.remove(removeItem);
  }
  contentsIconList.length = 0;
}

function addContentsIcon(index) {
  for (const i in data[index].contents) {
    loader.load('./image/info_icon.png', function(texture) {
      texture.anisotropy = 0;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;

      const infoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({map: texture, alphaTest: 0.9}));

      infoMesh.name = i;
      setIconPosition(infoMesh, data[index].contents[i].theta, data[index].contents[i].phi);
      scene.add(infoMesh);
      contentsIconList.push(infoMesh);
    });
  }
}

function trasition(linkIndex) {
  const nextId = data[imageId].link[linkIndex].linkId;
  sphere.material = loadSphereImage(data[nextId].path);
  setIconPosition(icon1Mesh, data[nextId].link[0].theta, data[nextId].link[0].phi);
  setIconPosition(icon2Mesh, data[nextId].link[1].theta, data[nextId].link[1].phi);

  removeContentsIcon();
  addContentsIcon(nextId);

  imageId = nextId;
}

function render() {
  requestAnimationFrame(render);
  // sphere.rotation.y += 0.05 * Math.PI/180;
  // 画面リサイズ対応
  window.addEventListener('resize', onWindowResize, false);
  renderer.render(scene, camera);
  controls.update();
}

function onWindowResize() {
  isWindowChanged4Modal = true;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadSphereImage(path) {
  return new THREE.MeshBasicMaterial({
    map: loader.load(path)
  });
}

function setIconPosition(target, theta, phi) {
  theta = theta * Math.PI / 180;
  phi = phi * Math.PI / 180;

  const r = 9.5;
  const x = r * Math.sin(theta) * Math.cos(phi);
  const z = r * Math.sin(theta) * Math.sin(phi);
  const y = r * Math.cos(theta);
  target.position.set(x, y, z);
  target.lookAt(new THREE.Vector3(0, 0, 0));
}

function getLinkIconMesh(link) {
  const iconMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({
      map: loader.load('./image/arrow_icon.png'),
      alphaTest: 0.2})
  );

  setIconPosition(iconMesh, link.theta, link.phi);
  return iconMesh;
}

function openModalWindow(dataIndex, contentIndex) {
  // camera control off
  controls.enabled = false;
  if (isWindowChanged4Modal) {
    isWindowChanged4Modal = false;
    modalBgMesh.geometry = new THREE.PlaneGeometry(window.width, window.height);
  }
  modalBgMesh.lookAt(camera.position);
  modalBgMesh.position.set(
    (camera.position.x / 100) * -3,
    (camera.position.y / 100) * -3,
    (camera.position.z / 100) * -3
  );
  scene.add(modalBgMesh);

  const height = (distanseVector3(new THREE.Vector3(0, 0, 0), camera.position) * 1.3);
  const width = (height * (window.innerWidth / window.innerHeight));
  loader.load(data[dataIndex].contents[contentIndex].thumb, function(texture) {
    // const material = new THREE.MeshBasicMaterial({map: texture, opacity: 0.01, transparent: true});
    const material = new THREE.MeshBasicMaterial({map: texture});
    modalMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    // modalMesh.position.set(camera.position.x / 100, camera.position.y / 100, camera.position.z / 100);
    console.log(modalMesh);
    // modalMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({color: 0x000000, alphaTest: 0.2}));
    modalMesh.lookAt(camera.position);
    modalMesh.position.set(
      (camera.position.x / 100) * -1,
      (camera.position.y / 100) * -1,
      (camera.position.z / 100) * -1
    );
    scene.add(modalMesh);
    // requestAnimationFrame(modalAnimation);
  });
}

function modalAnimation() {
  new TWEEN.Tween(modalMesh.material).to({opacity: 100}, 1000).start();
}

function distanseVector3(v1, v2) {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  const dz = v1.z - v2.z;

  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}
