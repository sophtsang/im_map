import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stack from '@mui/material/Stack'
import Slider from '@mui/material/Slider'
import StopIcon from '@mui/icons-material/Stop';
import SquareIcon from '@mui/icons-material/Square';
import { io } from "socket.io-client";
import './Colmap.css'
import App from "./App";

const socket = io('http://localhost:5000');
// const socket = io("https://im-map.onrender.com");

function Lidar() {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const materialRef = useRef(null);
    const [clicked, setClicked] = useState(true);
    const currentRender = useRef(null);
    if (!currentRender) {
        currentRender.current = 'points';
    }

    const [dataPoints, setDataPoints] = useState(null);
    const axes = new THREE.AxesHelper( 10 );
    axes.rotation.y = Math.PI / 2;
    const grid = new THREE.GridHelper( 10, 20 )
    grid.rotation.z = -Math.PI / 2;

    const [pxSize, setPXSize] = useState(0.05);
    const [width, setWidth] = useState(window.innerWidth-500);
    const height = window.innerHeight - 275;

    window.addEventListener('resize', () => {
        setWidth(window.innerWidth-500);
        if (rendererRef.current) {
            rendererRef.current.setSize(window.innerWidth, height)
        }
    })

    const renderScene = () => {
        if (rendererRef.current) {
            try {
                rendererRef.current.dispose();
                mountRef.current.removeChild(rendererRef.current.domElement)
            } catch {
                console.log(mountRef.current)
            }
        }

        if (sceneRef.current) {
            const oldPoints = sceneRef.current.getObjectByName("renderedPoints");
            if (oldPoints) {
                sceneRef.current.remove(oldPoints);
                oldPoints.geometry.dispose();
                oldPoints.material.dispose();
            }
        }

        const scene = new THREE.Scene();
        scene.add(grid);
        scene.add(axes);
        
        scene.background = new THREE.Color(0x4C4444);

        scene.rotation.z = Math.PI / 2;
        sceneRef.current = scene;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, height);

        const camera = new THREE.PerspectiveCamera(120, width / height, 0.1, 1000);
        camera.position.set(-1, 1, 1)
        cameraRef.current = camera

        const controls = new OrbitControls(cameraRef.current, renderer.domElement);

        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 100;

        controls.enablePan = true;

        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        controlsRef.current = controls;

        socket.on("colmap_update", (data) => {
            setDataPoints(data);
        });

        rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    useEffect(() => {
        renderScene();

        const animate = () => {
            requestAnimationFrame(animate);
            controlsRef.current.update();
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        animate();

        return () => {
            socket.off("colmap_update");
        };
    }, []);

    const handleSliderChange = useCallback((pxSize) => {
        setPXSize(pxSize);
        if (materialRef.current) {
            materialRef.current.size = pxSize;
        }
    }, [setPXSize]);

    useEffect(() => {
        if (!dataPoints) return;

        renderScene();
        renderPoints();

        const animate = () => {
            requestAnimationFrame(animate);
            controlsRef.current.update();
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        animate();
    }, [dataPoints]);

    function renderPoints() {
        const geometry = new THREE.BufferGeometry();
        const colors = [];
        const positions = [];

        currentRender.current = 'points';

        dataPoints.points.forEach(pt => {
            positions.push(pt.x, pt.y, pt.z);
            colors.push(pt.r / 255, pt.g / 255, pt.b / 255);
        })

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({ size: pxSize, vertexColors: true });
        materialRef.current = material;
        const points = new THREE.Points(geometry, material);
        points.name = "renderedPoints";

        sceneRef.current.add(points);
    }
    
    return (
        <App enableUI={false} popup={
            <div style={{padding: 2, 
                background: '#E8E6E5', 
                fontFamily: 'Pixelify Sans',
            }}>
                <h2 className="street-h2">vroom vroom</h2>
                <Stack sx={{ 
                        alignItems: 'center',
                        mb: 1,
                    }}
                >
                    <Stack 
                        spacing={2}
                        direction="row"
                        sx={{ 
                            alignItems: 'center',
                            mb: 1
                        }}
                    >
                        <span style={{ color: "#4C4444" }}>pxls:</span>
                        <StopIcon sx={{ color: '#4C4444' }}/>
                        <Slider
                            defaultValue={0.05} 
                            aria-label="Pixel Size" 
                            value={pxSize}
                            marks
                            min={0.01}
                            max={0.2}
                            step={0.01}
                            valueLabelDisplay="auto"
                            onChange={(event, pxSize) => handleSliderChange(pxSize)} 
                            sx={{
                                color: '#4C4444',
                                height: 8,
                                width: '500px',
                                '& .MuiSlider-track': {
                                    backgroundColor: '#4C4444',
                                },
                                '& .MuiSlider-rail': {
                                    opacity: 0.3,
                                    backgroundColor: '#948D8D',
                                },
                                '& .MuiSlider-thumb': {
                                    height: 20,
                                    width: 20,
                                    backgroundColor: '#948D8D',
                                    border: '6px solid #4C4444',
                                    '&:hover': {
                                    boxShadow: '0 0 0 8px #BEB9B9',
                                    },
                                    '&.Mui-active': {
                                    boxShadow: '0 0 0 14px #948D8D',
                                    },
                                },
                                '& .MuiSlider-mark': {
                                    height: 8,
                                    '&.MuiSlider-markActive': {
                                    opacity: 1,
                                    backgroundColor: '#948D8D',
                                    },
                                },
                                '& .MuiSlider-valueLabel': {
                                    backgroundColor: '#948D8D',
                                    fontFamily: 'Pixelify Sans',
                                    fontSize: 18
                                }
                            }}
                        />
                        <SquareIcon sx={{ color: '#4C4444',
                                    fontSize: 25 }}/>
                    </Stack>
                    <div
                        ref={mountRef}
                        style={{
                            width: '100%',
                            marginTop: '20px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                    </div>

                </Stack>
            </div>}
            animate={false}
        />
    )
}

export default Lidar;