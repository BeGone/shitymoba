var ID = THREE.Math.randInt(0, 10000)+"";
var MAP_WIDTH = 2000;
var MAP_HEIGHT = 2000;
var WALL_HEIGHT = 200;
var me = null;
var cache = {};
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
container.appendChild(stats.domElement);
scene.add(new THREE.PointLight());

//element is a list of all objects on the browser, the fist object is the hero
var element = {},
    locations = new Array(MAP_WIDTH * MAP_HEIGHT);
var minionCounts = 0;//use this to retreive minion; for the first user minion_id is playerid + minionCounts; for the other, the other way around

var dijkstra = {
  single_source_shortest_paths: function(graph, s, d) {
    // Predecessor map for each node that has been encountered.
    // node ID => predecessor node ID
    var predecessors = {};

    // Costs of shortest paths from s to all nodes encountered.
    // node ID => cost
    var costs = {};
    costs[s] = 0;

    // Costs of shortest paths from s to all nodes encountered; differs from
    // `costs` in that it provides easy access to the node that currently has
    // the known shortest path from s.
    // XXX: Do we actually need both `costs` and `open`?
    var open = dijkstra.PriorityQueue.make();
    open.push(s, 0);

    var closest,
        u,
        cost_of_s_to_u,
        adjacent_nodes,
        cost_of_e,
        cost_of_s_to_u_plus_cost_of_e,
        cost_of_s_to_v,
        first_visit;
    while (open) {
      // In the nodes remaining in graph that have a known cost from s,
      // find the node, u, that currently has the shortest path from s.
      closest = open.pop();
      u = closest.value;
      cost_of_s_to_u = closest.cost;

      // Get nodes adjacent to u...
      adjacent_nodes = graph[u] || {};

      // ...and explore the edges that connect u to those nodes, updating
      // the cost of the shortest paths to any or all of those nodes as
      // necessary. v is the node across the current edge from u.
      for (var v in adjacent_nodes) {
        // Get the cost of the edge running from u to v.
        cost_of_e = adjacent_nodes[v];

        // Cost of s to u plus the cost of u to v across e--this is *a*
        // cost from s to v that may or may not be less than the current
        // known cost to v.
        cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;

        // If we haven't visited v yet OR if the current known cost from s to
        // v is greater than the new cost we just found (cost of s to u plus
        // cost of u to v across e), update v's cost in the cost list and
        // update v's predecessor in the predecessor list (it's now u).
        cost_of_s_to_v = costs[v];
        first_visit = (typeof costs[v] === 'undefined');
        if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
          costs[v] = cost_of_s_to_u_plus_cost_of_e;
          open.push(v, cost_of_s_to_u_plus_cost_of_e);
          predecessors[v] = u;
        }

        // If a destination node was specified and we reached it, we're done.
        if (v === d) {
          open = null;
          break;
        }
      }
    }

    if (typeof costs[d] === 'undefined') {
      var msg = ['Could not find a path from ', s, ' to ', d, '.'].join('');
      throw new Error(msg);
    }

    return predecessors;
  },

  extract_shortest_path_from_predecessor_list: function(predecessors, d) {
    var nodes = [];
    var u = d;
    var predecessor;
    while (u) {
      nodes.push(u);
      predecessor = predecessors[u];
      u = predecessors[u];
    }
    nodes.reverse();
    return nodes;
  },

  find_path: function(graph, s, d) {
    var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
    return dijkstra.extract_shortest_path_from_predecessor_list(
      predecessors, d);
  },

  /**
   * A very naive priority queue implementation.
   */
  PriorityQueue: {
    make: function (opts) {
      var T = dijkstra.PriorityQueue,
          t = {},
          opts = opts || {},
          key;
      for (key in T) {
        t[key] = T[key];
      }
      t.queue = [];
      t.sorter = opts.sorter || T.default_sorter;
      return t;
    },

    default_sorter: function (a, b) {
      return a.cost - b.cost;
    },

    /**
     * Add a new item to the queue and ensure the highest priority element
     * is at the front of the queue.
     */
    push: function (value, cost) {
      var item = {value: value, cost: cost};
      this.queue.push(item);
      this.queue.sort(this.sorter);
    },

    /**
     * Return the highest priority element in the queue.
     */
    pop: function () {
      return this.queue.shift();
    }
  }
};

