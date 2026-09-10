import { useCallback, useEffect, useRef, useState } from "react";

const L = 40; // L, configurable — cabin is L x L (square)
const d = 80; // d, configurable — hitch-to-rear-axle coupling distance
const L2 = 70; // L2, configurable — fixed trailer body length (must be <= d)
const W = 40; // px, across trailer heading

const LINEAR_ACCEL = 50; // px/s^2 while "w" is held
const LINEAR_DAMPING = 2.0; // 1/s, decays v back to 0 once "w" is released
const MAX_LINEAR_VEL = 100; // px/s

const ANGULAR_ACCEL = 10 * Math.PI / 180; // rad/s^2 while "a"/"d" is held
const ANGULAR_DAMPING = 3.0; // 1/s, decays phi back to 0 once "a"/"d" is released
const MAX_STEERING_PHI = 12 * Math.PI / 180; // maximum steering angle s.t. phi <= max_phi < pi / 2

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Initial state — edit these to start the sim from a different pose.
// theta_c/theta_t are radians, CCW from +x axis (0 = pointing right).
const INITIAL_X_C = 200;
const INITIAL_Y_C = CANVAS_HEIGHT / 2;
const INITIAL_THETA_C = 0;
const INITIAL_THETA_T = 0;

// Rear axle of the trailer — tracked explicitly (not derived from
// x_c/y_c/theta_t/d each frame), so set its own initial location here.
const INITIAL_X_T = INITIAL_X_C - d * Math.cos(INITIAL_THETA_T);
const INITIAL_Y_T = INITIAL_Y_C - d * Math.sin(INITIAL_THETA_T);

// TODO: implement the tractor-trailer kinematic equations. `state` holds
// the current {x_c, y_c, theta_c, theta_t, v, phi}; return the state
// advanced by `dt` seconds.
function stepKinematics(state, dt) {
  const { x_c, y_c, theta_c, theta_t, x_t, y_t, v, phi } = state;

  const dx_c = v * Math.cos(theta_c);
  const dy_c = v * Math.sin(theta_c);
  const dtheta_c = v / (L / 2) * Math.tan(phi);
  const dtheta_t = v / d * Math.sin(theta_c - theta_t);

  // TODO: kinematics for the rear axle (x_t, y_t), e.g. in terms of the
  // trailer's own axle speed and theta_t.
  const dx_t = dx_c + d * dtheta_t * Math.sin(theta_t);
  const dy_t = dy_c - d * dtheta_t * Math.cos(theta_t);

  return {
    ...state,
    x_c: x_c + dx_c * dt,
    y_c: y_c + dy_c * dt,
    theta_c: theta_c + dtheta_c * dt,
    theta_t: theta_t + dtheta_t * dt,
    x_t: x_t + dx_t * dt,
    y_t: y_t + dy_t * dt,
  };
}

// Maps currently-held keys to (v, phi) via simple accelerate/damping —
// this is control input, not the kinematics, so it's fully wired up already.
function applyControls(state, keys, dt) {
  let { v, phi } = state;

  if (keys.w) {
    v = Math.min(MAX_LINEAR_VEL, v + LINEAR_ACCEL * dt);
  } else if (v > 0) {
    v = Math.max(0, v - LINEAR_DAMPING * MAX_LINEAR_VEL * dt);
  }

  // phi is the steering angle *relative to theta_c* (angle between the
  // front wheel's perpendicular and the cabin heading) — stepKinematics
  // uses tan(phi) directly, so phi itself must stay within a fixed band
  // around 0. (It must NOT track theta_c: doing so turns this into a
  // feedback loop, since a bigger phi speeds up theta_c, which would then
  // keep raising phi's own ceiling.)
  const turningCCW = keys.a && !keys.d;
  const turningCW = keys.d && !keys.a;
  if (turningCCW) {
    phi = Math.min(MAX_STEERING_PHI, phi + ANGULAR_ACCEL * dt);
  } else if (turningCW) {
    phi = Math.max(-MAX_STEERING_PHI, phi - ANGULAR_ACCEL * dt);
  }
//   else {
//     const decay = ANGULAR_DAMPING * dt;
//     if (phi > 0) phi = Math.max(0, phi - decay);
//     else if (phi < 0) phi = Math.min(0, phi + decay);
//   }

  return { ...state, v, phi };
}

