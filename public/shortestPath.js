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

        if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
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

var swapPoints = function (pt1, pt2) {
	var tx, ty;
	tx = pt1.x;
	ty = pt1.y;
	pt1.x = pt2.x;
	pt1.y = pt2.y;
	pt2.x = tx;
	pt2.y = ty;
}

//  Finds the shortest path from x1,y1 to x2,y2 that stays within the polygon set.

var shortestPath = function(pt1, pt2, polySet, solutionCallback) {
	var INF = 9999999;
	
	var pointList = [];
	
	var treeCount, polyI, i, j, bestI, bestJ;
	var bestDist, newDist;
	
	var solutionPoints = [];
	
	if ( pointInPolygonSet(pt2, polySet) )
	{
		console.log("point in polygon set");
		return false;
	}
	
	if (!lineInPolygonSet(pt1, pt2, polySet)) {
		console.log("I don't see any obstructions");
		solutionCallback(solutionPoints);
		return true;
	}
	
	pointList.push(pt1);
	
	for (polyI = 0; polyI < polySet.poly.length; polyI++) {
		for (i = 0; i < polySet.poly[polyI].pts.length; i++) {
			pointList.push(polySet.poly[polyI].pts[i]);
		}
	}
	pointList.push(pt2);

	//  Initialize the shortest-path tree to include just the startpoint.
	treeCount = 1; 
	pointList[0].totalDist = 0;

	//  Iteratively grow the shortest-path tree until it reaches the endpoint
	//  -- or until it becomes unable to grow, in which case exit with failure.
	bestJ = 0;
	while (bestJ < pointList.length - 1) {
		bestDist = INF;
		for (i = 0; i < treeCount; i++) {
			for (j = treeCount; j < pointList.length; j++) {
				if (!lineInPolygonSet(pointList[i], pointList[j], polySet)) {
					newDist = pointList[i].totalDist + calcDist(pointList[i].x, pointList[i].y, pointList[j].x, pointList[j].y);
					if (newDist < bestDist) {
						bestDist = newDist;
						bestI=i;
						bestJ=j; 
					}
				}
			}
		}
		if (bestDist == INF)
		{
			console.log("no solution?!");
			return false;   //  (no solution)
		}
		pointList[bestJ].prev = bestI;
		pointList[bestJ].totalDist = bestDist;
		swapPoints(pointList[bestJ], pointList[treeCount]);
		treeCount++; 
	}

	//  Load the solution arrays.
	var solutionNodes = -1;
	i = treeCount - 1;
	while (i > 0) {
		i = pointList[i].prev;
		solutionNodes++; 
	}
	j = solutionNodes - 1;
	i = treeCount - 1;
	while (j >= 0) {
		i = pointList[i].prev;
		solutionPoints.push(pointList[i]);
		j--; 
	}

	//  Success.
	solutionCallback(solutionPoints);
	return true; 
}