var distanceFrom = function(cor1, cor2) {
  return Math.sqrt(Math.pow(cor1.x - cor2.x, 2) + Math.pow(cor1.z - cor2.z, 2));
}

nodes = {
  innerBottom: {x:0, z:MAP_HEIGHT*0.05},
  innerTop: {x:0, z:-MAP_HEIGHT*0.05},
  innerLeft: {x:-MAP_WIDTH*0.05, z:0},
  innerRight: {x:MAP_WIDTH*0.05, z:0},
  bottomRightB: {x:MAP_WIDTH*0.25, z:MAP_HEIGHT*0.35},
  bottomRightR: {x:MAP_WIDTH*0.35, z:MAP_HEIGHT*0.25},
  bottomLeftB: {x:-MAP_WIDTH*0.25, z:MAP_HEIGHT*0.35},
  bottomLeftL: {x:-MAP_WIDTH*0.35, z:MAP_HEIGHT*0.25},
  topRightR: {x:MAP_WIDTH*0.35, z:-MAP_HEIGHT*0.25},
  topRightT: {x:MAP_WIDTH*0.25, z:-MAP_HEIGHT*0.35},
  topLeftT: {x:-MAP_WIDTH*0.25, z:-MAP_HEIGHT*0.35},
  topLeftL: {x:-MAP_WIDTH*0.35, z:-MAP_HEIGHT*0.25}
}

var findClosestNode = function(pos) {
  var closestNode;
  var dist = Number.MAX_VALUE;
  for (node in nodes) {
    newDist = distanceFrom(pos, nodes[node]);
    if (newDist < dist) {
      closestNode = node;
      dist = newDist;
    }
  }
  return closestNode;
}

