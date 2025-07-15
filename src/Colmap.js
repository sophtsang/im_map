import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import { styled } from '@mui/material/styles';

import './Colmap.css'

function Colmap({ onDirectoryChange }) {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const materialRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [clicked, setClicked] = useState(true);
    const [dataPoints, setDataPoints] = useState(null);
    const axes = new THREE.AxesHelper( 1 );
    const [pxSize, setPXSize] = useState(0.005);
    const [width, setWidth] = useState(window.innerWidth);
    const height = 1020;

    window.addEventListener('resize', () => {
        setWidth(window.innerWidth);
        if (rendererRef.current) {
            rendererRef.current.setSize(window.innerWidth, height)
        }
        // if (cameraRef.current) {
        //     cameraRef.current.aspect = window.innerWidth / height
        // }
    })

    const handleSliderChange = useCallback((pxSize) => {
        setPXSize(pxSize);
        if (materialRef.current) {
            materialRef.current.size = pxSize;
        }
    }, [setPXSize]);

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

        if (rendererRef.current) {
            try {
                rendererRef.current.dispose();
                mountRef.current.removeChild(rendererRef.current.domElement)
        
            } catch {
                console.log(mountRef.current)
            }
        }

        const scene = new THREE.Scene();
        scene.add(axes);
        scene.background = new THREE.Color(0x4C4444);

        const camera = new THREE.PerspectiveCamera(120, width / height, 0.1, 1000);
        camera.position.z = 2;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        const controls = new OrbitControls(camera, renderer.domElement);

        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        controls.screenSpacePanning = false; // true = pan in screen space, false = pan relative to camera
        controls.minDistance = 1;
        controls.maxDistance = 100;

        controls.enablePan = true;

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
                if (pt.r != 0 || pt.g != 0 || pt.b != 0) {
                    positions.push(pt.x, -pt.y, pt.z);
                    colors.push(pt.r / 255, pt.g / 255, pt.b / 255);
                }
            })

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({ size: pxSize, vertexColors: true });
            materialRef.current = material;
            const points = new THREE.Points(geometry, material);

            sceneRef.current.add(points);
        }

        setClicked(true);

    }, [clicked]);

    return (
        <Stack 
            spacing={0.001}
            direction="column"
            sx={{ 
                alignItems: 'center',
                mb: 1
            }}
        >
            {dataPoints && rendererRef.current && (<Slider
                    defaultValue={0.005} 
                    aria-label="Pixel Size" 
                    value={pxSize}
                    marks
                    min={0.001}
                    max={0.02}
                    step={0.001}
                    valueLabelDisplay="auto"
                    onChange={(event, pxSize) => handleSliderChange(pxSize)} 
                    sx={{
                        color: '#4C4444',
                        height: 8,
                        // width: '50%'
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
                            // backgroundColor: '#4C4444',
                            height: 8,
                            '&.MuiSlider-markActive': {
                            opacity: 1,
                            backgroundColor: '#948D8D',
                            },
                        },
                    }}
                />)}
            {dataPoints && (<div
                ref={mountRef}
                style={{
                    width: '100%',
                    height: '500px',
                    marginTop: '20px',
            }}></div>)}
        </Stack>
    )
}

export default Colmap;