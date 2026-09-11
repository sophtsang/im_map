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

export function generateTrajectoryPNG(trajectoryRef) {
  const L = 40; // L, configurable — cabin is L x L (square)
  const d = 80; // d, configurable — hitch-to-rear-axle coupling distance
  const L2 = 70; // L2, configurable — fixed trailer body length (must be <= d)
  const W = 40; // px, across trailer heading

  const width = 1200;
  const height = 900;
  const margin = 80;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  console.log(trajectoryRef.current);

  // --------------------------------------------------
  // 1. Calculate bounds, including vehicle dimensions
  // --------------------------------------------------

  const poses = trajectoryRef.current;

  if (!poses || poses.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  poses.forEach((p) => {
    const cabinCorners = [
      [0, -L / 2],
      [0, L / 2],
      [L, -L / 2],
      [L, L / 2],
    ];

    const trailerCorners = [
      [0, -W / 2],
      [0, W / 2],
      [L2, -W / 2],
      [L2, W / 2],
    ];

    // Cabin corners
    cabinCorners.forEach(([lx, ly]) => {
      const x =
        p.x_c +
        lx * Math.cos(p.theta_c) -
        ly * Math.sin(p.theta_c);

      const y =
        p.y_c +
        lx * Math.sin(p.theta_c) +
        ly * Math.cos(p.theta_c);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    // Trailer corners
    trailerCorners.forEach(([lx, ly]) => {
      const x =
        p.x_t +
        lx * Math.cos(p.theta_t) -
        ly * Math.sin(p.theta_t);

      const y =
        p.y_t +
        lx * Math.sin(p.theta_t) +
        ly * Math.cos(p.theta_t);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    // Include hitch/axles
    minX = Math.min(minX, p.x_c, p.x_t);
    maxX = Math.max(maxX, p.x_c, p.x_t);
    minY = Math.min(minY, p.y_c, p.y_t);
    maxY = Math.max(maxY, p.y_c, p.y_t);
  });

  // Extra padding around the trajectory
  const padding = 30;

  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  // --------------------------------------------------
  // 2. Set up coordinate transformation
  // --------------------------------------------------

  const plotWidth = width - 2 * margin;
  const plotHeight = height - 2 * margin;

  const scale = Math.min(
    plotWidth / rangeX,
    plotHeight / rangeY
  );

  const offsetX =
    margin +
    (plotWidth - rangeX * scale) / 2 -
    minX * scale;

  const offsetY =
    height -
    margin -
    (plotHeight - rangeY * scale) / 2 +
    minY * scale;

  ctx.save();

  // Simulation coordinates -> PNG coordinates
  //
  // x stays rightward
  // y points upward, just like the simulation
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, -scale);

  // --------------------------------------------------
  // 3. Draw grid
  // --------------------------------------------------

  const gridSpacing = 20;

  ctx.lineWidth = 1 / scale;
  ctx.strokeStyle = "#dddddd";

  const startGridX =
    Math.floor(minX / gridSpacing) * gridSpacing;

  const endGridX =
    Math.ceil(maxX / gridSpacing) * gridSpacing;

  for (
    let x = startGridX;
    x <= endGridX;
    x += gridSpacing
  ) {
    ctx.beginPath();
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
    ctx.stroke();
  }

  const startGridY =
    Math.floor(minY / gridSpacing) * gridSpacing;

  const endGridY =
    Math.ceil(maxY / gridSpacing) * gridSpacing;

  for (
    let y = startGridY;
    y <= endGridY;
    y += gridSpacing
  ) {
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
  }

  // --------------------------------------------------
  // 4. Draw X and Y axes
  // --------------------------------------------------

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2 / scale;

  // X axis: y = 0
  if (minY <= 0 && maxY >= 0) {
    ctx.beginPath();
    ctx.moveTo(minX, 0);
    ctx.lineTo(maxX, 0);
    ctx.stroke();
  }

  // Y axis: x = 0
  if (minX <= 0 && maxX >= 0) {
    ctx.beginPath();
    ctx.moveTo(0, minY);
    ctx.lineTo(0, maxY);
    ctx.stroke();
  }

  // Axis labels need to be drawn in simulation coordinates.
  // Because Y is flipped, use a small offset accordingly.
  ctx.save();

  // Undo the Y flip so text is upright
  ctx.scale(1, -1);

  ctx.fillStyle = "#000000";
  ctx.font = `${14 / scale}px sans-serif`;

  if (minY <= 0 && maxY >= 0) {
    ctx.fillText(
      "x",
      maxX - 10,
      -10 / scale
    );
  }

  if (minX <= 0 && maxX >= 0) {
    ctx.fillText(
      "y",
      10 / scale,
      -maxY + 10 / scale
    );
  }

  ctx.restore();

  // --------------------------------------------------
  // 5. Draw trajectory paths
  // --------------------------------------------------

  // Cabin path
  ctx.strokeStyle = "#0066ff";
  ctx.lineWidth = 2 / scale;

  ctx.beginPath();

  poses.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x_c, p.y_c);
    } else {
      ctx.lineTo(p.x_c, p.y_c);
    }
  });

  ctx.stroke();

  // Trailer path
  ctx.strokeStyle = "#ff6600";

  ctx.beginPath();

  poses.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x_t, p.y_t);
    } else {
      ctx.lineTo(p.x_t, p.y_t);
    }
  });

  ctx.stroke();

  // --------------------------------------------------
  // 6. Helper for drawing each vehicle pose
  // --------------------------------------------------

  function drawVehiclePose(p, alpha, isFinal = false) {
    const {
      x_c,
      y_c,
      theta_c,
      x_t,
      y_t,
      theta_t,
      phi,
    } = p;

    // ----------------------------------------------
    // Turning circle
    // ----------------------------------------------

    if (Math.abs(phi) > 1e-5) {
      const x_axle =
        x_c +
        (L / 2) * Math.cos(theta_c);

      const y_axle =
        y_c +
        (L / 2) * Math.sin(theta_c);

      const radius =
        L / (2 * Math.tan(phi));

      const centerX =
        x_axle -
        Math.sin(phi + theta_c) * radius;

      const centerY =
        y_axle +
        Math.cos(phi + theta_c) * radius;

      ctx.save();

      ctx.globalAlpha = isFinal ? 0.35 : 0.08;
      ctx.strokeStyle = "#555555";
      ctx.lineWidth = 1 / scale;

      ctx.setLineDash([
        5 / scale,
        5 / scale,
      ]);

      ctx.beginPath();

      ctx.arc(
        centerX,
        centerY,
        Math.abs(radius),
        0,
        2 * Math.PI
      );

      ctx.stroke();

      ctx.restore();
    }

    // ----------------------------------------------
    // Tow bar
    // ----------------------------------------------

    ctx.save();

    ctx.globalAlpha = isFinal ? 1 : 0.20;
    ctx.strokeStyle = "#444444";
    ctx.lineWidth = 2 / scale;

    ctx.beginPath();
    ctx.moveTo(x_c, y_c);
    ctx.lineTo(x_t, y_t);
    ctx.stroke();

    ctx.restore();

    // ----------------------------------------------
    // Trailer
    // ----------------------------------------------

    ctx.save();

    ctx.translate(x_t, y_t);
    ctx.rotate(theta_t);

    // Transparent trailer fill
    ctx.globalAlpha = isFinal ? 0.35 : alpha;
    ctx.fillStyle = "#888888";

    ctx.fillRect(
      0,
      -W / 2,
      L2,
      W
    );

    // Trailer outline
    ctx.globalAlpha = isFinal ? 1 : 0.35;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1 / scale;

    ctx.strokeRect(
      0,
      -W / 2,
      L2,
      W
    );

    ctx.restore();

    // ----------------------------------------------
    // Trailer axle
    // ----------------------------------------------

    ctx.save();

    ctx.globalAlpha = isFinal ? 1 : 0.4;

    drawAxle(
      ctx,
      x_t,
      y_t,
      theta_t,
      W,
      "#000000"
    );

    ctx.restore();

    // ----------------------------------------------
    // Cabin
    // ----------------------------------------------

    ctx.save();

    ctx.translate(x_c, y_c);
    ctx.rotate(theta_c);

    // Transparent cabin fill
    ctx.globalAlpha = isFinal ? 0.35 : alpha;
    ctx.fillStyle = "#888888";

    ctx.fillRect(
      0,
      -L / 2,
      L,
      L
    );

    // Cabin outline
    ctx.globalAlpha = isFinal ? 1 : 0.35;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1 / scale;

    ctx.strokeRect(
      0,
      -L / 2,
      L,
      L
    );

    // Heading triangle
    ctx.globalAlpha = isFinal ? 1 : 0.35;

    ctx.beginPath();

    ctx.moveTo(L, 0);
    ctx.lineTo(L - 10, 6);
    ctx.lineTo(L - 10, -6);
    ctx.closePath();

    ctx.fillStyle = "#000000";
    ctx.fill();

    ctx.restore();

    // ----------------------------------------------
    // Front axle
    // ----------------------------------------------

    const x_axle =
      x_c +
      (L / 2) * Math.cos(theta_c);

    const y_axle =
      y_c +
      (L / 2) * Math.sin(theta_c);

    ctx.save();

    ctx.globalAlpha = isFinal ? 1 : 0.4;

    drawAxle(
      ctx,
      x_axle,
      y_axle,
      theta_c + phi,
      L,
      "#000000"
    );

    ctx.restore();

    // ----------------------------------------------
    // Time label
    // ----------------------------------------------

    ctx.save();

    // Text must be drawn upright
    ctx.scale(1, -1);

    ctx.globalAlpha = isFinal ? 1 : 0.7;
    ctx.fillStyle = "#000000";
    ctx.font = `${12 / scale}px sans-serif`;

    ctx.fillText(
      `t=${p.t}s`,
      x_c + 5,
      -y_c - 5
    );

    ctx.restore();
  }

  // --------------------------------------------------
  // 7. Draw all vehicle poses
  // --------------------------------------------------

  poses.forEach((p) => {
    drawVehiclePose(p, 0.10, false);
  });

  // --------------------------------------------------
  // 8. Draw final/current pose more prominently
  // --------------------------------------------------

  const finalPose = poses[poses.length - 1];

  drawVehiclePose(
    finalPose,
    0.35,
    true
  );

  ctx.restore();

  // --------------------------------------------------
  // 9. PNG title / legend
  // --------------------------------------------------

  ctx.save();

  ctx.fillStyle = "#000000";
  ctx.font = "bold 20px sans-serif";

  ctx.fillText(
    "Truck Trajectory",
    margin,
    35
  );

  ctx.font = "14px sans-serif";

  ctx.fillText(
    "Blue: cabin path    Orange: trailer path",
    margin,
    58
  );

  ctx.restore();

  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "truck_trajectory.png";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, "image/png");
}