graph = {
  innerBottom: {bottomLeftB: distanceFrom(nodes.innerBottom, nodes.bottomLeftB),
              bottomLeftL: distanceFrom(nodes.innerBottom, nodes.bottomLeftL),
              bottomRightB: distanceFrom(nodes.innerBottom, nodes.bottomRightB),
              bottomRightR: distanceFrom(nodes.innerBottom, nodes.bottomRightR),
              topRightR: distanceFrom(nodes.innerBottom, nodes.topRightR),
              topRightT: distanceFrom(nodes.innerBottom, nodes.topRightT),
              topLeftT: distanceFrom(nodes.innerBottom, nodes.topLeftT),
              topLeftL: distanceFrom(nodes.innerBottom, nodes.topLeftL),
              innerRight: distanceFrom(nodes.innerBottom, nodes.innerRight),
              innerLeft: distanceFrom(nodes.innerBottom, nodes.innerLeft),
              innerTop: distanceFrom(nodes.innerBottom, nodes.innerTop)
             },
  innerTop: {bottomLeftB: distanceFrom(nodes.innerTop, nodes.bottomLeftB),
              bottomLeftL: distanceFrom(nodes.innerTop, nodes.bottomLeftL),
              bottomRightB: distanceFrom(nodes.innerTop, nodes.bottomRightB),
              bottomRightR: distanceFrom(nodes.innerTop, nodes.bottomRightR),
              topRightR: distanceFrom(nodes.innerTop, nodes.topRightR),
              topRightT: distanceFrom(nodes.innerTop, nodes.topRightT),
              topLeftT: distanceFrom(nodes.innerTop, nodes.topLeftT),
              topLeftL: distanceFrom(nodes.innerTop, nodes.topLeftL),
              innerRight: distanceFrom(nodes.innerTop, nodes.innerRight),
              innerLeft: distanceFrom(nodes.innerTop, nodes.innerLeft),
              innerBottom: distanceFrom(nodes.innerTop, nodes.innerBottom)
             },
  innerLeft: {bottomLeftB: distanceFrom(nodes.innerLeft, nodes.bottomLeftB),
              bottomLeftL: distanceFrom(nodes.innerLeft, nodes.bottomLeftL),
              bottomRightB: distanceFrom(nodes.innerLeft, nodes.bottomRightB),
              bottomRightR: distanceFrom(nodes.innerLeft, nodes.bottomRightR),
              topRightR: distanceFrom(nodes.innerLeft, nodes.topRightR),
              topRightT: distanceFrom(nodes.innerLeft, nodes.topRightT),
              topLeftT: distanceFrom(nodes.innerLeft, nodes.topLeftT),
              topLeftL: distanceFrom(nodes.innerLeft, nodes.topLeftL),
              innerRight: distanceFrom(nodes.innerLeft, nodes.innerRight),
              innerTop: distanceFrom(nodes.innerLeft, nodes.innerTop),
              innerBottom: distanceFrom(nodes.innerLeft, nodes.innerBottom)
             },
  innerRight:{bottomLeftB: distanceFrom(nodes.innerRight, nodes.bottomLeftB),
              bottomLeftL: distanceFrom(nodes.innerRight, nodes.bottomLeftL),
              bottomRightB: distanceFrom(nodes.innerRight, nodes.bottomRightB),
              bottomRightR: distanceFrom(nodes.innerRight, nodes.bottomRightR),
              topRightR: distanceFrom(nodes.innerRight, nodes.topRightR),
              topRightT: distanceFrom(nodes.innerRight, nodes.topRightT),
              topLeftT: distanceFrom(nodes.innerRight, nodes.topLeftT),
              topLeftL: distanceFrom(nodes.innerRight, nodes.topLeftL),
              innerLeft: distanceFrom(nodes.innerRight, nodes.innerLeft),
              innerTop: distanceFrom(nodes.innerRight, nodes.innerTop),
              innerBottom: distanceFrom(nodes.innerRight, nodes.innerBottom)
             },
  bottomRightB:{bottomLeftB: distanceFrom(nodes.bottomRightB, nodes.bottomLeftB),
              bottomRightR: distanceFrom(nodes.bottomRightB, nodes.bottomRightR),
              innerLeft: distanceFrom(nodes.bottomRightB, nodes.innerLeft),
              innerTop: distanceFrom(nodes.bottomRightB, nodes.innerTop),
              innerBottom: distanceFrom(nodes.bottomRightB, nodes.innerBottom),
              innerRight: distanceFrom(nodes.bottomRightB, nodes.innerRight),
              topLeftT: distanceFrom(nodes.bottomRightB, nodes.topLeftT),
              topLeftL: distanceFrom(nodes.bottomRightB, nodes.topLeftL)
             },
  bottomRightR:{topRightR: distanceFrom(nodes.bottomRightR, nodes.topRightR),
              bottomRightB: distanceFrom(nodes.bottomRightR, nodes.bottomRightB),
              innerLeft: distanceFrom(nodes.bottomRightR, nodes.innerLeft),
              innerTop: distanceFrom(nodes.bottomRightR, nodes.innerTop),
              innerBottom: distanceFrom(nodes.bottomRightR, nodes.innerBottom),
              innerRight: distanceFrom(nodes.bottomRightR, nodes.innerRight),
              topLeftT: distanceFrom(nodes.bottomRightR, nodes.topLeftT),
              topLeftL: distanceFrom(nodes.bottomRightR, nodes.topLeftL)
             },
  bottomLeftB:{bottomRightB: distanceFrom(nodes.bottomLeftB, nodes.bottomRightB),
              bottomLeftL: distanceFrom(nodes.bottomLeftB, nodes.bottomLeftL),
              innerLeft: distanceFrom(nodes.bottomLeftB, nodes.innerLeft),
              innerTop: distanceFrom(nodes.bottomLeftB, nodes.innerTop),
              innerBottom: distanceFrom(nodes.bottomLeftB, nodes.innerBottom),
              innerRight: distanceFrom(nodes.bottomLeftB, nodes.innerRight),
              topRightT: distanceFrom(nodes.bottomLeftB, nodes.topRightT),
              topRightR: distanceFrom(nodes.bottomLeftB, nodes.topRightR)
             },
  bottomLeftL:{topLeftL: distanceFrom(nodes.bottomLeftL, nodes.topLeftL),
              bottomLeftB: distanceFrom(nodes.bottomLeftL, nodes.bottomLeftB),
              innerLeft: distanceFrom(nodes.bottomLeftL, nodes.innerLeft),
              innerTop: distanceFrom(nodes.bottomLeftL, nodes.innerTop),
              innerBottom: distanceFrom(nodes.bottomLeftL, nodes.innerBottom),
              innerRight: distanceFrom(nodes.bottomLeftL, nodes.innerRight),
              topRightT: distanceFrom(nodes.bottomLeftL, nodes.topRightT),
              topRightR: distanceFrom(nodes.bottomLeftL, nodes.topRightR)
             },
  topRightR: {topRightT: distanceFrom(nodes.topRightR, nodes.topRightT),
              bottomRightR: distanceFrom(nodes.topRightR, nodes.bottomRightR),
              innerLeft: distanceFrom(nodes.topRightR, nodes.innerLeft),
              innerTop: distanceFrom(nodes.topRightR, nodes.innerTop),
              innerBottom: distanceFrom(nodes.topRightR, nodes.innerBottom),
              innerRight: distanceFrom(nodes.topRightR, nodes.innerRight),
              bottomLeftB: distanceFrom(nodes.topRightR, nodes.bottomLeftB),
              bottomLeftL: distanceFrom(nodes.topRightR, nodes.bottomLeftL)
             },
  topRightT: { topLeftT: distanceFrom(nodes.topRightT, nodes.topLeftT),
              topRightR: distanceFrom(nodes.topRightT, nodes.topRightR),
              innerLeft: distanceFrom(nodes.topRightT, nodes.innerLeft),
              innerTop: distanceFrom(nodes.topRightT, nodes.innerTop),
              innerBottom: distanceFrom(nodes.topRightT, nodes.innerBottom),
              innerRight: distanceFrom(nodes.topRightT, nodes.innerRight),
              bottomLeftB: distanceFrom(nodes.topRightT, nodes.bottomLeftB),
              bottomLeftL: distanceFrom(nodes.topRightT, nodes.bottomLeftL)
            },
  topLeftT: { topLeftL: distanceFrom(nodes.topLeftT, nodes.topLeftL),
              topRightT: distanceFrom(nodes.topLeftT, nodes.topRightT),
              innerLeft: distanceFrom(nodes.topLeftT, nodes.innerLeft),
              innerTop: distanceFrom(nodes.topLeftT, nodes.innerTop),
              innerBottom: distanceFrom(nodes.topLeftT, nodes.innerBottom),
              innerRight: distanceFrom(nodes.topLeftT, nodes.innerRight),
              bottomRightB: distanceFrom(nodes.topLeftT, nodes.bottomRightB),
              bottomRightR: distanceFrom(nodes.topLeftT, nodes.bottomRightR)
            },
  topLeftL: { topLeftT: distanceFrom(nodes.topLeftL, nodes.topLeftT),
              bottomLeftL: distanceFrom(nodes.topLeftL, nodes.bottomLeftL),
              innerLeft: distanceFrom(nodes.topLeftL, nodes.innerLeft),
              innerTop: distanceFrom(nodes.topLeftL, nodes.innerTop),
              innerBottom: distanceFrom(nodes.topLeftL, nodes.innerBottom),
              innerRight: distanceFrom(nodes.topLeftL, nodes.innerRight),
              bottomRightB: distanceFrom(nodes.topLeftL, nodes.bottomRightB),
              bottomRightR: distanceFrom(nodes.topLeftL, nodes.bottomRightR)
            }
};

