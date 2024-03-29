var ID = THREE.Math.randInt(0, 10000)+"";
var MAP_WIDTH = 2000;
var MAP_HEIGHT = 2000;
var WALL_HEIGHT = 200;
var me = null;
var cache = {};
var polySet = {poly: []};
var movementQueue = [];
var zeroVector = new THREE.Vector3(0, 0, 0);
var width = window.innerWidth;
var height = window.innerHeight - 4;
cache['mouse'] = [width/2, height/2];
cache['hand'] = [width/2, height/2];
var tip = document.getElementById('tip');
var hand = document.getElementById('hand');
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
stats.domElement.style.left = '200px';
container.appendChild(stats.domElement);
var light1 = new THREE.PointLight();
light1.position.set(0, 0, 0);
scene.add(light1);
//var light2 = new THREE.PointLight();
//light2.position.set(MAP_WIDTH/2, 1000, MAP_HEIGHT/2);
//scene.add(light2);
var light3 = new THREE.PointLight();
light3.position.set(-MAP_WIDTH/2, 1000, MAP_HEIGHT/2);
scene.add(light3);
var light4 = new THREE.PointLight();
light4.position.set(MAP_WIDTH/2, 1000, -MAP_HEIGHT/2);
scene.add(light4);



//element is a list of all objects on the browser, the fist object is the hero
var element = {},
    locations = new Array(MAP_WIDTH * MAP_HEIGHT);
var minionCounts = 0;//use this to retreive minion; for the first user minion_id is playerid + minionCounts; for the other, the other way around

function lockPointer() {
  navigator.pointer.lock(document.body, function() {
    tip.style.display = "none";
    hand.style.display = "block";
    hand.style.top = cache['hand'][0] + 'px';
    hand.style.left = cache['hand'][1] + 'px';
  });
}

//tree filling polygons 
var fillPoly = function (cords, func) {
  //cords is the array
  var i, j;
  var nodeX = [];
  if (typeof cords[0] == 'undefined') {
    console.log('cords[0] undefined');
    return
  }
  if (typeof cords[0][1] == 'undefined') {
    console.log('cords[0][1] undefined');
    return
  }

  var corners = cords.length;
  var Zmin = cords[0][1],
      Zmax = cords[0][1];
  for (i = 1; i < corners; i++) {
    if (cords[i][1] < Zmin) {
      Zmin = cords[i][1];
    }
    if (cords[i][1] > Zmax) {
      Zmax = cords[i][1];
    }
  }
  console.log("get the min and max");
  for (var pixelZ = Zmin+1; pixelZ < Zmax; pixelZ += 100) {
    var nodes = 0, j = corners - 1;
    for (i = 0; i < corners; i ++){  
      if (((cords[i][1] < pixelZ) && (cords[j][1] >=pixelZ)) ||  ((cords[j][1]<pixelZ) && (cords[i][1]>=pixelZ))) {
              nodeX[nodes++]= (cords[i][0]+(pixelZ-cords[i][1]) / (cords[j][1]-cords[i][1]) * (cords[j][0]-cords[i][0])); 
      }
      j = i;
    }  
    console.log("got the nodeX"); 
    i=0;
    while (i<nodes-1) {
      if (nodeX[i]>nodeX[i+1]) {
        swap=nodeX[i]; nodeX[i]=nodeX[i+1]; nodeX[i+1]=swap; if (i) i--; }
      else {
        i++; 
      }
    }
    console.log("sorted");
    for (i=0; i < nodes; i += 1) {
      for (j=nodeX[i] + 1; j < nodeX[i+1]; j += 100) {
        var tree = func();
        //tree.position.set(j, pixelZ);    
        
        tree.position.set(5, 5);    
        console.log("put the tree into position"+ j + " " + pixelZ); 
        console.log(tree);
        scene.add(tree);
      }
    }

  }
}




window.oncontextmenu = function(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
};
window.addEventListener('resize', onresize);
//document.addEventListener('click', onclick);
document.addEventListener('mousedown', mousedown);
document.getElementById('activate').addEventListener('click', function(event) {
  if (document.webkitIsFullScreen)
    lockPointer();
  else
    container.webkitRequestFullScreen(container.ALLOW_KEYBOARD_INPUT);

}, false);

