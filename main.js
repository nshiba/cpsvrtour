(function(){
  //オブジェクト格納グローバル変数
  var mouse = { x: 0, y: 0 };
  var width = window.innerWidth;
  var height = window.innerHeight;
  var scene = new THREE.Scene();
  var sphereGeo = new THREE.SphereGeometry( 5, 60, 40 );
  var loader = new THREE.TextureLoader();
  var sphere;
  var imageId = 'image1';

  httpObj = new XMLHttpRequest();
  httpObj.open('get', 'data.json', true);
  httpObj.onload = function() {
    var data = JSON.parse(this.responseText);
    console.log('image data -> ' + data["image1"].id);
    main(data);
  }
  httpObj.send(null);

  function main(data) {
    sphereGeo.scale(-1, 1, 1);
    sphere = new THREE.Mesh(sphereGeo, loadSphereImage(data[imageId].path));
    imageId = data[imageId].id;
    scene.add(sphere);
    console.log('sphere position -> ' + sphere.position.x + ', ' + sphere.position.y + ', ' + sphere.position.z );

    //camera
    var camera = new THREE.PerspectiveCamera(75, width / height, 1, 2000);
    camera.position.set(0,0,0.1);
    camera.lookAt(sphere.position);

    // iconを作る
    var icon1Mesh = getLinkIconMesh(data[imageId].link[0]);
    var icon2Mesh = getLinkIconMesh(data[imageId].link[1]);
    scene.add(icon1Mesh);
    scene.add(icon2Mesh);

    //render
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(width,height);
    renderer.setClearColor({color: 0x000000});
    document.getElementById('stage').appendChild(renderer.domElement);
    renderer.render(scene,camera);

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.minDistance = 3.0;
    controls.maxDistance = 10.0;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI * 1; // 0.5なら下からのぞき込めなくなる

    render();

    //マウスが押された時
    window.onmousedown = function (ev){
      if (ev.target != renderer.domElement) {
        return;
      }

      //マウス座標2D変換
      var rect = ev.target.getBoundingClientRect();
      mouse.x =  ev.clientX - rect.left;
      mouse.y =  ev.clientY - rect.top;

      //マウス座標3D変換 width（横）やheight（縦）は画面サイズ
      mouse.x =  (mouse.x / width) * 2 - 1;
      mouse.y = -(mouse.y / height) * 2 + 1;

      // マウスベクトル
      var vector = new THREE.Vector3( mouse.x, mouse.y ,1);

      // vector はスクリーン座標系なので, オブジェクトの座標系に変換
      vector.unproject(camera);

      // 始点, 向きベクトルを渡してレイを作成
      var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

      // クリック判定
      var icon1 = ray.intersectObjects([icon1Mesh]);
      var icon2 = ray.intersectObjects([icon2Mesh]);

      if (icon1.length > 0) {
        console.log('icon1:' + imageId);
        for (key in data) {
          if (imageId != key) {
            continue;
          }

          trasition(0);
          return;
        }
      }

      if (icon2.length > 0) {
        console.log('icon2:' + imageId);
        for (key in data) {
          if (imageId != key) {
            continue;
          }

          trasition(1);
          return;
        }
      }
    };

    function addContentsIcon() {
    }

    function trasition (linkIndex) {
      var nextId = data[key].link[linkIndex].linkId;
      console.log('theta:' + data[nextId].link[0].theta + ', phi:' + data[nextId].link[0].phi);
      sphere.material = loadSphereImage(data[nextId].path);
      setIconPosition(icon1Mesh, data[nextId].link[0].theta, data[nextId].link[0].phi);
      setIconPosition(icon2Mesh, data[nextId].link[1].theta, data[nextId].link[1].phi);
      imageId = nextId;
    }

    function render(){
      requestAnimationFrame(render);
      // sphere.rotation.y += 0.05 * Math.PI/180;
      //画面リサイズ対応
      window.addEventListener( 'resize', onWindowResize, false );
      renderer.render(scene,camera);
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

      var r = 4.8;
      var x = r * Math.sin(theta) * Math.cos(phi);
      var z = r * Math.sin(theta) * Math.sin(phi);
      var y = r * Math.cos(theta);
      target.position.set(x, y, z);
      target.lookAt(new THREE.Vector3(0, 0, 0));
    }

    function getLinkIconMesh(link) {
      var iconMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map: loader.load('icon.png')}));
      setIconPosition(iconMesh, link.theta, link.phi);
      return iconMesh;
    }
  }

  // imageクラス
  var ImageEntity = function(id, path, link) {
    this.id = id;
    this.path = path;
    this.link = link;
  }

  // linkクラス
  var LinkEntity = function(linkId, theta, phi) {
    this.linkId = linkId;
    this.theta = theta;
    this.phi = phi;
  }
})();