// Draws a rear-wheel axle as a bar perpendicular to `theta` (the body's
// heading) centered at (x, y), with a wheel dot at each end — for sanity
// checking that a body's position/heading/rear-axle state line up visually.
function drawAxle(ctx, x, y, theta, track, color) {
  const halfTrack = track / 2;
  const perp = theta + Math.PI / 2;
  const dx = Math.cos(perp) * halfTrack;
  const dy = Math.sin(perp) * halfTrack;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x - dx, y - dy);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x - dx, y - dy, 4, 0, Math.PI * 2);
  ctx.arc(x + dx, y + dy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScene(ctx, state) {
  const { x_c, y_c, theta_c, theta_t, x_t, y_t, v, phi } = state;
  const x_axle = x_c + (L / 2) * Math.cos(theta_c);
  const y_axle = y_c + (L / 2) * Math.sin(theta_c);

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Canvas y increases downward by default, which would otherwise make
  // +theta rotate clockwise on screen. Flip to a standard math frame
  // (+x right, +y up, +theta CCW) for everything drawn below, so the
  // kinematics' cos/sin convention matches what's rendered.
  ctx.save();
  ctx.translate(0, CANVAS_HEIGHT);
  ctx.scale(1, -1);

  // faint reference grid
  ctx.save();
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let gx = 0; gx < CANVAS_WIDTH; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let gy = 0; gy < CANVAS_HEIGHT; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(CANVAS_WIDTH, gy);
    ctx.stroke();
  }
  ctx.restore();

  // angle from x-axis to axle: phi + theta_c
  let radius = L / (2 * Math.tan(phi));
  ctx.save();
  ctx.beginPath();
  ctx.arc(
    x_axle - Math.sin(phi + theta_c) * radius, 
    y_axle + Math.cos(phi + theta_c) * radius, 
    Math.abs(radius), 0, Math.PI * 2); // center, radius, start angle, end angle
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // tow-bar: connects the hitch to the tracked rear-axle point (x_t, y_t).
  ctx.save();
  ctx.strokeStyle = "#8a8a8a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x_c, y_c);
  ctx.lineTo(x_t, y_t);
  ctx.stroke();
  ctx.restore();

  // trailer: fixed length L2 (<= d), rear axle at (x_t, y_t), body extends
  // forward from the axle along theta_t.
  ctx.save();
  ctx.translate(x_t, y_t);
  ctx.rotate(theta_t);
  ctx.fillStyle = "#c97b3d";
  ctx.strokeStyle = "#ffe3c9";
  ctx.lineWidth = 2;
  ctx.fillRect(0, -W / 2, L2, W);
  ctx.strokeRect(0, -W / 2, L2, W);
  ctx.restore();

  // trailer rear axle
  drawAxle(ctx, x_t, y_t, theta_t, W, "#ffe14d");

  // cabin: square, L x L, extends forward from the
  // hitch (x_c, y_c) along theta_c.
  ctx.save();
  ctx.translate(x_c, y_c);
  ctx.rotate(theta_c);
  ctx.fillStyle = "#4da3ff";
  ctx.strokeStyle = "#dff0ff";
  ctx.lineWidth = 2;
  ctx.fillRect(0, -L / 2, L, L);
  ctx.strokeRect(0, -L / 2, L, L);

  // heading indicator (triangle at the front of the cabin)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(L, 0);
  ctx.lineTo(L - 10, -8);
  ctx.lineTo(L - 10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // cabin rear axle (coincides with the hitch, (x_c, y_c), in this model)
  drawAxle(ctx, 
    x_axle, y_axle, phi + theta_c, L, "#39ff14");
 
  ctx.restore(); // undo the y-up flip
}

export default function Truck() {
  const canvasRef = useRef(null);
  const keysRef = useRef({ w: false, a: false, d: false });
  const stateRef = useRef({
    x_c: INITIAL_X_C,
    y_c: INITIAL_Y_C,
    theta_c: INITIAL_THETA_C,
    theta_t: INITIAL_THETA_T,
    x_t: INITIAL_X_T,
    y_t: INITIAL_Y_T,
    v: 0,
    phi: 0,
  });
  const [hud, setHud] = useState(stateRef.current);

  const handleKeyDown = useCallback((event) => {
    const key = event.key.toLowerCase();
    if (key === "w" || key === "a" || key === "d") {
      keysRef.current[key] = true;
    }
  }, []);

  const handleKeyUp = useCallback((event) => {
    const key = event.key.toLowerCase();
    if (key === "w" || key === "a" || key === "d") {
      keysRef.current[key] = false;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    let frameId;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      let state = applyControls(stateRef.current, keysRef.current, dt);
      state = stepKinematics(state, dt);
      stateRef.current = state;

      drawScene(ctx, state);
      setHud(state);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#111" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ display: "block", margin: "0 auto", background: "#1b1b1b" }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          color: "#fff",
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.6,
          background: "rgba(0,0,0,0.5)",
          padding: "8px 12px",
          borderRadius: 6,
        }}
      >
        <div>W: accelerate&nbsp;&nbsp; A: turn CCW&nbsp;&nbsp; D: turn CW</div>
        <div>
          x_c: {hud.x_c.toFixed(1)}&nbsp;&nbsp; y_c: {hud.y_c.toFixed(1)}
        </div>
        <div>
          theta_c: {hud.theta_c.toFixed(2)} rad&nbsp;&nbsp; theta_t: {hud.theta_t.toFixed(2)} rad
        </div>
        <div>
          x_t: {hud.x_t.toFixed(1)}&nbsp;&nbsp; y_t: {hud.y_t.toFixed(1)}
        </div>
        <div>
          v: {hud.v.toFixed(1)}&nbsp;&nbsp; phi: {hud.phi.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
