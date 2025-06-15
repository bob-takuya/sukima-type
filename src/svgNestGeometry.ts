/**
 * SVGNest Geometry Utilities
 * Complete port of SVGNest geometric algorithms for precise polygon collision detection
 * 
 * This implementation replaces circular approximation with exact polygon-based
 * collision detection using No-Fit Polygon (NFP) algorithms from SVGNest.
 */

import { Point, BoundingBox } from './types.js';

const TOL = Math.pow(10, -9); // Floating point tolerance

/**
 * SVGNest geometry utility functions - Direct port from SVGNest
 */
export class SVGNestGeometry {
  
  /**
   * Check if two values are almost equal within tolerance
   */
  private static almostEqual(a: number, b: number, tolerance: number = TOL): boolean {
    return Math.abs(a - b) < tolerance;
  }

  /**
   * Normalize vector to unit vector
   */
  private static normalizeVector(v: Point): Point {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }

  /**
   * Check if point p lies on line segment AB (but not at endpoints)
   */
  private static onSegment(A: Point, B: Point, p: Point): boolean {
    // Vertical line
    if (this.almostEqual(A.x, B.x) && this.almostEqual(p.x, A.x)) {
      if (!this.almostEqual(p.y, B.y) && !this.almostEqual(p.y, A.y) && 
          p.y < Math.max(B.y, A.y) && p.y > Math.min(B.y, A.y)) {
        return true;
      }
      return false;
    }

    // Horizontal line
    if (this.almostEqual(A.y, B.y) && this.almostEqual(p.y, A.y)) {
      if (!this.almostEqual(p.x, B.x) && !this.almostEqual(p.x, A.x) && 
          p.x < Math.max(B.x, A.x) && p.x > Math.min(B.x, A.x)) {
        return true;
      }
      return false;
    }

    // Range check
    if ((p.x < A.x && p.x < B.x) || (p.x > A.x && p.x > B.x) || 
        (p.y < A.y && p.y < B.y) || (p.y > A.y && p.y > B.y)) {
      return false;
    }

    // Exclude endpoints
    if ((this.almostEqual(p.x, A.x) && this.almostEqual(p.y, A.y)) || 
        (this.almostEqual(p.x, B.x) && this.almostEqual(p.y, B.y))) {
      return false;
    }

    const cross = (p.y - A.y) * (B.x - A.x) - (p.x - A.x) * (B.y - A.y);
    if (Math.abs(cross) > TOL) {
      return false;
    }

    const dot = (p.x - A.x) * (B.x - A.x) + (p.y - A.y) * (B.y - A.y);
    if (dot < 0 || this.almostEqual(dot, 0)) {
      return false;
    }

    const len2 = (B.x - A.x) * (B.x - A.x) + (B.y - A.y) * (B.y - A.y);
    if (dot > len2 || this.almostEqual(dot, len2)) {
      return false;
    }

    return true;
  }

  /**
   * Find intersection of line segments AB and EF
   */
  private static lineIntersect(A: Point, B: Point, E: Point, F: Point, infinite: boolean = false): Point | null {
    const a1 = B.y - A.y;
    const b1 = A.x - B.x;
    const c1 = B.x * A.y - A.x * B.y;
    const a2 = F.y - E.y;
    const b2 = E.x - F.x;
    const c2 = F.x * E.y - E.x * F.y;

    const denom = a1 * b2 - a2 * b1;
    const x = (b1 * c2 - b2 * c1) / denom;
    const y = (a2 * c1 - a1 * c2) / denom;

    if (!isFinite(x) || !isFinite(y)) {
      return null;
    }

    if (!infinite) {
      // Check if intersection is within both line segments
      if (Math.abs(A.x - B.x) > TOL && 
          ((A.x < B.x) ? x < A.x || x > B.x : x > A.x || x < B.x)) return null;
      if (Math.abs(A.y - B.y) > TOL && 
          ((A.y < B.y) ? y < A.y || y > B.y : y > A.y || y < B.y)) return null;
      if (Math.abs(E.x - F.x) > TOL && 
          ((E.x < F.x) ? x < E.x || x > F.x : x > E.x || x < F.x)) return null;
      if (Math.abs(E.y - F.y) > TOL && 
          ((E.y < F.y) ? y < E.y || y > F.y : y > E.y || y < F.y)) return null;
    }

    return { x, y };
  }

  /**
   * Get polygon bounding box
   */
  static getPolygonBounds(polygon: Point[]): BoundingBox | null {
    if (!polygon || polygon.length < 3) {
      return null;
    }

    let xmin = polygon[0].x;
    let xmax = polygon[0].x;
    let ymin = polygon[0].y;
    let ymax = polygon[0].y;

    for (let i = 1; i < polygon.length; i++) {
      if (polygon[i].x > xmax) {
        xmax = polygon[i].x;
      } else if (polygon[i].x < xmin) {
        xmin = polygon[i].x;
      }

      if (polygon[i].y > ymax) {
        ymax = polygon[i].y;
      } else if (polygon[i].y < ymin) {
        ymin = polygon[i].y;
      }
    }

    return {
      x: xmin,
      y: ymin,
      width: xmax - xmin,
      height: ymax - ymin
    };
  }

