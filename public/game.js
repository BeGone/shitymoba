var cache = {};
var zeroV = new THREE.Vector3(0, 0, 0);
var width = window.innerWidth;
var height = window.innerHeight - 4;
var container = document.getElementById('container');
var scene = new Physijs.Scene();
scene.setGravity(zeroV);
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
  innerBottom: {x:0, z:100},
  innerTop: {x:0, z:-100},
  innerLeft: {x:-100, z:0},
  innerRight: {x:100, z:0},
  bottomRightB: {x:300, z:400},
  bottomRightR: {x:400, z:300},
  bottomLeftB: {x:-300, z:400},
  bottomLeftL: {x:-400, z:300},
  topRightR: {x:400, z:-300},
  topRightT: {x:300, z:-400},
  topLeftT: {x:-300, z:-400},
  topLeftL: {x:-400, z:-300}
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
console.log(path);
/*
if (path.join() !== ['topLeftL', 'topLeftT', 'topRightR', 'topRightT', 'bottomLeftL', 'bottomLeftB', 'bottomRightB', 'bottomRightR', 'innerRight', 'innerTop', 'innerLeft', 'innerBottom'].join()) {
  throw new Error('Path finding error!');
}
*/

var directionsQueue = new Queue();

window.addEventListener('resize', onresize, false);
function onresize(event) {
  width = window.innerWidth;
  height = window.innerHeight - 4;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

document.addEventListener('click', function(event) {
  var vector = new THREE.Vector3((event.offsetX / width) * 2 - 1, -(event.offsetY / height) * 2 + 1, 1);
  projector.unprojectVector(vector, camera);
  var ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
  me.destination = ray.intersectObject(map)[0].point;

  var endNode = findClosestNode(me.destination);
  var startNode = findClosestNode(me.position);
  var newPath = dijkstra.find_path(graph, startNode, endNode);
  console.log(newPath);
  directionsQueue = new Queue();
  if (distanceFrom(me.position, me.destination) < distanceFrom(me.position, nodes[startNode])) {
    directionsQueue.enqueue(me.destination);
  } else {
    for (item in newPath) {
      directionsQueue.enqueue(nodes[newPath[item]]);
    }
    directionsQueue.enqueue(me.destination);  
  }
});

var map_texture = new THREE.ImageUtils.loadTexture('map_texture.jpg');
map_texture.wrapT = map_texture.wrapS = THREE.RepeatWrapping;
map_texture.repeat.set(10, 10);
map_material = new THREE.MeshBasicMaterial({ map: map_texture });
var map = new Physijs.BoxMesh(new THREE.PlaneGeometry(1000, 1000), map_material,  0);
scene.add(map);

cylinder_material = new THREE.MeshBasicMaterial({ color: 0x000000 })
var me = new Physijs.CylinderMesh(new THREE.CylinderGeometry(10, 10, 50), cylinder_material);
me.position.set(0, 35, -200);
scene.add(me);


var box = new Physijs.BoxMesh(new THREE.CubeGeometry(20, 100, 20));
box.position.set(0, 50, -250);
box.mass = 0;
scene.add(box);

me.castShadow = true;
map.receiveShadow  = true;

requestAnimationFrame(render);
function render() {
  scene.simulate(undefined, 1);
  renderer.render(scene, camera);
  renderer.shadowMapEnabled = true;
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
      if (distanceFrom(me.position, directionsQueue.peek()) < 1 && directionsQueue.getLength() > 1) {
        var item = directionsQueue.dequeue();
      }
      if (directionsQueue.getLength() <= 1 && distanceFrom(me.position, directionsQueue.peek()) < 1) {
        me.setLinearVelocity(zeroV);
      } else {
        var newDest = directionsQueue.peek();
        var newDestVector = new THREE.Vector3(newDest.x, 0, newDest.z);
        var normVector = me.position.subSelf(newDestVector).negate().normalize();
        var velocityVector = normVector.multiplyScalar(100);
        //console.log(directionsQueue);
        /*
        var ray = new THREE.Ray(me.position, normVector.subSelf(me.position).normalize());
        var intersectObjects = ray.intersectObject(box);

        var g = new THREE.Geometry();
        g.vertices = [
            me.position,
            me.destination
        ];
        var line = new THREE.Line(g, new THREE.LineBasicMaterial({ color : 0x0000ff }));
        scene.add(line);
        
        if (intersectObjects.length > 0) {
          console.log(intersectObjects)
        }
        */
        velocityVector.y = 0;
        me.setLinearVelocity(velocityVector);
      }
      me.setAngularVelocity(zeroV);
      me.setAngularFactor(zeroV);
    }
  }
}
