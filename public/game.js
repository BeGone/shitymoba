var MAP_WIDTH = 2000;
var MAP_HEIGHT = 2000;
var WALL_HEIGHT = 200;
var polySet = {poly: []};
var movementQueue = [];
var me = null;
var cache = {};
var zeroVector = new THREE.Vector3(0, 0, 0);
var width = window.innerWidth;
var height = window.innerHeight - 4;
cache['mouse'] = [width/2, height/2];
var container = document.getElementById('container');
var scene = new Physijs.Scene();
scene.setGravity(zeroVector);
var camera = new THREE.PerspectiveCamera(40, width / height, 1, 100000);
camera.position.set(0, 500, 200);
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
scene.add(new THREE.PointLight());

window.addEventListener('resize', onresize, false);
document.addEventListener('click', onclick, false);
document.addEventListener('mousemove', function (e) { cache['mouse'] = [e.offsetX, e.offsetY] });

function onresize(event) {
  width = window.innerWidth;
  height = window.innerHeight - 4;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function onclick(event) {
  var vector = new THREE.Vector3((event.offsetX / width) * 2 - 1, -(event.offsetY / height) * 2 + 1, 1);
  projector.unprojectVector(vector, camera);
  var ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
  var intersections = ray.intersectObject(map);
  if (intersections[0])
  {
	var endPt = ray.intersectObject(map)[0].point;
	console.log(shortestPath({x: me.position.x, y: me.position.z}, {x: endPt.x, y: endPt.z}, polySet, function(solutionPts) {
		movementQueue = [];
		if (solutionPts.length == 0) {
			movementQueue.push(endPt);
		} else {
			for (var i = 0; i < solutionPts.length; i++) {
				console.log("detour");
				movementQueue.push(new THREE.Vector3(solutionPts[i].x, 0, solutionPts[i].y));
			}
		}
	}));
  }
};

var map_texture = new THREE.ImageUtils.loadTexture('map_texture.jpg');
map_texture.wrapT = map_texture.wrapS = THREE.RepeatWrapping;
map_texture.repeat.set(100, 100);
map_material = new THREE.MeshBasicMaterial({ map: map_texture });
var map = new Physijs.BoxMesh(new THREE.PlaneGeometry(MAP_WIDTH, MAP_HEIGHT), map_material,  0);
scene.add(map);

requestAnimationFrame(render);


var loader = new THREE.JSONLoader();

loader.load('karthus.js', function (geometry) {
  var material = geometry.materials[0];
  cache['karthus'] = new THREE.Mesh(geometry, material);
  cache['karthus'].flipSided = true;
  cache['karthus'].rotation.x = Math.PI / 2;
  cache['karthus'].scale.set(.3, .3, .3);
  init();
});

var wall_texture = new THREE.ImageUtils.loadTexture("map_texture.jpg");
wall_texture.wrapT = wall_texture.wrapS = THREE.RepeatWrapping;
wall_texture.repeat.set(10, 10);
var wall_material = new THREE.MeshBasicMaterial({ color : "0x333333", opacity : 0.6 });

// create walls
getDistance = function(x1, z1, x2, z2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(z1 - z2, 2));
};

addWall = function(x1, z1, x2, z2) {
  var wall_geometry = new THREE.PlaneGeometry(getDistance(x1, z1, x2, z2), WALL_HEIGHT);
  var wall_mesh = new Physijs.BoxMesh(wall_geometry, wall_material, 0);
  wall_mesh.name = 'wall';
  wall_mesh.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
  wall_mesh.rotation.z = Math.atan((z2 - z1) / (x2 - x1));
  wall_mesh.rotation.x = Math.PI / 2;

  scene.add(wall_mesh);
};

var wall_coords = [
    [-MAP_WIDTH / 2, MAP_HEIGHT / 2, MAP_WIDTH / 2, MAP_HEIGHT / 2],
  [-MAP_WIDTH * 5 / 12, MAP_HEIGHT / 4, -MAP_WIDTH / 3, MAP_HEIGHT / 4],
  [-MAP_WIDTH / 4, MAP_HEIGHT / 6, -MAP_WIDTH * 5 / 12, MAP_HEIGHT / 12],
  [-MAP_WIDTH * 5 / 12, MAP_HEIGHT / 12, -MAP_WIDTH * 5 / 12, -MAP_HEIGHT * 4 / 12],
  [-MAP_WIDTH * 5 / 12, -MAP_HEIGHT * 4 / 12, -MAP_WIDTH / 12, 0],
  [-MAP_WIDTH / 12, 0,  -MAP_WIDTH / 4, MAP_HEIGHT / 6]
];

function init() {
  me = THREE.SceneUtils.cloneObject(cache['karthus']);
  me.barrier = new Physijs.CylinderMesh(new THREE.CylinderGeometry(17, 17, 50));
  me.barrier.position = me.position;
  me.position.set(0, 26, 0);
  scene.add(me);
  scene.add(me.barrier);

  for (var i = 0; i < wall_coords.length; ++i) {
    addWall(wall_coords[i][0], wall_coords[i][1], wall_coords[i][2], wall_coords[i][3]);
    addWall(wall_coords[i][1], wall_coords[i][0], wall_coords[i][3], wall_coords[i][2]);
    addWall(-wall_coords[i][1], -wall_coords[i][0], -wall_coords[i][3], -wall_coords[i][2]);
    addWall(-wall_coords[i][0], -wall_coords[i][1], -wall_coords[i][2], -wall_coords[i][3]);
  }

	var pts_objects = [];
	
	for (var i = 2; i < 6; ++i) {
		var pt = {};
		pt.x = wall_coords[i][0];
		pt.y = wall_coords[i][1];
		pts_objects.push(pt);
	}
	
	polySet.poly.push({pts: pts_objects});
  
  requestAnimationFrame(render);
}

function render() {
  scene.simulate(undefined, 1);
  renderer.render(scene, camera);
  controls.update(clock.getDelta());
  stats.update();
  requestAnimationFrame(render);
}

function Controls(camera) {
  this.camera = camera;
  var up, down, left, right, x, z;
  var speed = 10;

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
    if (up && !down || cache['mouse'][1] < 30)
      z -= speed;
    if (!up && down || cache['mouse'][1] > height - 30)
      z += speed;
    if (left && !right || cache['mouse'][0] < 30)
      x -= speed;
    if (!left && right || cache['mouse'][0] > width - 30)
      x += speed;

    if (x)
      camera.position.x = THREE.Math.clamp(camera.position.x + x, -MAP_WIDTH + 200, MAP_WIDTH - 200);
    if (z)
      camera.position.z = THREE.Math.clamp(camera.position.z + z, -MAP_HEIGHT + 550, MAP_HEIGHT);

    if (me) {
		if (!me.destination || (!me.position.equals(me.destination))) {
			if (movementQueue.length != 0) {
				me.destination = movementQueue.shift();
			}
		}
		if (me.destination) {
			var newDestVector = new THREE.Vector3(me.destination.x, 0, me.destination.z);
			var normVector = me.position.clone().subSelf(newDestVector).negate().normalize();
			var velocityVector = normVector.multiplyScalar(100);
			velocityVector.y = 0;
			me.barrier.setLinearVelocity(velocityVector);
			me.barrier.setAngularVelocity(zeroVector);
			me.barrier.setAngularFactor(zeroVector);
		}
    }

    x = 0;
    z = 0;
  }
}