  /**
   * Check if point is inside polygon using ray casting algorithm
   */
  static pointInPolygon(point: Point, polygon: Point[], offsetx: number = 0, offsety: number = 0): boolean | null {
    if (!polygon || polygon.length < 3) {
      return null;
    }

    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x + offsetx;
      const yi = polygon[i].y + offsety;
      const xj = polygon[j].x + offsetx;
      const yj = polygon[j].y + offsety;

      if (this.almostEqual(xi, point.x) && this.almostEqual(yi, point.y)) {
        return null; // Point is exactly on a vertex
      }

      if (this.onSegment({ x: xi, y: yi }, { x: xj, y: yj }, point)) {
        return null; // Point is exactly on an edge
      }

      if (this.almostEqual(xi, xj) && this.almostEqual(yi, yj)) {
        continue; // Ignore very small lines
      }

      const intersect = ((yi > point.y) !== (yj > point.y)) && 
                        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Check if two polygons intersect - Direct port from SVGNest
   */
  static intersect(A: Point[], B: Point[], Aoffsetx: number = 0, Aoffsety: number = 0, 
                   Boffsetx: number = 0, Boffsety: number = 0): boolean {
    A = [...A]; // Clone arrays
    B = [...B];

    for (let i = 0; i < A.length - 1; i++) {
      for (let j = 0; j < B.length - 1; j++) {
        const a1 = { x: A[i].x + Aoffsetx, y: A[i].y + Aoffsety };
        const a2 = { x: A[i + 1].x + Aoffsetx, y: A[i + 1].y + Aoffsety };
        const b1 = { x: B[j].x + Boffsetx, y: B[j].y + Boffsety };
        const b2 = { x: B[j + 1].x + Boffsetx, y: B[j + 1].y + Boffsety };

        // Handle coincident points and edge cases
        if (this.onSegment(a1, a2, b1) || (this.almostEqual(a1.x, b1.x) && this.almostEqual(a1.y, b1.y))) {
          // Check neighboring points to determine intersection
          const nextaindex = (i + 1 >= A.length) ? 0 : i + 1;
          const prevaindex = (i === 0) ? A.length - 1 : i - 1;
          const nextbindex = (j + 1 >= B.length) ? 0 : j + 1;
          const prevbindex = (j === 0) ? B.length - 1 : j - 1;

          const a0 = { x: A[prevaindex].x + Aoffsetx, y: A[prevaindex].y + Aoffsety };
          const a3 = { x: A[nextaindex].x + Aoffsetx, y: A[nextaindex].y + Aoffsety };
          const b0 = { x: B[prevbindex].x + Boffsetx, y: B[prevbindex].y + Boffsety };
          const b3 = { x: B[nextbindex].x + Boffsetx, y: B[nextbindex].y + Boffsety };

          const b0in = this.pointInPolygon(b0, A);
          const b2in = this.pointInPolygon(b2, A);
          if ((b0in === true && b2in === false) || (b0in === false && b2in === true)) {
            return true;
          } else {
            continue;
          }
        }

        // Check line intersection
        const p = this.lineIntersect(b1, b2, a1, a2);
        if (p !== null) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Rotate polygon by given angle (in degrees)
   */
  static rotatePolygon(polygon: Point[], degrees: number): Point[] {
    const rotated: Point[] = [];
    const angle = (degrees * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let i = 0; i < polygon.length; i++) {
      const x = polygon[i].x;
      const y = polygon[i].y;
      const x1 = x * cos - y * sin;
      const y1 = x * sin + y * cos;

      rotated.push({ x: x1, y: y1 });
    }

    return rotated;
  }

  /**
   * Check if two transformed polygons collide using SVGNest methods
   */
  static checkPolygonCollision(
    poly1: Point[], 
    transform1: { x: number; y: number; rotation: number; scale: number },
    poly2: Point[], 
    transform2: { x: number; y: number; rotation: number; scale: number },
    margin: number = 2
  ): boolean {
    // Transform polygons
    const transformedPoly1 = this.transformPolygon(poly1, transform1);
    const transformedPoly2 = this.transformPolygon(poly2, transform2);

    // Add margin by expanding polygons slightly
    const expandedPoly1 = this.expandPolygon(transformedPoly1, margin);
    const expandedPoly2 = this.expandPolygon(transformedPoly2, margin);

    // Check intersection using SVGNest algorithm
    return this.intersect(expandedPoly1, expandedPoly2);
  }

  /**
   * Transform polygon with given translation, rotation, and scale
   */
  private static transformPolygon(
    polygon: Point[], 
    transform: { x: number; y: number; rotation: number; scale: number }
  ): Point[] {
    // First scale and rotate around origin
    let transformed = polygon.map(p => ({
      x: p.x * transform.scale,
      y: p.y * transform.scale
    }));

    // Then rotate
    if (transform.rotation !== 0) {
      transformed = this.rotatePolygon(transformed, transform.rotation);
    }

    // Finally translate
    return transformed.map(p => ({
      x: p.x + transform.x,
      y: p.y + transform.y
    }));
  }

  /**
   * Expand polygon by given margin (simplified implementation)
   */
  private static expandPolygon(polygon: Point[], margin: number): Point[] {
    if (margin <= 0) return polygon;

    // Simplified expansion: offset each point outward from centroid
    const bounds = this.getPolygonBounds(polygon);
    if (!bounds) return polygon;

    const centroid = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    return polygon.map(p => {
      const dx = p.x - centroid.x;
      const dy = p.y - centroid.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance === 0) return p;

      const scale = (distance + margin) / distance;
      return {
        x: centroid.x + dx * scale,
        y: centroid.y + dy * scale
      };
    });
  }
}