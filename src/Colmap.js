import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'
import Switch from '@mui/material/Switch'
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import NoPhotographyIcon from '@mui/icons-material/NoPhotography';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import StopIcon from '@mui/icons-material/Stop';
import SquareIcon from '@mui/icons-material/Square';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import './Colmap.css'

function Colmap({ onDirectoryChange, onHeadingChange }) {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const materialRef = useRef(null);
    const camGeomRef = useRef(null);
    const options = useRef({});
    const [location, setLocation] = useState(null);
    const [heading, setHeading] = useState(0);
    const fuseSwitch = useRef(<FormControlLabel disabled control={
                    <Switch 
                        sx={{ color: '#4C4444' }}
                    />} 
                />);
    const [clicked, setClicked] = useState(true);
    const currentRender = useRef(null);
    if (!currentRender) {
        currentRender.current = 'points';
    }

    const [checkedEvent, setCheckedEvent] = useState(null);
    const dataPoints = useRef(null);
    const axes = new THREE.AxesHelper( 100 );
    const grid = new THREE.GridHelper( 200, 20 )
    grid.rotation.x = -Math.PI / 2;
    const manager = new THREE.LoadingManager()

    const loadingScreen = document.getElementById('loading_screen');
    
    const loadingImgs = [
        document.getElementById('loading_img_0'),
        document.getElementById('loading_img_1'),
        document.getElementById('loading_img_2'),
        document.getElementById('loading_img_3')
    ];
    manager.onStart = function(url, itemsLoaded, itemsTotal ) {
        loadingScreen?.classList.add('active')
        loadingImgs[0]?.classList.add('active');
    };
    // manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    //     console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
    // };
    manager.onLoad = function ( ) {
        loadingScreen?.classList.remove('active')
        loadingImgs.forEach(img => img.classList.remove('active'));
    };

    const [pxSize, setPXSize] = useState(0.05);
    const [camSize, setCamSize] = useState(2.0);
    const [width, setWidth] = useState(window.innerWidth - 500);
    const height = window.innerHeight - 275;

    window.addEventListener('resize', () => {
        setWidth(window.innerWidth - 500);
        if (rendererRef.current) {
            rendererRef.current.setSize(window.innerWidth - 500, height)
        }
    })

    function renderPoints() {
        const geometry = new THREE.BufferGeometry();
        const colors = [];
        const positions = [];

        currentRender.current = 'points';

        if (sceneRef.current) {
            const oldPoints = sceneRef.current.getObjectByName("renderedPoints");
            if (oldPoints) {
                sceneRef.current.remove(oldPoints);
                oldPoints.geometry.dispose();
                oldPoints.material.dispose();
            }
        }

        dataPoints.current.points.forEach(pt => {
            // positions.push(-pt.x, -pt.y, pt.z);
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

    async function renderFused() {
        const loader = new PLYLoader(manager);
        // console.log("FUSED")

        if (currentRender.current === 'fused_points') {
            return;
        }

        currentRender.current = 'fused_points';

        if (sceneRef.current) {
            const oldPoints = sceneRef.current.getObjectByName("renderedPoints");
            if (oldPoints) {
                sceneRef.current.remove(oldPoints);
                oldPoints.geometry.dispose();
                oldPoints.material.dispose();
            }
        }

        const colmap_location = location.replace(/ /g, '_') + "/sparse/" + options.current.choice;
        // loader.load(process.env.PUBLIC_URL + "/doppelgangers/" + location.replace(/ /g, '_') + "/dense/fused.ply",
        loader.load(
            `https://im-map.onrender.com/get_fused/${colmap_location}`,
            // `http://127.0.0.1:5000/get_fused/${colmap_location}`,
            (geometry) => {
                const positions = geometry.attributes.position;
                for (let i = 0; i < positions.count; i++) {
                    // positions.setX(i, -positions.getX(i));
                    // positions.setY(i, -positions.getY(i));
                    positions.setX(i, positions.getX(i));
                    positions.setY(i, positions.getY(i));
                }
                positions.needsUpdate = true;
                geometry.computeVertexNormals();
                const material = new THREE.PointsMaterial({
                    size: 0.01,
                    vertexColors: true,
                });
                const points = new THREE.Points(geometry, material);
                points.name = "renderedPoints";
                sceneRef.current.add(points);
            }, 
            (xhr) => {
                if (xhr.lengthComputable) {
                    const percentComplete = Math.round(xhr.loaded / xhr.total * 100);
                    loadingImgs.forEach((img, i) => i === Math.min(3, Math.round(percentComplete / 25)) ? img.classList.add('active') : img.classList.remove('active'));
                }
            }
        );
    }

    const handleOptionChange = (event, choice) => {
        if (choice) {
            options.current = {options: options.current.options, choice: choice}
            checkLocation(onDirectoryChange.location + "/sparse/" + choice)
            getLocation(choice)
        }
    }

    const handleSliderChange = useCallback((pxSize) => {
        setPXSize(pxSize);
        if (materialRef.current) {
            materialRef.current.size = pxSize;
        }
    }, [setPXSize]);

    async function checkLocation(colmap_location) {
        try {
            const response = await fetch('https://im-map.onrender.com/check_location', { 
            // const response = await fetch('http://127.0.0.1:5000/check_location', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({ location: colmap_location }),
            });

            const data = await response.json();
            if (data.options && onDirectoryChange.click) {
                options.current = { options: data.options, choice: data.options[0] };
            } 

            if (data.exists) {
                fuseSwitch.current = <Switch 
                    onChange={handleRenderChange} 
                    sx={{ color: '#4C4444' }}
                />;
            } else {
                fuseSwitch.current = <FormControlLabel disabled control={
                    <Switch 
                        onChange={handleRenderChange} 
                        sx={{ color: '#4C4444' }}
                    />} 
                />;
            }
        } catch {
            fuseSwitch.current = <FormControlLabel disabled control={
                <Switch 
                    onChange={handleRenderChange} 
                    sx={{ color: '#4C4444' }}
                />} 
            />;
        }
    }

    async function getLocation(render_choice) {
        const response = await fetch('https://im-map.onrender.com/colmap_reconstruction', { 
        // const response = await fetch('http://127.0.0.1:5000/colmap_reconstruction', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({ location: onDirectoryChange.location + "/sparse/" + render_choice }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Something went wrong on the server.');
        }

        const data = await response.json();
        if (onDirectoryChange.click || data != null) {
            dataPoints.current = data
        }

        setClicked(false);
    }

    useEffect(() => {
        currentRender.current = 'points';
        checkLocation(onDirectoryChange.location);
    }, [onDirectoryChange.click])

    const handleRenderChange = (event) => {
        if (event) {
            setCheckedEvent(event)
        } else if (checkedEvent) {
            event = checkedEvent
        }

        if (event && event.target.checked && clicked) {
            renderFused();
        } else {
            renderPoints();
        }
    };

    const handleCamSliderChange = useCallback((camSize) => {
        setCamSize(camSize);
        setClicked(false);
        if (camGeomRef.current) {
            camGeomRef.current.parameters.height = camSize;
            camGeomRef.current.parameters.width = camSize;
        }
    }, [setCamSize]);

    useEffect(() => {
        if (onDirectoryChange.click) {
            setLocation(onDirectoryChange.location);
            getLocation('scaled');
        }
    }, [onDirectoryChange.click, options.current.choice]);

    useEffect(() => {
        if(!dataPoints.current) return;

        if (rendererRef.current) {
            try {
                rendererRef.current.dispose();
                mountRef.current.removeChild(rendererRef.current.domElement)
            } catch {
                console.log(mountRef.current)
            }
        }

        const scene = new THREE.Scene();
        scene.add(grid);
        scene.add(axes);
       
        scene.background = new THREE.Color(0x4C4444);

        const camera = new THREE.PerspectiveCamera(120, width / height, 0.1, 1000);
        if (dataPoints.current.mean) {
            camera.position.set(Math.abs(dataPoints.current.mean[0]), Math.abs(dataPoints.current.mean[1]), Math.abs(dataPoints.current.mean[2]))
        }

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        const controls = new OrbitControls(camera, renderer.domElement);

        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 3.5;

        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 100;

        controls.enablePan = true;

        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        cameraRef.current = camera;
        scene.rotation.x = -Math.PI / 2;
        sceneRef.current = scene;
        controlsRef.current = controls;

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();

            let angle = controls.getAzimuthalAngle(); 
            if (angle < 0) {
                angle += 2 * Math.PI;
            }
            angle = ((angle * 180) / Math.PI) - 180
            if (angle !== heading) {
                setHeading(angle)
                onHeadingChange?.(angle);
            }

            renderer.render(scene, camera);
        };
        animate();

        setClicked(true);

    }, [dataPoints.current]);

    useEffect(() => { 
        if (dataPoints.current && !clicked) {
            const cameras = [];

            if (sceneRef.current) {
                const oldPlanes = sceneRef.current.getObjectByName("cameraPlanes");
                if (oldPlanes) {
                    sceneRef.current.remove(oldPlanes);
                    oldPlanes.geometry.dispose();
                    oldPlanes.material.dispose();
                }
            }

            dataPoints.current.cameras.forEach(cam => {
                cameras.push({x: cam.center[0], y: cam.center[1], z: cam.center[2], 
                              color: new THREE.Color(0xffe9e9),
                              qw: cam.qvec[0], qx: cam.qvec[1], qy: cam.qvec[2], qz: cam.qvec[3],
                              rotation: cam.rotation, img_name: cam.image_name });
            })

            const planeGeometry = new THREE.PlaneGeometry( camSize, camSize );
            const planeMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, opacity: 0.5 })
            camGeomRef.current = planeGeometry;

            handleRenderChange(null);
            
            const planes = new THREE.InstancedMesh(planeGeometry, planeMaterial, cameras.length)
            planes.name = "cameraPlanes";
            sceneRef.current.add(planes);
        
            if (camSize > 0) {
                const dummy = new THREE.Object3D();

                cameras.forEach((data, i) => {
                    const rotation = new THREE.Euler(data.rotation[0], data.rotation[1], data.rotation[2])

                    dummy.rotation.copy(rotation)
                    // dummy.position.set(-data.x, -data.y, data.z);
                    dummy.position.set(data.x, data.y, data.z);

                    dummy.scale.set(0.5, 0.5, 0.5);
                    dummy.updateMatrix();

                    planes.setMatrixAt(i, dummy.matrix);

                    if (data.color) {
                        planes.setColorAt(i, data.color);
                    }
                })
            }
        }
        setClicked(true);
    }, [clicked]);

    return (
        <Stack sx={{ 
                    alignItems: 'center',
                    mb: 1
                }}
        >
            {dataPoints.current && rendererRef.current && (
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
            )}
            {dataPoints.current && rendererRef.current && (
                <Stack 
                    spacing={2}
                    direction="row"
                    sx={{ 
                        alignItems: 'center',
                        mb: 1
                    }}
                >
                    <span style={{ color: "#4C4444" }}>cam: </span>
                    <NoPhotographyIcon sx={{ color: '#4C4444' }}/>
                    <Slider
                        defaultValue={4.0} 
                        aria-label="Camera Size" 
                        value={camSize}
                        marks
                        min={0}
                        max={10.0}
                        step={0.5}
                        valueLabelDisplay="auto"
                        onChange={(event, camSize) => handleCamSliderChange(camSize)} 
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
                    <CameraAltIcon sx={{ color: '#4C4444' }}/>
                </Stack>
            )}
     
            <Stack 
                    spacing={5}
                    direction="row"
                    sx={{ 
                        alignItems: 'center',
                        mb: 1
                    }}
            >
                {dataPoints.current && rendererRef.current && options.current && (
                    <Autocomplete
                        disablePortal
                        options={options.current.options}
                        sx={{ width: 150,
                              fontFamily: 'Pixelify Sans'
                        }}
                        onChange={handleOptionChange}
                        renderInput={(params) => <TextField {...params} 
                                                    variant="filled"
                                                    label="facade"
                                                    sx={{
                                                        '& .MuiInputBase-input': {
                                                            fontFamily: 'Pixelify Sans',
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            fontFamily: 'Pixelify Sans',
                                                            fontSize: 20
                                                        },
                                                        '& .MuiFilledInput-root': {
                                                        '&:before, &:after': {
                                                            borderBottom: 'none',
                                                        }},
                                                    }}
                                                />
                                    }
                    />
                )}
                
                {dataPoints.current && rendererRef.current && (
                    <Grid component="label" container alignItems="center" spacing={1}>
                        <Grid item
                              sx={{
                                color: '#948D8D'
                              }}>sprs</Grid>
                        <Grid item>{fuseSwitch.current}</Grid>
                        <Grid item
                              sx={{
                                color: '#948D8D'
                              }}>dens</Grid>
                    </Grid>
                )}

            </Stack>

            {dataPoints.current && (<div
                ref={mountRef}
                style={{
                    width: '100%',
                    marginTop: '20px',
                    position: 'relative',
                    overflow: 'hidden'
            }}>
                <div id="loading_screen"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                }}>
                    <img id="loading_img_0" className="loading_img" src={process.env.PUBLIC_URL + "/loading0.png"}/>
                    <img id="loading_img_1" className="loading_img" src={process.env.PUBLIC_URL + "/loading1.png"}/>
                    <img id="loading_img_2" className="loading_img" src={process.env.PUBLIC_URL + "/loading2.png"}/>
                    <img id="loading_img_3" className="loading_img" src={process.env.PUBLIC_URL + "/loading3.png"}/>
                </div>
            </div>)}

        </Stack>
    )
}

export default Colmap;