function onresize(event) {
  width = window.innerWidth;
  height = window.innerHeight - 4;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function mousedown(event) {
  event.preventDefault();
  if (navigator.pointer.isLocked) {
    var vector = new THREE.Vector3((cache['hand'][1]/ width) * 2 - 1, -(cache['hand'][0]/ height) * 2 + 1, 1);
    projector.unprojectVector(vector, camera);
    var ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
    var intersections = ray.intersectObject(map);
    if (event.which == 1) { // left click
      if (intersections[0])
        attack('q', me, intersections[0].point);
    } else if (event.which == 3) { // right click
      //TODO 1. in range && enemy: attack 2. not inrange enemy: follow; 3. friend:
      //follow; 4. empty: go
		   

      if (intersections[0]) {
        var endPt = intersections[0].point;
			  //broadcast 
        move(ID, curent, dest); 
        console.log(shortestPath({x: me.position.x, y: me.position.z}, {x: endPt.x, y: endPt.z}, polySet, function(solutionPts) {
				movementQueue = [];
				if (solutionPts.length == 0) {
					movementQueue.push(endPt);
				} else {
					console.log(solutionPts);
					for (var i = 0; i < solutionPts.length; i++) {
						console.log("detour");
						movementQueue.push(new THREE.Vector3(solutionPts[i].x, 0, solutionPts[i].y));
					}
				}
			}));
		}
    }
  }
};

function updateKill (id) {
  element.id.alive = false;
  //element.id.mesh.visible = false;
  console.log(id + "is killed!!");
  if (window.socket && window.socket.readyState === WebSocket.OPEN) {
    socket.send(
        JSON.stringify({
        'type': 'kill'
        , 'victim': playerId
        , 'time': +new Date / 1000
    }));
  }  
}

function attack(letter, model, vector) {
  switch(letter) {
    case 'q':
      if (!model.q.visible) {
        model.q.scale.set(1, 1, 1);
        clearTimeout(model.timer);
        model.q.visible = true;
        model.q.position = vector;
        setTimeout(function() {
          model.timer = setInterval(function() {
            if (model.q.scale.x < 5)
              model.q.scale.multiplyScalar(1.1);
            else
              model.q.visible = false;
          }, 1000/60);
        }, 1000);
      }
      if (location[vector.x + vector])
        updateKill(location[vector.x + vector.z].id);
      break;
    case 'w':
      model.w.visible = !model.w.visible;
      break;
  }
}

var map_texture = new THREE.ImageUtils.loadTexture('grass.jpg');
map_texture.wrapT = map_texture.wrapS = THREE.RepeatWrapping;
map_texture.repeat.set(40, 40);
map_material = new THREE.MeshBasicMaterial({ map: map_texture });
var map = new Physijs.BoxMesh(new THREE.PlaneGeometry(MAP_WIDTH, MAP_HEIGHT), map_material, 0);
scene.add(map);


var loader = new THREE.JSONLoader();

loader.load('karthus.js', function (geometry) {
  var material = geometry.materials[0];
  cache['karthus'] = new THREE.Mesh(geometry, material);
  cache['karthus'].flipSided = true;
  cache['karthus'].rotation.x = Math.PI / 2;
  cache['karthus'].scale.set(.3, .3, .3);
  var champion = {
    health: 100,
    range:  10,
    damage: 20,
    isChamp: true,
    isAlive: true,
    isTeamA: true, // TODO there should be ways for champions to know whether they are team a or team be from the server
    mesh:   cache['karthus']
  }
  element[ID] = champion;
  init();
});

minion_ready = false;

loader.load('Blue_Minion_Wizard.js', function (geometry) {
  var material = geometry.materials[0];
  cache['minion'] = new THREE.Mesh(geometry, material);
  cache['minion'].flipSided = true;
  cache['minion'].rotation.x = Math.PI / 2;
  cache['minion'].scale.set(.2, .2, .2);
  minion_ready = true;
});

loader.load('beech.js', function (geometry) {
  var material = geometry.materials[0];
  cache['tree'] = new THREE.Mesh(geometry, material);
  cache['tree'].scale.multiplyScalar(20);
});

var wall_texture = new THREE.ImageUtils.loadTexture("map_texture.jpg");
wall_texture.wrapT = wall_texture.wrapS = THREE.RepeatWrapping;
wall_texture.repeat.set(10, 10);
var wall_material = new THREE.MeshBasicMaterial({ color : "0x333333", opacity : 0.6 });

// create walls
getDistance = function(x1, z1, x2, z2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(z1 - z2, 2));
};

