import { useCallback, useEffect, useRef, useState, useLayoutEffect } from "react";
import { generateTrajectoryPNG } from "./Plot.js";
import Draggable from "react-draggable";
import App from '../App';

const L = 40; // L : square cabin length
const d = 80; // d : dist from rear axle to hitch
const L2 = 70; // L2 : trailer length
const W = 40; // W : same as cabin length 

const LINEAR_ACCEL = 100; // px/s^2 while "w" is held
const LINEAR_DAMPING = 2.0; // 1/s, decays v back to 0 once "w" is released
const MAX_LINEAR_VEL = 200; // px/s

const ANGULAR_ACCEL = 10 * Math.PI / 180; // acceleration of the steering angle
// const ANGULAR_DAMPING = 3.0;
const MAX_STEERING_PHI = 12 * Math.PI / 180; // max steering angle

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Initial state = [xc, yc, thetac, thetat].T
const INITIAL_X_C = 600;
const INITIAL_Y_C = 400;
const INITIAL_THETA_C = -80 * Math.PI / 180;
const INITIAL_THETA_T = -70 * Math.PI / 180;

// Rear axle
const INITIAL_X_T = INITIAL_X_C - d * Math.cos(INITIAL_THETA_T);
const INITIAL_Y_T = INITIAL_Y_C - d * Math.sin(INITIAL_THETA_T);

function stepKinematics(state, dt) {
  const { x_c, y_c, theta_c, theta_t, x_t, y_t, v, phi } = state;

  const dx_c = v * Math.cos(theta_c);
  const dy_c = v * Math.sin(theta_c);
  const dtheta_c = v / (L / 2) * Math.tan(phi);
  const dtheta_t = v / d * Math.sin(theta_c - theta_t);
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

function applyControls(state, keys, dt) {
  let { v, phi } = state;

  if (keys.w) {
    v = Math.min(MAX_LINEAR_VEL, v + LINEAR_ACCEL * dt);
  } else if (keys.s) {
    v = Math.max(-MAX_LINEAR_VEL, v - LINEAR_ACCEL * dt);
  } else if (Math.abs(v) > 0) {
    let sign = (v > 0) ? 1 : -1;
    v = sign * Math.max(0, Math.abs(v) - LINEAR_DAMPING * MAX_LINEAR_VEL * dt);
  }

  // phi is the steering angle: the angle between perpendicular bisector of cabin axle 
  // and heading or orientation of the cabin
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

// draw the cabin and rear axles to visualize how axle orientation changes with phi
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
    Math.abs(radius), 0, Math.PI * 2); // this is to draw the circular path that the cabin is tracing when turn
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // the line connecting rear axle midpoint to hitch, parallel to trailer length, in figure 2.38
  ctx.save();
  ctx.strokeStyle = "#8a8a8a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x_c, y_c);
  ctx.lineTo(x_t, y_t);
  ctx.stroke();
  ctx.restore();

  // draw the trailer
  ctx.save();
  ctx.translate(x_t, y_t);
  ctx.rotate(theta_t);
  ctx.fillStyle = "#c97b3d";
  ctx.strokeStyle = "#ffe3c9";
  ctx.lineWidth = 2;
  ctx.fillRect(0, -W / 2, L2, W);
  ctx.strokeRect(0, -W / 2, L2, W);
  ctx.restore();

  // draw the trailer rear axle
  drawAxle(ctx, x_t, y_t, theta_t, W, "#ffe14d");

  // draw the cabin
  ctx.save();
  ctx.translate(x_c, y_c);
  ctx.rotate(theta_c);
  ctx.fillStyle = "#4da3ff";
  ctx.strokeStyle = "#dff0ff";
  ctx.lineWidth = 2;
  ctx.fillRect(0, -L / 2, L, L);
  ctx.strokeRect(0, -L / 2, L, L);

  // depict front of the cabin
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(L, 0);
  ctx.lineTo(L - 10, -8);
  ctx.lineTo(L - 10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // draw the cabin axle
  drawAxle(ctx, 
    x_axle, y_axle, phi + theta_c, L, "#39ff14");
 
  ctx.restore();
}

// models the geometry and kinematics of the semi-trailer truck
export default function Truck() {
  // stores states and controls so i can plot truck path across time period
  const screenWidth = 84;
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
//   const trajectoryRef = useRef([{
//         t: 0,
//         x_c: INITIAL_X_C,
//         y_c: INITIAL_Y_C,
//         theta_c: INITIAL_THETA_C,
//         x_t: INITIAL_X_T,
//         y_t: INITIAL_Y_T,
//         theta_t: INITIAL_THETA_T,
//         v: 0,
//         phi: 0,
//     }]);
//   const elapsedRef = useRef(0);
//   const nextPlotTimeRef = useRef(0);
  const containerRef = useRef(null);
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
    if (key === "w" || key === "a" || key === "d" || key === "s") {
      keysRef.current[key] = true;
    }
  }, []);

  const handleKeyUp = useCallback((event) => {
    const key = event.key.toLowerCase();
    if (key === "w" || key === "a" || key === "d" || key === "s") {
      keysRef.current[key] = false;
    }
  }, []);

  useLayoutEffect(() => {
    const updateWidth = () => {
        if (containerRef.current) {
            setWidth(containerRef.current.clientWidth);
            setHeight(containerRef.current.clientHeight);
        }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateWidth);

    return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateWidth);
    };
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

    //   elapsedRef.current += dt;

    //   if (elapsedRef.current >= nextPlotTimeRef.current) {
    //     trajectoryRef.current.push({
    //         t: nextPlotTimeRef.current,
    //         x_c: state.x_c,
    //         y_c: state.y_c,
    //         theta_c: state.theta_c,
    //         x_t: state.x_t,
    //         y_t: state.y_t,
    //         theta_t: state.theta_t,
    //         v: state.v,
    //         phi: state.phi * 180 / Math.PI
    //     });

    //     nextPlotTimeRef.current += 0.5;

        // stop recording after t = 10s
    //     if (nextPlotTimeRef.current > 10 && trajectoryRef.current != []) {
    //         generateTrajectoryPNG(trajectoryRef);

    //         trajectoryRef.current = [];
    //         nextPlotTimeRef.current = Infinity;
    //     }
    //   }

      drawScene(ctx, state);
      setHud(state);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <App enableUI={false} responsivePopup popup={
        <Draggable
            cancel={".draggable-btn"}
            nodeRef={containerRef}
            bounds={{ left: 0, top: 0, right: width + 140, bottom: height - 500}}
        >  
        <div ref={containerRef} style={{ 
            width: 1000,
            padding: 2, 
            fontFamily: 'Pixelify Sans',
            position: 'relative',
            display: 'inline-block'
        }}>
            <img 
                className="lidar_window"
                src={process.env.PUBLIC_URL + "/assets/window.png"} 
                style={{
                    zIndex: 0,
                    position: 'absolute',
                    left: (screenWidth / 2 - 67 / 2) * width / screenWidth,
                    width: width * 67 / screenWidth,
                    display: 'block'
                }}
            />

            <canvas
                ref={canvasRef}
                width={width * 57 / screenWidth}
                height={335}
                style={{ 
                    position: "relative", 
                    display: "block",
                    top: 9 * width / screenWidth,
                    left: (screenWidth / 2 - 57.3 / 2) * width / screenWidth,
                    background: "#1b1b1b" }}
            />
            
        
            {/* <div
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
            </div> */}
        </div>
        </Draggable>}
        animate={false}
    />
  );
}
