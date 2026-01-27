// src/utils/shortestPath.js
// Enhanced Dijkstra that handles points between nodes

export function findShortestPath(graph, startNode, endNode) {
  if (!graph[startNode] || !graph[endNode]) return [];

  const nodes = Object.keys(graph);
  const dist = {};
  const prev = {};
  const Q = new Set(nodes);

  nodes.forEach(n => {
    dist[n] = Infinity;
    prev[n] = null;
  });
  dist[startNode] = 0;

  function edgeDistance(a, b) {
    return haversineMeters(graph[a], graph[b]);
  }

  while (Q.size) {
    let u = null;
    for (const n of Q) {
      if (u === null || dist[n] < dist[u]) u = n;
    }
    if (u === null || dist[u] === Infinity) break;
    Q.delete(u);
    if (u === endNode) break;

    for (const v of (graph[u].neighbors || [])) {
      if (!graph[v]) continue;
      const alt = dist[u] + edgeDistance(u, v);
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  const path = [];
  let cur = endNode;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
    if (cur === undefined) break;
  }

  if (path.length === 0 || path[0] !== startNode) return [];
  return path;
}

// Haversine distance in meters
export function haversineMeters(a, b) {
  const R = 6371e3;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const sinHalfLat = Math.sin(Δφ / 2);
  const sinHalfLng = Math.sin(Δλ / 2);
  const a1 = sinHalfLat * sinHalfLat + Math.cos(φ1) * Math.cos(φ2) * sinHalfLng * sinHalfLng;
  const c = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));
  return R * c;
}

// Find which edge (if any) a point is closest to
function findClosestEdge(graph, point) {
  let bestEdge = null;
  let bestDist = Infinity;
  let bestProjection = null;

  for (const nodeId of Object.keys(graph)) {
    const node = graph[nodeId];
    for (const neighborId of (node.neighbors || [])) {
      if (!graph[neighborId]) continue;
      
      const neighbor = graph[neighborId];
      const projection = projectPointOntoSegment(point, node, neighbor);
      const dist = haversineMeters(point, projection.point);
      
      if (dist < bestDist) {
        bestDist = dist;
        bestEdge = { from: nodeId, to: neighborId };
        bestProjection = projection;
      }
    }
  }

  return { edge: bestEdge, distance: bestDist, projection: bestProjection };
}

// Project a point onto a line segment and get the closest point on that segment
function projectPointOntoSegment(point, segStart, segEnd) {
  const A = point.lat - segStart.lat;
  const B = point.lng - segStart.lng;
  const C = segEnd.lat - segStart.lat;
  const D = segEnd.lng - segStart.lng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let closestLat, closestLng;
  
  if (param < 0) {
    closestLat = segStart.lat;
    closestLng = segStart.lng;
  } else if (param > 1) {
    closestLat = segEnd.lat;
    closestLng = segEnd.lng;
  } else {
    closestLat = segStart.lat + param * C;
    closestLng = segStart.lng + param * D;
  }

  return {
    point: { lat: closestLat, lng: closestLng },
    parameter: param
  };
}

// Get nearest connection point (either a node or a point on an edge)
export function getNearestConnection(graph, position, thresholdMeters = 20) {
  // Find closest node
  let bestNode = null;
  let bestNodeDist = Infinity;
  for (const nodeId of Object.keys(graph)) {
    const dist = haversineMeters(graph[nodeId], position);
    if (dist < bestNodeDist) {
      bestNodeDist = dist;
      bestNode = nodeId;
    }
  }

  // Find closest edge
  const edgeResult = findClosestEdge(graph, position);

  // If position is very close to an edge (closer than to any node), use the edge
  if (edgeResult.distance < bestNodeDist && edgeResult.distance < thresholdMeters) {
    return {
      type: 'edge',
      edge: edgeResult.edge,
      projection: edgeResult.projection,
      distanceMeters: edgeResult.distance
    };
  }

  // Otherwise use the nearest node
  return {
    type: 'node',
    node: bestNode,
    distanceMeters: bestNodeDist
  };
}

// Find path from any position to any position (handles both nodes and edges)
// Find path from any position to any position (handles both nodes and edges)
export function findPathBetweenPositions(graph, startPos, endPos) {
  const startConn = getNearestConnection(graph, startPos);
  const endConn = getNearestConnection(graph, endPos);

  console.log('Start connection:', startConn);
  console.log('End connection:', endConn);

  // Check if start and end are on the same edge - if so, connect directly
  if (startConn.type === 'edge' && endConn.type === 'edge') {
    const sameEdge = 
      (startConn.edge.from === endConn.edge.from && startConn.edge.to === endConn.edge.to) ||
      (startConn.edge.from === endConn.edge.to && startConn.edge.to === endConn.edge.from);
    
    if (sameEdge) {
      // Direct connection on same edge
      return [startPos, endPos];
    }
  }

  let pathCoords = [];

  // Handle start position
  let startNodes = [];
  if (startConn.type === 'node') {
    startNodes = [startConn.node];
  } else {
    // Start is on an edge - we need to consider paths from both endpoints
    startNodes = [startConn.edge.from, startConn.edge.to];
  }

  // Handle end position
  let endNodes = [];
  if (endConn.type === 'node') {
    endNodes = [endConn.node];
  } else {
    endNodes = [endConn.edge.from, endConn.edge.to];
  }

  // Find shortest path among all combinations
  let shortestPath = null;
  let shortestLength = Infinity;
  let bestStartNode = null;
  let bestEndNode = null;

  for (const startNode of startNodes) {
    for (const endNode of endNodes) {
      const nodePath = findShortestPath(graph, startNode, endNode);
      
      // Allow empty path if start and end nodes are the same
      if (nodePath.length > 0 || startNode === endNode) {
        const pathLength = nodePath.length > 0 ? calculatePathLength(graph, nodePath) : 0;
        
        // Add connection distances
        let totalLength = pathLength;
        if (startConn.type === 'edge') {
          totalLength += haversineMeters(startPos, graph[startNode]);
        }
        if (endConn.type === 'edge') {
          totalLength += haversineMeters(endPos, graph[endNode]);
        }

        if (totalLength < shortestLength) {
          shortestLength = totalLength;
          shortestPath = nodePath;
          bestStartNode = startNode;
          bestEndNode = endNode;
        }
      }
    }
  }

  if (shortestPath === null) {
    return [];
  }

  // Build the coordinate path
  // Add start position if on edge
  if (startConn.type === 'edge') {
    pathCoords.push(startPos);
    if (shortestPath.length === 0 && bestStartNode === bestEndNode) {
      // Both on edges near the same node - go through that node
      pathCoords.push({
        lat: graph[bestStartNode].lat,
        lng: graph[bestStartNode].lng
      });
    } else {
      pathCoords.push(startConn.projection.point);
    }
  }

  // Add all node positions (only if there's actually a path)
  if (shortestPath.length > 0) {
    pathCoords.push(...shortestPath.map(nodeId => ({
      lat: graph[nodeId].lat,
      lng: graph[nodeId].lng
    })));
  }

  // Add end position if on edge
  if (endConn.type === 'edge') {
    if (!(shortestPath.length === 0 && bestStartNode === bestEndNode)) {
      pathCoords.push(endConn.projection.point);
    }
    pathCoords.push(endPos);
  }

  return pathCoords;
}

// Calculate total length of a node path
function calculatePathLength(graph, nodePath) {
  let total = 0;
  for (let i = 0; i < nodePath.length - 1; i++) {
    total += haversineMeters(graph[nodePath[i]], graph[nodePath[i + 1]]);
  }
  return total;
}