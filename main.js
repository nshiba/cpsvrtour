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

let modalMesh = new THREE.Mesh();

sphereGeo.scale(-1, 1, 1);
const sphere = new THREE.Mesh(sphereGeo, loadSphereImage(data[imageId].path));
imageId = data[imageId].id;
scene.add(sphere);
console.log('sphere position -> ' + sphere.position.x + ', ' + sphere.position.y + ', ' + sphere.position.z);

// camera
const camera = new THREE.PerspectiveCamera(75, width / height, 1, 2000);
camera.position.set(0, 0, 0.1);
camera.lookAt(sphere.position);

new TWEEN.Tween({x:10}).to({x:100}, 3000).onUpdate(function(){console.log(this);}).start();

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

// マウスが押された時
window.onmousedown = function (ev) {
  if (ev.target !== renderer.domElement) {
    return;
  }

  console.log('camera position -> ' + camera.position.x + ', ' + camera.position.y + ', ' + camera.position.z);
  console.log('distanse -> ' + distanseVector3(new THREE.Vector3(0, 0, 0), camera.position));

  // マウス座標2D変換
  const rect = ev.target.getBoundingClientRect();
  mouse.x = ev.clientX - rect.left;
  mouse.y = ev.clientY - rect.top;

  // マウス座標3D変換 width（横）やheight（縦）は画面サイズ
  mouse.x = ((mouse.x / width) * 2) - 1;
  mouse.y = -((mouse.y / height) * 2) + 1;

  // マウスベクトル
  const vector = new THREE.Vector3(mouse.x, mouse.y, 1);

  // vector はスクリーン座標系なので, オブジェクトの座標系に変換
  vector.unproject(camera);

  // 始点, 向きベクトルを渡してレイを作成
  const ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

  if (!controls.enabled) {
    const modalIntersect = ray.intersectObjects([modalMesh]);
    if (modalIntersect.length > 0) {
      scene.remove(modalMesh);
      controls.enabled = true;
    }
    return;
  }

  // クリック判定
  const icon1 = ray.intersectObjects([icon1Mesh]);
  const icon2 = ray.intersectObjects([icon2Mesh]);

  if (icon1.length > 0) {
    console.log('icon1:' + imageId);
    for (let key in data) {
      if (imageId !== key) {
        continue;
      }

      trasition(0);
      return;
    }
  }

  if (icon2.length > 0) {
    console.log('icon2:' + imageId);
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
    console.log(contensIntersect[0].object.name);
    openModalWindow(imageId, contensIntersect[0].object.name);
  }
};

function initCameraControls() {
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.minDistance = 1.0;
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
    const infoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({map: loader.load('./image/info_icon.png'), alphaTest: 0.2}));
    infoMesh.name = i;
    setIconPosition(infoMesh, data[index].contents[i].theta, data[index].contents[i].phi);
    scene.add(infoMesh);
    contentsIconList.push(infoMesh);
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

  const r = 9.0;
  const x = r * Math.sin(theta) * Math.cos(phi);
  const z = r * Math.sin(theta) * Math.sin(phi);
  const y = r * Math.cos(theta);
  target.position.set(x, y, z);
  target.lookAt(new THREE.Vector3(0, 0, 0));
}

function getLinkIconMesh(link) {
  const iconMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({
      map: loader.load('./image/arrow_icon.png'),
      alphaTest: 0.2})
  );

  setIconPosition(iconMesh, link.theta, link.phi);
  return iconMesh;
}

function openModalWindow(dataIndex, contentIndex) {
  console.log('dataIndex -> ' + dataIndex + ', contentIndex -> ' + contentIndex);
  console.log('thumb -> ' + data[dataIndex].contents[contentIndex].thumb);

  // camera control off
  controls.enabled = false;

  const height = distanseVector3(new THREE.Vector3(0, 0, 0), camera.position) * 1.5;
  const width = height * (window.innerWidth / window.innerHeight);
  loader.load(data[dataIndex].contents[contentIndex].thumb, function(texture) {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      opacity: 0.5
    });
    modalMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    // modalMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({color: 0x000000}));
    scene.add(modalMesh);
    modalMesh.lookAt(camera.position);
    new TWEEN.Tween(modalMesh.position).to({x: 1, y: 1, z: 1}, 3000)
      .onUpdate(function(){log(modalMesh);}).start();
    log(modalMesh);
  });
}

function log(mesh) {
  console.log('modalMesh ->  x:' + mesh.position.x + ', y: -> ' + mesh.position.y);
}

function distanseVector3(v1, v2) {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  const dz = v1.z - v2.z;

  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}
