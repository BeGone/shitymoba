var width = window.innerWidth;
var height = window.innerHeight - 4;
var container = document.getElementById('container');
var scene = new Physijs.Scene();
var camera = new THREE.PerspectiveCamera(40, width / height, 1, 100000);
camera.position.set(0, 500, 0);
camera.rotation.x = -Math.PI/3;
scene.add(camera);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
container.appendChild(renderer.domElement);
var stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0';
container.appendChild(stats.domElement);

window.addEventListener('resize', onresize, false);
function onresize(event) {
  width = window.innerWidth;
  height = window.innerHeight - 4;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

var map_texture = new THREE.ImageUtils.loadTexture('map_texture.jpg');
var map = new Physijs.BoxMesh(new THREE.PlaneGeometry(1000, 1000),
          new THREE.MeshBasicMaterial({ map: map_texture }), 0);
scene.add(map);

requestAnimationFrame(render);
function render() {
  scene.simulate(undefined, 1);
  renderer.render(scene, camera);
  //controls.update(clock.getDelta());
  stats.update();
  requestAnimationFrame(render);
}
