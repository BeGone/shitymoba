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

var lineIntersects = function ( start1, end1, start2, end2) {
	var denom = ((end1.x - start1.x) * (end2.y - start2.y)) - ((end1.y - start1.y) * (end2.x - start2.x));
	if (denom == 0) return false;
    var numer = ((start1.y - start2.y) * (end2.x - start2.x)) - ((start1.x - start2.x) * (end2.y - start2.y));
	var r = numer / denom;
    var numer2 = ((start1.Y - start2.Y) * (end1.X - start1.X)) - ((start1.X - start2.X) * (end1.Y - start1.Y));
    var s = numer2 / denom;

    if ((r < 0 || r > 1) || (s < 0 || s > 1)) return false;

    return true;
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
				if (lineInPolygonSet(pointList[i], pointList[j], polySet)) {
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