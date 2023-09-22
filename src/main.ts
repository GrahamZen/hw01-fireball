import { vec2, vec3 } from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import { setGL } from './globals';
import ShaderProgram, { Shader } from './rendering/gl/ShaderProgram';
import { vec4, mat4 } from 'gl-matrix';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
    tesselations: 5,
    amplitude: 1,
    parabola: 40,
    frequency_fbm: 5,
    pause: false,
    volume: 0.5,
    visualize: true,
    'Load Scene': loadScene, // A function pointer, essentially
    'Reset': reset,
};

let icosphere: Icosphere;
let square: Square;
let cube: Cube;
let prevTesselations: number = 5;

function reset() {
    controls.tesselations = 5;
    controls.amplitude = 1;
    controls.parabola = 40;
    controls.frequency_fbm = 5;
    controls.pause = false;
    controls.volume = 0.5;
    controls.visualize = true;
}

function loadScene() {
    icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
    icosphere.create();
    cube = new Cube(vec3.fromValues(0, 0, 0));
    cube.create();
    square = new Square(vec3.fromValues(0, 0, 0));
    square.create();
}

function main() {
    // Initial display for framerate
    const stats = Stats();
    stats.setMode(0);
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    var palette = {
        color: [0, 0, 0] // RGB array
    };

    const audioContext = new AudioContext();
    const audio = new Audio('audio/emiya.mp3');
    const source = audioContext.createMediaElementSource(audio);
    source.connect(audioContext.destination);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    source.connect(analyser);
    audio.loop = true;
    function getAmp() {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        return sum / dataArray.length;
    }

    // Add controls to the gui
    const gui = new DAT.GUI();
    gui.add(controls, 'tesselations', 0, 8).step(1);
    gui.add(controls, 'Load Scene');
    gui.add(controls, 'Reset').onChange(function () {
        audio.play();
        audioContext.resume();
    });
    gui.add(controls, 'volume', 0, 1).step(0.01).onChange(function (value) {
        audio.volume = value;
    });
    gui.add(controls, 'visualize');
    gui.add(controls, 'pause').onChange(function (value) {
        if (value) {
            audio.pause();
        } else {
            audio.play();
            audioContext.resume();
        }
    });
    gui.addColor(palette, 'color');
    gui.add(controls, 'amplitude', 0.1, 10).step(0.1);
    gui.add(controls, 'parabola', 1, 200).step(0.5);
    gui.add(controls, 'frequency_fbm', 1, 15).step(0.1);
    // get canvas and webgl context
    const canvas = <HTMLCanvasElement>document.getElementById('canvas');
    const gl = <WebGL2RenderingContext>canvas.getContext('webgl2');
    if (!gl) {
        alert('WebGL 2 not supported!');
    }
    // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
    // Later, we can import `gl` from `globals.ts` to access it
    setGL(gl);

    // Initial call to load scene
    loadScene();

    const camera = new Camera(vec3.fromValues(0, 0, 40), vec3.fromValues(0, 0, 0));

    const renderer = new OpenGLRenderer(canvas);
    renderer.setClearColor(0.2, 0.2, 0.2, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    const noise = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/noise-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/noise-frag.glsl')),
    ]);
    const lambert = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
    ]);

    const flat = new ShaderProgram([
        new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
        new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
    ]);


    var curr_prog = noise;

    // This function will be called every frame
    let old_time = 0;
    let isRecorded = false;
    function tick(timestamp: number) {
        camera.update();
        stats.begin();
        let averageAmplitude = 12 * getAmp();
        curr_prog.setGeometryColor(vec4.fromValues(palette.color[0] / 255, palette.color[1] / 255, palette.color[2] / 255, 1));
        if (controls.pause) {
            if (!isRecorded) {
                old_time = timestamp * 0.001;
                isRecorded = true;
                curr_prog.setTime(old_time);
                lambert.setTime(old_time);
                flat.setTime(old_time);
            }
        } else {
            curr_prog.setTime(timestamp * 0.001);
            flat.setTime(timestamp * 0.001);
            lambert.setTime(timestamp * 0.001);
            isRecorded = false;
            if (controls.visualize) {
                curr_prog.setAmp(controls.amplitude * averageAmplitude / 100.0);
                flat.setAmp(controls.amplitude * averageAmplitude / 100.0);
            }
            else {
                curr_prog.setAmp(controls.amplitude);
                flat.setAmp(controls.amplitude);
            }
        }
        curr_prog.setModelMatrix(mat4.fromScaling(mat4.create(), vec3.fromValues(1, 1, 1)));
        curr_prog.setFreq(1);
        curr_prog.setImpulse(controls.parabola);
        curr_prog.setFreqFbm(controls.frequency_fbm);
        curr_prog.setVis(controls.visualize ? 1 : 0);
        flat.setVis(controls.visualize ? 1 : 0);
        flat.setImpulse(controls.parabola);
        flat.setCamPos(camera.controls.eye);
        flat.setDimensions(vec2.fromValues(window.innerWidth, window.innerHeight));
        flat.setGeometryColor(vec4.fromValues(palette.color[0] / 255, palette.color[1] / 255, palette.color[2] / 255, 1));
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.clear();
        if (controls.tesselations != prevTesselations) {
            prevTesselations = controls.tesselations;
            icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
            icosphere.create();
            cube = new Cube(vec3.fromValues(0, 0, 0));
            cube.create();
        }
        // set the model matrix to an scaled matrix with scale factor 4
        lambert.setModelMatrix(mat4.fromScaling(mat4.create(), vec3.fromValues(500, 500, 500)));
        lambert.setGeometryColor(vec4.fromValues(palette.color[0] / 255, palette.color[1] / 255, palette.color[2] / 255, 1));
        renderer.render(camera, lambert, [
            cube
        ]);
        gl.depthMask(false);
        renderer.render(camera, flat, [
            square,
        ]);
        gl.depthMask(true);
        renderer.render(camera, curr_prog, [
            icosphere,
        ]);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        stats.end();

        // Tell the browser to call `tick` again whenever it renders a new frame
        requestAnimationFrame(tick);
    }

    window.addEventListener('resize', function () {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.setAspectRatio(window.innerWidth / window.innerHeight);
        camera.updateProjectionMatrix();
    }, false);

    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();

    // Start the render loop
    if (controls.pause) {
        audio.pause();
    } else {
        audio.play();
    }
    requestAnimationFrame(tick);
}

main();
