/**
 * Convex Hull Algorithm - Andrew's Monotone Chain Implementation
 * Based on https://github.com/mgomes/ConvexHull
 * 
 * This implementation optimizes SVGNest collision detection by reducing
 * complex character shapes to their convex hulls before processing.
 */

import { Point } from './types.js';

export class ConvexHull {
  /**
   * Sort points by X coordinate, then by Y coordinate
   */
  private static sortPointX(a: Point, b: Point): number {
    return a.x - b.x;
  }

  /**
   * Sort points by Y coordinate
   */
  private static sortPointY(a: Point, b: Point): number {
    return a.y - b.y;
  }

  /**
   * Test if a point is Left|On|Right of an infinite line
   * Input: three points P0, P1, and P2
   * Return: >0 for P2 left of the line through P0 and P1
   *         =0 for P2 on the line
   *         <0 for P2 right of the line
   */
  private static isLeft(P0: Point, P1: Point, P2: Point): number {
    return (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y);
  }

  /**
   * Andrew's Monotone Chain 2D convex hull algorithm
   * Input:  P[] = an array of 2D points presorted by increasing x- and y-coordinates
   *         n = the number of points in P[]
   * Output: H[] = an array of the convex hull vertices (max is n)
   * Return: the number of points in H[]
   */
  private static chainHull2D(P: Point[], n: number, H: Point[]): number {
    // The output array H[] will be used as the stack
    let bot = 0;
    let top = -1; // indices for bottom and top of the stack
    let i: number; // array scan index

    // Get the indices of points with min x-coord and min|max y-coord
    let minmin = 0;
    let minmax: number;
    
    const xmin = P[0].x;
    for (i = 1; i < n; i++) {
      if (P[i].x !== xmin) {
        break;
      }
    }
    
    minmax = i - 1;
    if (minmax === n - 1) { // degenerate case: all x-coords == xmin 
      H[++top] = P[minmin];
      if (P[minmax].y !== P[minmin].y) // a nontrivial segment
        H[++top] = P[minmax];
      H[++top] = P[minmin]; // add polygon endpoint
      return top + 1;
    }

    // Get the indices of points with max x-coord and min|max y-coord
    let maxmin: number;
    let maxmax = n - 1;
    const xmax = P[n - 1].x;
    for (i = n - 2; i >= 0; i--) {
      if (P[i].x !== xmax) {
        break; 
      }
    }
    maxmin = i + 1;

    // Compute the lower hull on the stack H
    H[++top] = P[minmin]; // push minmin point onto stack
    i = minmax;
    while (++i <= maxmin) {
      // the lower line joins P[minmin] with P[maxmin]
      if (this.isLeft(P[minmin], P[maxmin], P[i]) >= 0 && i < maxmin) {
        continue; // ignore P[i] above or on the lower line
      }

      while (top > 0) { // there are at least 2 points on the stack
        // test if P[i] is left of the line at the stack top
        if (this.isLeft(H[top - 1], H[top], P[i]) > 0) {
          break; // P[i] is a new hull vertex
        } else {
          top--; // pop top point off stack
        }
      }
      
      H[++top] = P[i]; // push P[i] onto stack
    }

    // Next, compute the upper hull on the stack H above the bottom hull
    if (maxmax !== maxmin) { // if distinct xmax points
      H[++top] = P[maxmax]; // push maxmax point onto stack
    }
    
    bot = top; // the bottom point of the upper hull stack
    i = maxmin;
    while (--i >= minmax) {
      // the upper line joins P[maxmax] with P[minmax]
      if (this.isLeft(P[maxmax], P[minmax], P[i]) >= 0 && i > minmax) {
        continue; // ignore P[i] below or on the upper line
      }
      
      while (top > bot) { // at least 2 points on the upper stack
        // test if P[i] is left of the line at the stack top
        if (this.isLeft(H[top - 1], H[top], P[i]) > 0) { 
          break;  // P[i] is a new hull vertex
        } else {
          top--; // pop top point off stack
        }
      }
      
      if (P[i].x === H[0].x && P[i].y === H[0].y) {
        return top + 1; // special case (mgomes)
      }
      
      H[++top] = P[i]; // push P[i] onto stack
    }
    
    if (minmax !== minmin) {
      H[++top] = P[minmin]; // push joining endpoint onto stack
    }
    
    return top + 1;
  }

  /**
   * Calculate convex hull of a set of 2D points
   * Returns the vertices of the convex hull in counter-clockwise order
   */
  static calculateConvexHull(points: Point[]): Point[] {
    if (points.length < 3) {
      return [...points]; // Cannot form a convex hull with less than 3 points
    }

    // Remove duplicate points
    const uniquePoints = this.removeDuplicates(points);
    
    if (uniquePoints.length < 3) {
      return uniquePoints;
    }

    // Sort points by X, then by Y (required by the algorithm)
    const sortedPoints = [...uniquePoints];
    sortedPoints.sort(this.sortPointY);
    sortedPoints.sort(this.sortPointX);

    // Calculate the convex hull
    const hullPoints: Point[] = new Array(sortedPoints.length);
    const hullSize = this.chainHull2D(sortedPoints, sortedPoints.length, hullPoints);

    // Return only the actual hull points
    return hullPoints.slice(0, hullSize);
  }

  /**
   * Remove duplicate points from the array
   */
  private static removeDuplicates(points: Point[]): Point[] {
    const tolerance = 1e-10;
    const unique: Point[] = [];
    
    for (const point of points) {
      const isDuplicate = unique.some(existing => 
        Math.abs(existing.x - point.x) < tolerance && 
        Math.abs(existing.y - point.y) < tolerance
      );
      
      if (!isDuplicate) {
        unique.push(point);
      }
    }
    
    return unique;
  }

  /**
   * Simplified convex hull for rectangular bounding boxes
   * This is an optimized version for simple shapes
   */
  static rectangularHull(width: number, height: number, centerX: number = 0, centerY: number = 0): Point[] {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    return [
      { x: centerX - halfWidth, y: centerY - halfHeight }, // bottom-left
      { x: centerX + halfWidth, y: centerY - halfHeight }, // bottom-right
      { x: centerX + halfWidth, y: centerY + halfHeight }, // top-right
      { x: centerX - halfWidth, y: centerY + halfHeight }, // top-left
    ];
  }

  /**
   * Calculate the area of a convex hull
   */
  static calculateHullArea(hull: Point[]): number {
    if (hull.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < hull.length; i++) {
      const j = (i + 1) % hull.length;
      area += hull[i].x * hull[j].y;
      area -= hull[j].x * hull[i].y;
    }
    return Math.abs(area) / 2;
  }
}
