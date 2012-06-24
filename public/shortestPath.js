// JavaScript code based off public-domain code by Darel Rex Finley, 2006.

// This function checks if a point lies within a restricted access polygon
var isPointInPoly = function(poly, pt) {
	for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
		((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
		&& (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
		&& (c = !c);
	return c;
};

var pointInPolygonSet = function ( pt, polySet ) {
	for (var polyI = 0; polyI < polySet.poly.length; polyI++) {
		if (isPointInPoly(polySet.poly[polyI].pts, pt)) {
			return true;
		}
	}
	return false;
};

var lineIntersects = function(a1, a2, b1, b2) {
    var result;
    
    var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
    var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
    var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

    if ( u_b != 0 ) {
        var ua = ua_t / u_b;
        var ub = ub_t / u_b;

        if ( 0 < ua && ua < 1 && 0 < ub && ub < 1 ) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

// This function checks if a line lies in a restricted access polygon
var lineIntersectsPoly = function(pt1, pt2, poly) {
	for (var i = 0; i < poly.length; i++) {
		if (lineIntersects( pt1, pt2, {x: poly[i].x, y: poly[i].y}, {x: poly[(i + 1) % poly.length].x, y: poly[(i + 1) % poly.length].y} )) return true;
	}
	return false;
}

var lineInPolygonSet = function ( pt1, pt2, polySet ) {
	for (var polyI = 0; polyI < polySet.poly.length; polyI++) {
		if (lineIntersectsPoly(pt1, pt2, polySet.poly[polyI].pts)) return true;
	}
	return false;
};

var calcDist = function (x1, y1, x2, y2) {
	x2 -= x1;
	y2 -= y1;
	return Math.sqrt(x2*x2+y2*y2); 
}

//  Finds the shortest path from x1,y1 to x2,y2 that stays within the polygon set.

var shortestPath = function(pt1, pt2, polySet, solutionCallback) {
	var nodes = []
	var openList = [];
	var closedList = [];
	
	console.log(polySet);
	
	if ( pointInPolygonSet(pt2, polySet) ) {
		console.log("point in polygon set");
		return false;
	}
	
	if (!lineInPolygonSet(pt1, pt2, polySet)) {
		console.log("I don't see any obstructions");
		solutionCallback(closedList);
		return true;
	}
	
	for (polyI = 0; polyI < polySet.poly.length; polyI++) {
		for (i = 0; i < polySet.poly[polyI].pts.length; i++) {
			polySet.poly[polyI].pts[i].list = "wild";
			nodes.push(polySet.poly[polyI].pts[i]);
		}
	}
	pt2.list = "wild";
	nodes.push(pt2);
	
	pt1.list = "open";
	pt1.g = 0;
	pt1.h = calcDist(pt1.x, pt1.y, pt2.x, pt2.y);
	openList.push(pt1);
	
	while ( openList.length > 0 ) {
		var currNode = {};
		currNode.g = 99999;
		currNode.h = 99999;
		for (i = 0; i < openList.length; i++) {
			if ((openList[i].g + openList[i].h) < (currNode.g + currNode.h)) {
				currNode = openList[i];
			}
		}
		currNode.list = "closed";
		var index = openList.indexOf(currNode);
		openList.splice(index, 1);
		closedList.push(currNode);
		
		if (currNode == pt2) {
			console.log("target " + pt2.x + ", " + pt2.y + " reached");
			break;
		}
		
		for (i = 0; i < nodes.length; i++) {
			if (nodes[i].list != "closed") {
				if (!lineInPolygonSet(currNode, nodes[i], polySet)) {
					if (nodes[i].list != "open") {
						nodes[i].list = "open";
						openList.push(nodes[i]);
					}
					nodes[i].g = calcDist(currNode.x, currNode.y, nodes[i].x, nodes[i].y);
					nodes[i].h = calcDist(nodes[i].x, nodes[i].y, pt2.x, pt2.y);
				}
			}
		}
	}
	
	console.log("loop terminate");
	
	//  Success.
	solutionCallback(closedList);
	return true; 
}