var path = dijkstra.find_path(graph, 'topLeftL', 'topRightR');
/*
if (path.join() !== ['topLeftL', 'topLeftT', 'topRightR', 'topRightT', 'bottomLeftL', 'bottomLeftB', 'bottomRightB', 'bottomRightR', 'innerRight', 'innerTop', 'innerLeft', 'innerBottom'].join()) {
  throw new Error('Path finding error!');
}
*/

var directionsQueue = new Queue();


function lockPointer() {
  navigator.pointer.lock(document.body, function() {
    tip.style.display = "none";
    hand.style.display = "block";
    hand.style.top = cache['hand'][0] + 'px';
    hand.style.left = cache['hand'][1] + 'px';
  });
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
      if (intersections[0])
        me.destination = intersections[0].point;

      var endNode = findClosestNode(me.destination);
      var startNode = findClosestNode(me.position);
      var newPath = dijkstra.find_path(graph, startNode, endNode);
      //console.log(newPath);
      directionsQueue = new Queue();
      if (distanceFrom(me.position, me.destination) < distanceFrom(me.position, nodes[startNode])){
        directionsQueue.enqueue(me.destination);
      } else {
        for (item in newPath) {
          directionsQueue.enqueue(nodes[newPath[item]]);
        }
        directionsQueue.enqueue(me.destination);
      }
    }
  }
};

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
      break;
  }
}