var addWall = function(x1, z1, x2, z2) {
  var wall_geometry = new THREE.PlaneGeometry(getDistance(x1, z1, x2, z2), WALL_HEIGHT);
  var wall_mesh = new Physijs.BoxMesh(wall_geometry, wall_material, 0);
  wall_mesh.doubleSided = true;
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

function init() {
  me = THREE.SceneUtils.cloneObject(cache['karthus']);
  me.q = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: 0x3379b3 }));
  me.q.visible = false;
  me.q.position.set(0, Math.pow(10, 9), 0);
  scene.add(me.q);
  me.w = new THREE.Sprite({ map: THREE.ImageUtils.loadTexture('circle.png'), useScreenCoordinates: false });
  me.w.opacity = 0.5;
  me.w.position = me.position;
  me.w.visible = false;
  scene.add(me.w);

  me.barrier = new Physijs.CylinderMesh(new THREE.CylinderGeometry(17, 17, 50));
  me.barrier.position = me.position;
  me.barrier.visible = false;
  me.position.set(0, 26, 0);
  scene.add(me);
  scene.add(me.barrier);
  setInterval(function(){
    requestAnimationFrame(render);
  }, 1000/60);
}

//minions
minions = [];

function spawn_minion(x, z, vx, vz, team_number) {
  if (minion_ready) {
  //if (name == 'minion') {
    var minionObj = {
      health: 50,
      range:  50,
      damage: 5,
      isChampion: false,
      isAlive:    true
    }

    /*
    if (destY > 0) {
      //minions from the upper right corner! team A!
      //team A minions are all even number
      minionObj.teamA = true;
      element[ID + minionCounts] = minionObj;
    } else {
      minionObj.teamA = false;
      element[minionCounts + ID] = minionObj;
    }*/
    var minion = THREE.SceneUtils.cloneObject(cache['minion']);
    minion.barrier = new Physijs.CylinderMesh(new THREE.CylinderGeometry(5, 5, 10));
    minion.barrier.position = minion.position;
    minion.position.set(x, 26, z);
    scene.add(minion);
    scene.add(minion.barrier);
    //TODO need a selector to take it off from the scene
    minion.health = 50;
    minion.range = 50;
    minion.damage = 5;
    minion.team_number = team_number;
    minion.vx = vx;
    minion.vz = vz;
    minions.push(minion);
    // console.log(minion);
  //} else {
  //  console.error("No such entity: " + name);
  //}

  }
}

function spawn_minions() {
  spawn_minion(-MAP_WIDTH / 2 + 50, MAP_WIDTH / 2 - 50, 50, -50, 0);
  spawn_minion(MAP_WIDTH / 2 - 50, -MAP_WIDTH / 2 + 50, -50, 50, 1);
}

setInterval(function() {spawn_minions();}, 5000);

function render() {
  scene.simulate(undefined, 1);
  renderer.render(scene, camera);
  controls.update(clock.getDelta());
  stats.update();
}

