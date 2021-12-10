import { Point } from './models';

/**
 * Incrementally calculate control points for a Bezier curve. Start the iterator and then each
 * call to next(p) should contain the next point in the path. Once at least three points have
 * been supplied a pair of control points will be returned by each iteration.
 */
export function* curveControlGenerator(): Generator<false | [Point, Point], void, Point> {
  var pMinus2: Point,
    pMinus1: Point,
    p: Point,
    control1: Point,
    control2: Point;
  // just store points until we have enough to calculate
  pMinus2 = yield false;
  pMinus1 = yield false;
  p = yield false;
  // calculate the first set of control points using the main algorithm
  const { firstControlPoints, secondControlPoints } = getCurveControlPoints([pMinus2, pMinus1, p])!;
  control1 = firstControlPoints[1];
  control2 = secondControlPoints[1];
  p = yield [control1, control2];
  while (true) {
    control1 = reflectPoint(control2, pMinus1);
    control2.x = (p.x + control1.x) / 2;
    control2.y = (p.y + control1.y) / 2;
    pMinus2 = pMinus1;
    pMinus1 = p;
    p = yield [control1, control2];
  }
}

/**
 * Calculate Bezier curve control points for a smooth curve through the given points.
 *
 * Adapted from https://www.codeproject.com/Articles/31859/Draw-a-Smooth-Curve-through-a-Set-of-2D-Points-wit
 * There's some heavy math that I don't fully understand but the code is straightforward enough.
 */
export function getCurveControlPoints(points: Point[]) {
  if (!points || points.length < 3) {
    // not enough data to calculate a curve
    return;
  }
  const n = points.length - 1;
  const firstControlPoints: Point[] = new Array(n);
  const secondControlPoints: Point[] = new Array(n);
  const rhsVector = getRightHandSideVector(points, n);
  const x = getFirstControlPoints(rhsVector.x);
  const y = getFirstControlPoints(rhsVector.y);
  for (let i = 0; i < n; ++i) {
    firstControlPoints[i] = new Point(x[i], y[i]);
    // Second control point is derived from first
    if (i < n - 1) {
      const ctlX = 2 * points[i + 1].x - x[i + 1];
      const ctlY = 2 * points[i + 1].y - y[i + 1];
      secondControlPoints[i] = new Point(ctlX, ctlY);
    } else {
      const ctlX = (points[n].x + x[n - 1]) / 2;
      const ctlY = (points[n].y + y[n - 1]) / 2;
      secondControlPoints[i] = new Point(ctlX, ctlY);
    }
  }

  return { firstControlPoints, secondControlPoints };
}

function getRightHandSideVector(points: Point[], n: number) {
  const rhsVector = {
    x: new Array<number>(n),
    y: new Array<number>(n)
  }
  // interior points
  for (let i = 1; i < n - 1; ++i) {
    rhsVector.x[i] = 4 * points[i].x + 2 * points[i + 1].x;
    rhsVector.y[i] = 4 * points[i].y + 2 * points[i + 1].y;
  }
  // end points
  rhsVector.x[0] = points[0].x + 2 * points[1].x;
  rhsVector.x[n - 1] = (8 * points[n - 1].x + points[n].x) / 2;
  rhsVector.y[0] = points[0].y + 2 * points[1].y;
  rhsVector.y[n - 1] = (8 * points[n - 1].y + points[n].y) / 2;

  return rhsVector;
}

function getFirstControlPoints(rhs: number[]): number[] {
  const n = rhs.length;
  const result: number[] = new Array(n);
  const tmp: number[] = new Array(n);

  let b = 2;
  result[0] = rhs[0] / b;
  for (let i = 1; i < n; i++) {
    // Decomposition and forward substitution.
    tmp[i] = 1 / b;
    b = (i < n - 1 ? 4.0 : 3.5) - tmp[i];
    result[i] = (rhs[i] - result[i - 1]) / b;
  }
  for (let i = 1; i < n; i++) {
     // Backsubstitution.
    result[n - i - 1] -= tmp[n - i] * result[n - i];
  }

  return result;
}

function reflectPoint(input: Point, anchor: Point): Point {
  return {
    x: 2 * anchor.x - input.x,
    y: 2 * anchor.y - input.y
  };
}