var map_texture = new THREE.ImageUtils.loadTexture('map_texture.jpg');
map_texture.wrapT = map_texture.wrapS = THREE.RepeatWrapping;
map_texture.repeat.set(100, 100);
map_material = new THREE.MeshBasicMaterial({ map: map_texture });
var map = new Physijs.BoxMesh(new THREE.PlaneGeometry(MAP_WIDTH, MAP_HEIGHT), map_material,  0);
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
    isTeamA: true // TODO there should be ways for champions to know whether they are team a or team be from the server
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

function init() {
  me = THREE.SceneUtils.cloneObject(cache['karthus']);
  me.q = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: 0xA52A2A }));
  me.q.visible = false;
  me.q.position.set(0, Math.pow(10, 9), 0);
  scene.add(me.q);
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
minions = new Array(100);
function spawn_minion(x, z, vx, vz, destX, destY) {
  if (minion_ready) {
  //if (name == 'minion') {
    var minionObj = {
      health: 50,
      range:  5,
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
    minions.push(minionObj);
    minion.barrier.setLinearVelocity(new THREE.Vector3(vx, 0, vz));
    minion.barrier.setAngularVelocity(zeroVector);
    minion.barrier.setAngularFactor(zeroVector);
  //} else {
  //  console.error("No such entity: " + name);
  //}

  }
}

function spawn_minions() {
  spawn_minion(-MAP_WIDTH / 2 + 50, MAP_WIDTH / 2 - 50, 50, -50);
  spawn_minion(MAP_WIDTH / 2 - 50, -MAP_WIDTH / 2 + 50, -50, 50);
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
  this.update_minions = function(delta) { }
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

    if (me && me.destination) {
      if (distanceFrom(me.position, directionsQueue.peek()) < 1 && directionsQueue.getLength() > 1) {
        var item = directionsQueue.dequeue();
      }
      if (directionsQueue.getLength() <= 1 && distanceFrom(me.position, directionsQueue.peek()) < 1) {
        me.barrier.setLinearVelocity(zeroVector);
      } else {
        var newDest = directionsQueue.peek();
        var newDestVector = new THREE.Vector3(newDest.x, 0, newDest.z);
        var normVector = me.position.clone().subSelf(newDestVector).negate().normalize();
        var velocityVector = normVector.multiplyScalar(100);
        velocityVector.y = 0;
        me.barrier.setLinearVelocity(velocityVector);
      }
      me.barrier.setAngularVelocity(zeroVector);
      me.barrier.setAngularFactor(zeroVector);
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
                isTeamA:    true // TODO there should be ways for champions to know whether they are team a or team be from the server
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