function Controls(camera) {
  this.camera = camera;
  var up, down, left, right, x, z, pointerX, pointerY;
  var speed = 10;

  navigator.pointer = navigator.pointer || navigator.webkitPointer;
  function onfullscreen(event) {
    if (document.webkitIsFullScreen)
      lockPointer();
    else
      tip.style.display = "block";
    hand.style.display = "none";
  }
  function onlocklost(event) { tip.style.display = "block"; hand.style.display = "none"; }
  function onmousemove(event) {
    if (navigator.pointer.isLocked) {
      pointerX = event.movementX || event.webkitMovementX;
      pointerY = event.movementY || event.webkitMovementY;
      cache['hand'] = [
        THREE.Math.clamp(cache['hand'][0] + pointerY, 0, height - 10),
        THREE.Math.clamp(cache['hand'][1] + pointerX, 0, width - 10)
      ]
      hand.style.top = cache['hand'][0] + 'px';
      hand.style.left = cache['hand'][1] + 'px';
    }
  };

  document.addEventListener('webkitfullscreenchange', onfullscreen);
  document.addEventListener('webkitpointerlocklost', onlocklost);
  document.addEventListener('mousemove', onmousemove);
  document.addEventListener('keydown', function(event) {
    switch(event.keyCode) {
      case 87: /*w*/ attack('w', me, zeroVector); break;
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
   this.update_minions = function(delta) {
    //if (minions.length >= 1)
  //    console.log(minions[0].barrier.position);
//          console.log(locations[minions.position].barrier.getLinearVelocity);
  //    console.log(minions);
    for (var i = 0; i < minions.length; ++i) {
      
      minions[i].barrier.setLinearVelocity(new THREE.Vector3(minions[i].vx, 0, minions[i].vz));
      minions[i].barrier.setAngularVelocity(zeroVector);
      minions[i].barrier.setAngularFactor(zeroVector);
    }

    for (var i = 0; i < minions.length; ++i) {
      if (minions[i].team_number == 1) continue;
    
      //var idx = getLocationIdx(minion.barrier.position.x, minion.barrier.position.z);
      //console.log('minion: ' + idx);
      //locations[idx] = minions[i];

      for (var j = 0; j < minions.length; ++j) {
        if (minions[j].team_number == 0) continue;
        if (getDistance(minions[i].barrier.position.x, minions[i].barrier.position.z, minions[j].barrier.position.x, minions[j].barrier.position.z) < 10) {
          minions[i].barrier.setLinearVelocity(zeroVector);

        }
      }
    }
  }

  this.update = function(delta){
    if (cache['hand'][0] < 5)
      z -= speed;
    if (cache['hand'][0] > height - 15)
      z += speed;
    if (cache['hand'][1] < 5)
      x -= speed;
    if (cache['hand'][1] > width - 15)
      x += speed;


    if (x)
      camera.position.x = THREE.Math.clamp(camera.position.x + x, -MAP_WIDTH/2.8, MAP_WIDTH/2.8);
    if (z)
      camera.position.z = THREE.Math.clamp(camera.position.z + z, -MAP_HEIGHT/4.0, MAP_HEIGHT/1.9);

    me.rotation.z += .03;
    if (me.w.visible)
      me.w.rotation += .03;

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
    this.update_minions(delta);
  }
}


var connect = function() {
    var port = location.host == "localhost" ? 80 : 2011;
    window.socket = new WebSocket('ws://'+location.host+':'+port+'/websocket/'+ID);
    window.socket.onopen = function(event){ console.log('websocket opened') }
    window.socket.onclose = function(event){ console.log('websocket closed') }
    window.socket.onerror = function(event){ alert(event) }
    window.socket.onmessage = function(event){
      var msgs = JSON.parse(event.data);
      //console.log(msgs);
      for (i in msgs) {
        var msg = msgs[i];
        if (msg.type === 'pos') {
          //only propagate move while it's the champion
          if (msg['pos']) {
            var model;
            if (!element[msg.id]) {
              model = THREE.SceneUtils.cloneObject(cache['karthus']);
              var champion = {
                health: 100,
                range:  10,
                damage: 20,
                isChamp: true,
                isAlive: true,
                isTeamA:    true, // TODO there should be ways for champions to know whether they are team a or team be from the server
                mesh: model
              }

              element[msg.id] = champion

              model.barrier = new Physijs.CylinderMesh(new THREE.CylinderGeometry(17, 17, 50));
              model.barrier.position = model.position;
              scene.add(model);
              scene.add(model.barrier);
            }
            model = element[msg.id];
            model.position.set(msg.pos.px, msg.pos.py, msg.pos.pz);
            model.rotation.set(0, msg.pos.r + Math.PI, 0);
            model.barrier.__dirtyPosition = true;
            model.barrier.setAngularFactor(Game.zeroVector);
            model.barrier.setAngularVelocity(Game.zeroVector);

            model.barrier.setLinearVelocity(new THREE.Vector3(msg.pos.vx, 0, msg.pos.vz));
            clearTimeout(model.barrier.timer);
            model.barrier.timer = setTimeout((function(barrier) {
              barrier.setLinearVelocity(Game.zeroVector);
            })(model.barrier), 100);
          }
        } else if (msg.type === 'kill') {
          if (msg.victim == ID) {
            element[msg.victim].alive = false;
            //TODO myself gets killed!
          } else {
            console.error('KO!');
            element[msg.victim].alive = false;
            element[msg.victim].rotation.set(-Math.PI/2, 0, 0);
          }
        }
      }
    }
}

