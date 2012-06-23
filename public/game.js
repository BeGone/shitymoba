var cache = {};
var width = window.innerWidth;
var height = window.innerHeight - 4;
var container = document.getElementById('container');
var scene = new Physijs.Scene();
scene.setGravity(new THREE.Vector3(0, 0, 0));
var camera = new THREE.PerspectiveCamera(40, width / height, 1, 100000);
camera.position.set(0, 500, 0);
camera.rotation.x = -Math.PI/3;
scene.add(camera);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
container.appendChild(renderer.domElement);
var clock = new THREE.Clock();
var projector = new THREE.Projector();
var controls = new Controls(camera);
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

//var currentClickVector;
//var currentWaypointLoc;

var setNewWaypoint = function (clickPosition) {
  currentClickVector = new Three.Vector3(clickPosition.x - me.position.x, clickPosition.y - me.position.y, clickPosition.z - me.position.z);
  currentWaypoint = clickPosition;
}

document.addEventListener('click', function(event) {
  var vector = new THREE.Vector3((event.offsetX / width) * 2 - 1, -(event.offsetY / height) * 2 + 1, 1);
  projector.unprojectVector(vector, camera);
  var ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
  me.destination = ray.intersectObject(map)[0].point;
});

var map_texture = new THREE.ImageUtils.loadTexture('map_texture.jpg');
map_texture.wrapT = map_texture.wrapS = THREE.RepeatWrapping;
map_texture.repeat.set(10, 10);
var map = new Physijs.BoxMesh(new THREE.PlaneGeometry(1000, 1000),
          new THREE.MeshBasicMaterial({ map: map_texture }), 0);
scene.add(map);

var me = new Physijs.CylinderMesh(new THREE.CylinderGeometry(10, 10, 50));
me.position.set(0, 26, -200);
scene.add(me);

requestAnimationFrame(render);
function render() {
  scene.simulate(undefined, 1);
  renderer.render(scene, camera);
  controls.update(clock.getDelta());
  stats.update();
  requestAnimationFrame(render);
}

function Controls(camera) {
  this.camera = camera;
  var up, down, left, right;

  document.addEventListener('keydown', function(event) {
    switch(event.keyCode) {
      case 38: /*up*/ up = true; break;
      case 37: /*left*/ left = true; break;
      case 40: /*down*/ down = true; break;
      case 39: /*right*/ right = true; break;
    }
  });
  document.addEventListener('keyup', function(event) {
    switch(event.keyCode) {
      case 38: /*up*/ up = false; break;
      case 37: /*left*/ left = false; break;
      case 40: /*down*/ down = false; break;
      case 39: /*right*/ right = false; break;
    }
  });

  this.update = function(delta){
    if (up && !down)
      camera.position.z = THREE.Math.clamp(camera.position.z - 10, 0, 600);
    if (!up && down)
      camera.position.z = THREE.Math.clamp(camera.position.z + 10, 0, 600);
    if (left && !right)
      camera.position.x = THREE.Math.clamp(camera.position.x - 10, -200, 200);
    if (!left && right)
      camera.position.x = THREE.Math.clamp(camera.position.x + 10, -200, 200);

    if (me && me.destination) {
      var vector = me.position.subSelf(me.destination).normalize().negate().multiplyScalar(100);
      vector.y = 0;
      me.setLinearVelocity(vector);
    }
  }
}
