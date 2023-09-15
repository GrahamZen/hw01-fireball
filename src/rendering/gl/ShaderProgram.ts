import { vec4, mat4 } from 'gl-matrix';
import Drawable from './Drawable';
import { gl } from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
    shader: WebGLShader;

    constructor(type: number, source: string) {
        this.shader = gl.createShader(type);
        gl.shaderSource(this.shader, source);
        gl.compileShader(this.shader);

        if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
            throw gl.getShaderInfoLog(this.shader);
        }
    }
};

class ShaderProgram {
    prog: WebGLProgram;

    attrPos: number;
    attrNor: number;
    attrCol: number;

    unifModel: WebGLUniformLocation;
    unifModelInvTr: WebGLUniformLocation;
    unifViewProj: WebGLUniformLocation;
    unifColor: WebGLUniformLocation;
    unifTime: WebGLUniformLocation;
    unifAmp: WebGLUniformLocation;
    unifFreq: WebGLUniformLocation;
    unifImpulse: WebGLUniformLocation;
    unifFreqFbm: WebGLUniformLocation;
    unifPause: WebGLUniformLocation;
    unifVis: WebGLUniformLocation;

    constructor(shaders: Array<Shader>) {
        this.prog = gl.createProgram();

        for (let shader of shaders) {
            gl.attachShader(this.prog, shader.shader);
        }
        gl.linkProgram(this.prog);
        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
            throw gl.getProgramInfoLog(this.prog);
        }

        this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
        this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
        this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
        this.unifModel = gl.getUniformLocation(this.prog, "u_Model");
        this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
        this.unifViewProj = gl.getUniformLocation(this.prog, "u_ViewProj");
        this.unifColor = gl.getUniformLocation(this.prog, "u_Color");
        this.unifTime = gl.getUniformLocation(this.prog, "u_Time");
        this.unifAmp = gl.getUniformLocation(this.prog, "u_Amp");
        this.unifFreq = gl.getUniformLocation(this.prog, "u_Freq");
        this.unifImpulse = gl.getUniformLocation(this.prog, "u_Impulse");
        this.unifFreqFbm = gl.getUniformLocation(this.prog, "u_FreqFbm");
        this.unifPause = gl.getUniformLocation(this.prog, "u_Pause");
        this.unifVis = gl.getUniformLocation(this.prog, "u_Vis");
    }

    use() {
        if (activeProgram !== this.prog) {
            gl.useProgram(this.prog);
            activeProgram = this.prog;
        }
    }

    setModelMatrix(model: mat4) {
        this.use();
        if (this.unifModel !== -1) {
            gl.uniformMatrix4fv(this.unifModel, false, model);
        }

        if (this.unifModelInvTr !== -1) {
            let modelinvtr: mat4 = mat4.create();
            mat4.transpose(modelinvtr, model);
            mat4.invert(modelinvtr, modelinvtr);
            gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
        }
    }

    setViewProjMatrix(vp: mat4) {
        this.use();
        if (this.unifViewProj !== -1) {
            gl.uniformMatrix4fv(this.unifViewProj, false, vp);
        }
    }

    setGeometryColor(color: vec4) {
        this.use();
        if (this.unifColor !== -1) {
            gl.uniform4fv(this.unifColor, color);
        }
    }

    setTime(time: number) {
        this.use();
        if (this.unifTime !== -1) {
            gl.uniform1f(this.unifTime, time);
        }
    }

    setAmp(amp: number) {
        this.use();
        if (this.unifAmp !== -1) {
            gl.uniform1f(this.unifAmp, amp);
        }
    }

    setFreq(freq: number) {
        this.use();
        if (this.unifFreq !== -1) {
            gl.uniform1f(this.unifFreq, freq);
        }
    }

    setImpulse(impulse: number) {
        this.use();
        if (this.unifImpulse !== -1) {
            gl.uniform1f(this.unifImpulse, impulse);
        }
    }

    setFreqFbm(freqFbm: number) {
        this.use();
        if (this.unifFreqFbm !== -1) {
            gl.uniform1f(this.unifFreqFbm, freqFbm);
        }
    }

    setPause(pause: number) {
        this.use();
        if (this.unifPause !== -1) {
            gl.uniform1i(this.unifPause, pause);
        }
    }

    setVis(Vis: number) {
        this.use();
        if (this.unifVis !== -1) {
            gl.uniform1i(this.unifVis, Vis);
        }
    }

    draw(d: Drawable) {
        this.use();

        if (this.attrPos != -1 && d.bindPos()) {
            gl.enableVertexAttribArray(this.attrPos);
            gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
        }

        if (this.attrNor != -1 && d.bindNor()) {
            gl.enableVertexAttribArray(this.attrNor);
            gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
        }

        d.bindIdx();
        gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

        if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
        if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    }
};

export default ShaderProgram;