import React, { useEffect, useRef, useState } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import * as THREE from 'three';
// import { TrackballControls } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function Colmap({ onDirectoryChange }) {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [clicked, setClicked] = useState(true);
    const [dataPoints, setDataPoints] = useState(null);
    const axes = new THREE.AxesHelper( 1 );

    // window.addEventListener('keydown', (event) => {
    //     if (controlsRef.current && cameraRef.current) {    
    //         const x = controlsRef.current.target.x;
    //         const y = controlsRef.current.target.y;
    //         const z = controlsRef.current.target.z;
    //         if (event.key.toLowerCase() === "w") {
    //             controlsRef.current.target = new THREE.Vector3(x - 0.005, y, z)
    //             // cameraRef.current.position.z -= 0.005;
    //         } if (event.key.toLowerCase() === "s") {
    //             cameraRef.current.position.z += 0.005;
    //         } if (event.key.toLowerCase() === "a") {
    //             cameraRef.current.position.x -= 0.005;
    //         } if (event.key.toLowerCase() === "d") {
    //             cameraRef.current.position.x += 0.005;
    //         } 
    //     }
    // });

    useEffect(() => {
        if (onDirectoryChange.click) {
            setLocation(onDirectoryChange.location);

            const getLocation = async () => {
                const response = await fetch('http://127.0.0.1:5000/colmap_reconstruction', { 
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ location: onDirectoryChange.location }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Something went wrong on the server.');
                }

                const data = await response.json();
                setDataPoints(data);
                setClicked(false);
            }
            getLocation();

        }
    }, [onDirectoryChange.click]);

    useEffect(() => { 
        if(!dataPoints) return;

        const width = window.innerWidth;
        console.log(width)
        const height = 1100;

        if (rendererRef.current) {
            rendererRef.current.dispose();
            mountRef.current.removeChild(rendererRef.current.domElement)
        }

        const scene = new THREE.Scene();
        scene.add(axes);
        scene.background = new THREE.Color(0x4C4444);
        
        const camera = new THREE.PerspectiveCamera(120, width / height, 0.1, 1000);
        camera.position.z = 2;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        const controls = new OrbitControls(camera, renderer.domElement);

        // Optional: Tune behavior
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        controls.screenSpacePanning = false; // true = pan in screen space, false = pan relative to camera
        controls.minDistance = 1;
        controls.maxDistance = 100;

        controls.enablePan = true;
        // controls.maxPolarAngle = Math.PI / 2; // Limit to prevent flipping

        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        cameraRef.current = camera;
        sceneRef.current = scene;
        controlsRef.current = controls;

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        setClicked(true);

    }, [dataPoints]);

    useEffect(() => { 
        if (dataPoints && !clicked) {
            const positions = [];
            const colors = [];
            const geometry = new THREE.BufferGeometry();

            dataPoints.points.forEach(pt => {
                if (pt.r == 0 && pt.g == 0 && pt.b == 0) {
                    console.log("SKIP")
                } else {
                    positions.push(pt.x, -pt.y, pt.z);
                    colors.push(pt.r / 255, pt.g / 255, pt.b / 255);
                }
            })

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({ size: 0.005, vertexColors: true });
            const points = new THREE.Points(geometry, material);

            sceneRef.current.add(points);
        }

        setClicked(true);

    }, [clicked]);

    return (
        <div
        ref={mountRef}
        style={{
            width: '100%',
            height: '500px',
            marginTop: '20px',
        }}
        />

    )

}

export default Colmap;