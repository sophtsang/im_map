"""Tractor-trailer mobile robot simulation (standalone, matplotlib-based).

Mirrors Truck.js: same state, same controls, same skeleton left to fill in.

State:   x_c, y_c   (hitch position — where cabin and trailer connect)
         theta_c    (cabin heading, radians, CCW from +x axis)
         theta_t    (trailer heading, radians, CCW from +x axis)
Control: v (cabin linear velocity), phi (cabin angular velocity)

Configurable geometry:
    L (L)          cabin is a square, hitch sits at its rear,
                              cabin body extends forward from the hitch by L.
    d (d) trailer body extends backward from the hitch
                              to its rear axle, a distance d away.

Controls (while the plot window has focus):
    w   accelerate forward (increases v)
    a   turn CCW (increases phi)
    d   turn CW (decreases phi)

Requires matplotlib + numpy (not in requirements.txt — this is a standalone
dev tool, not part of the Flask backend).
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.animation import FuncAnimation
from matplotlib.transforms import Affine2D

L = 0.4  # L, configurable — cabin is L x L (square)
d = 0.8  # d, configurable — hitch-to-rear-axle coupling distance
L2 = 0.7 # L2, configurable — fixed trailer body length (must be <= d)
W = 0.4  # units, across trailer heading

LINEAR_ACCEL = 1.5  # units/s^2 while "w" is held
LINEAR_DAMPING = 2.0  # 1/s, decays v back to 0 once "w" is released
MAX_LINEAR_VEL = 1.5  # units/s

ANGULAR_ACCEL = 10.0 * np.pi / 180  # rad/s^2 while "a"/"d" is held
ANGULAR_DAMPING = 3.0  # 1/s, decays phi back to 0 once "a"/"d" is released
MAX_STEERING_PHI = 12 * np.pi / 180

DT = 1 / 30.0


class Truck:
    def __init__(
        self,
        x_c=0.0,
        y_c=0.0,
        theta_c=0.0,
        theta_t=0.0,
        x_t=None,
        y_t=None,
    ):
        self.x_c = x_c
        self.y_c = y_c
        self.theta_c = theta_c
        self.theta_t = theta_t
        # Rear axle of the trailer — tracked explicitly (not derived from
        # x_c/y_c/theta_t/d each frame). Defaults to directly behind the
        # hitch if not given.
        self.x_t = x_c - d * np.cos(theta_t)
        self.y_t = y_c - d * np.sin(theta_t)
        self.v = 0.0
        self.phi = 0.0

    def apply_controls(self, keys, dt):
        """Maps currently-held keys -> (v, phi) via accelerate/damping.

        This is control input, not the kinematics, so it's fully wired up
        already — see step() below for what's left to fill in.
        """
        if keys.get("w"):
            self.v = min(MAX_LINEAR_VEL, self.v + LINEAR_ACCEL * dt)
        elif self.v > 0:
            self.v = max(0.0, self.v - LINEAR_DAMPING * MAX_LINEAR_VEL * dt)

        # phi is the steering angle *relative to theta_c* (angle between the
        # front wheel's perpendicular and the cabin heading) — step() uses
        # tan(phi) directly, so phi itself must stay within a fixed band
        # around 0. (It must NOT track theta_c: doing so turns this into a
        # feedback loop, since a bigger phi speeds up theta_c, which would
        # then keep raising phi's own ceiling.)
        turning_ccw = keys.get("a") and not keys.get("d")
        turning_cw = keys.get("d") and not keys.get("a")
        if turning_ccw:
            self.phi = min(MAX_STEERING_PHI, self.phi + ANGULAR_ACCEL * dt)
        elif turning_cw:
            self.phi = max(-MAX_STEERING_PHI, self.phi - ANGULAR_ACCEL * dt)
        # else:
        #     decay = ANGULAR_DAMPING * dt
        #     if self.phi > 0:
        #         self.phi = max(0.0, self.phi - decay)
        #     elif self.phi < 0:
        #         self.phi = min(0.0, self.phi + decay)

    def step(self, dt):
        dx_c = self.v * np.cos(self.theta_c)
        dy_c = self.v * np.sin(self.theta_c)
        dtheta_c = self.v / (L / 2) * np.tan(self.phi)
        dtheta_t = self.v / d * np.sin(self.theta_c - self.theta_t)

        dx_t = dx_c + d * dtheta_t * np.sin(self.theta_t)
        dy_t = dy_c - d * dtheta_t * np.cos(self.theta_t)

        self.x_c += dx_c * dt
        self.y_c += dy_c * dt
        self.theta_c += dtheta_c * dt
        self.theta_t += dtheta_t * dt
        self.x_t += dx_t * dt
        self.y_t += dy_t * dt


def main():
    truck = Truck()
    keys = {"w": False, "a": False, "d": False}

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.set_xlim(-10, 10)
    ax.set_ylim(-10, 10)
    ax.set_aspect("equal")
    ax.set_title("Tractor-trailer robot  (W: accelerate, A/D: turn)")
    ax.grid(True, linewidth=0.3)

    # Cabin: square, extends forward from the hitch along theta_c.
    cabin = patches.Rectangle(
        (0, -L / 2),
        L,
        L,
        facecolor="#4da3ff",
        edgecolor="black",
    )
    ax.add_patch(cabin)

    # Trailer: fixed length L2 (<= d), rear axle at (x_t, y_t), body extends
    # forward from the axle along theta_t.
    trailer = patches.Rectangle(
        (0, -W / 2),
        L2,
        W,
        facecolor="#c97b3d",
        edgecolor="black",
    )
    ax.add_patch(trailer)

    (heading_line,) = ax.plot([], [], color="white", linewidth=2)
    # Tow-bar: connects the hitch to the tracked rear-axle point (x_t, y_t).
    (tow_bar,) = ax.plot([], [], color="#8a8a8a", linewidth=2)

    # Rear-wheel axles: a bar perpendicular to the body's heading, with a
    # wheel dot at each end — for sanity checking that a body's
    # position/heading/rear-axle state line up visually.
    (cabin_axle,) = ax.plot([], [], color="#39ff14", linewidth=3, marker="o", markersize=5)
    (trailer_axle,) = ax.plot([], [], color="#ffe14d", linewidth=3, marker="o", markersize=5)

    def axle_endpoints(x, y, theta, track):
        half_track = track / 2
        perp = theta + np.pi / 2
        dx = np.cos(perp) * half_track
        dy = np.sin(perp) * half_track
        return [x - dx, x + dx], [y - dy, y + dy]
    hud = ax.text(0.02, 0.98, "", transform=ax.transAxes, va="top", family="monospace")

    def on_key(event, pressed):
        if event.key in keys:
            keys[event.key] = pressed

    fig.canvas.mpl_connect("key_press_event", lambda e: on_key(e, True))
    fig.canvas.mpl_connect("key_release_event", lambda e: on_key(e, False))

    def update(_frame):
        truck.apply_controls(keys, DT)
        truck.step(DT)

        cabin_transform = (
            Affine2D().rotate(truck.theta_c).translate(truck.x_c, truck.y_c) + ax.transData
        )
        cabin.set_transform(cabin_transform)

        trailer_transform = (
            Affine2D().rotate(truck.theta_t).translate(truck.x_t, truck.y_t) + ax.transData
        )
        trailer.set_transform(trailer_transform)

        heading_line.set_data(
            [truck.x_c, truck.x_c + L * np.cos(truck.theta_c)],
            [truck.y_c, truck.y_c + L * np.sin(truck.theta_c)],
        )

        tow_bar.set_data([truck.x_c, truck.x_t], [truck.y_c, truck.y_t])

        # cabin rear axle coincides with the hitch, (x_c, y_c), in this model
        cabin_axle.set_data(*axle_endpoints(
            truck.x_c + (L / 2) * np.cos(truck.theta_c), 
            truck.y_c + (L / 2) * np.sin(truck.theta_c), truck.phi, L))
        trailer_axle.set_data(*axle_endpoints(truck.x_t, truck.y_t, truck.theta_t, W))

        hud.set_text(
            f"x_c={truck.x_c:6.2f}  y_c={truck.y_c:6.2f}\n"
            f"theta_c={truck.theta_c:5.2f}  theta_t={truck.theta_t:5.2f}\n"
            f"x_t={truck.x_t:6.2f}  y_t={truck.y_t:6.2f}\n"
            f"v={truck.v:5.2f}  phi={truck.phi:5.2f}"
        )

        return cabin, trailer, heading_line, tow_bar, cabin_axle, trailer_axle, hud

    _anim = FuncAnimation(fig, update, interval=DT * 1000, blit=False)
    plt.show()


if __name__ == "__main__":
    main()
