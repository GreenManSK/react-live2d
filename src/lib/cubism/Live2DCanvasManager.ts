import {CubismViewMatrix} from '@cubism/math/cubismviewmatrix';
import {CubismMatrix44} from '@cubism/math/cubismmatrix44';

import type {ILive2DCanvas} from './Live2DCanvas.interface';
import type {Live2DModelManager} from './Live2DModelManager';
import {Live2DTextureManager} from './Live2DTextureManager';

export class Live2DCanvasManager implements ILive2DCanvas {
    public readonly textureManager: Live2DTextureManager;
    public viewMatrix: CubismViewMatrix;
    public readonly deviceToCanvas: CubismMatrix44;

    private frameBuffer: WebGLFramebuffer;
    private models = new Set<Live2DModelManager>();
    private shader: WebGLProgram | null = null;
    private canvas?: HTMLCanvasElement;

    private lastCanvasRatio = 0;

    public constructor(private readonly gl: WebGLRenderingContext) {
        this.textureManager = new Live2DTextureManager(gl);
        this.viewMatrix = new CubismViewMatrix();
        this.deviceToCanvas = new CubismMatrix44();
        this.frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    }

    public setup(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const {width, height} = this.canvas;
        const {left, right, bottom, top} = this.getCanvasBounds();

        this.updateViewMatrix();
        this.deviceToCanvas.loadIdentity();
        if (width > height) {
            const screenW: number = Math.abs(right - left);
            this.deviceToCanvas.scaleRelative(screenW / width, -screenW / width);
        } else {
            const screenH: number = Math.abs(top - bottom);
            this.deviceToCanvas.scaleRelative(screenH / height, -screenH / height);
        }
        this.deviceToCanvas.translateRelative(-width * 0.5, -height * 0.5);

        this.createShader();
    }

    public render(deltaTime: number) {
        this.updateViewMatrix();
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.gl.useProgram(this.shader);
        this.gl.flush();

        const canvasWidth = this.canvas?.width ?? 0;
        const canvasHeight = this.canvas?.height ?? 0;
        const viewport: number[] = [0, 0, canvasWidth, canvasHeight];
        this.models.forEach((model) => {
            model.render(
                deltaTime,
                viewport,
                this.viewMatrix,
                this.deviceToCanvas,
                this.frameBuffer,
                canvasWidth,
                canvasHeight,
                this.canvas?.offsetLeft ?? 0,
                this.canvas?.offsetTop ?? 0
            );
        });
    }

    public dispose() {
        this.textureManager.dispose();
        this.gl.deleteProgram(this.shader);
    }

    public addModel(model: Live2DModelManager) {
        this.models.add(model);
    }

    public removeModel(model: Live2DModelManager) {
        this.models.delete(model);
    }

    private updateViewMatrix() {
        if (!this.canvas) {
            return;
        }
        const {width, height} = this.canvas;
        const ratio = width / height;
        if (this.lastCanvasRatio === ratio) {
            return;
        }

        this.lastCanvasRatio = ratio;
        const {left, right, bottom, top} = this.getCanvasBounds();
        this.viewMatrix.setScreenRect(left, right, bottom, top);
        this.viewMatrix.scale(1.0, 1.0);
        this.viewMatrix.setMaxScreenRect(-2.0, 2.0, -2.0, 2.0);
    }

    private getCanvasBounds() {
        if (!this.canvas) {
            return {left: 0, right: 0, bottom: 0, top: 0};
        }
        const {width, height} = this.canvas;
        const ratio = width / height;
        const left = -ratio;
        const right = ratio;
        const bottom = -1.0;
        const top = 1.0;
        return {left, right, bottom, top};
    }

    private createShader() {
        const vertexShaderId = this.gl.createShader(this.gl.VERTEX_SHADER);

        if (vertexShaderId == null) {
            console.error('Live2DCanvasManager: failed to create vertexShader');
            return null;
        }

        const vertexShader: string =
            'precision mediump float;' +
            'attribute vec3 position;' +
            'attribute vec2 uv;' +
            'varying vec2 vuv;' +
            'void main(void)' +
            '{' +
            '   gl_Position = vec4(position, 1.0);' +
            '   vuv = uv;' +
            '}';

        this.gl.shaderSource(vertexShaderId, vertexShader);
        this.gl.compileShader(vertexShaderId);

        const fragmentShaderId = this.gl.createShader(this.gl.FRAGMENT_SHADER);

        if (fragmentShaderId == null) {
            console.error('Live2DCanvasManager: failed to create fragmentShader');
            return null;
        }

        const fragmentShader: string =
            'precision mediump float;' +
            'varying vec2 vuv;' +
            'uniform sampler2D texture;' +
            'void main(void)' +
            '{' +
            '   gl_FragColor = texture2D(texture, vuv);' +
            '}';

        this.gl.shaderSource(fragmentShaderId, fragmentShader);
        this.gl.compileShader(fragmentShaderId);

        this.shader = this.gl.createProgram();
        this.gl.attachShader(this.shader, vertexShaderId);
        this.gl.attachShader(this.shader, fragmentShaderId);

        this.gl.deleteShader(vertexShaderId);
        this.gl.deleteShader(fragmentShaderId);

        this.gl.linkProgram(this.shader);
        this.gl.useProgram(this.shader);
    }
}
