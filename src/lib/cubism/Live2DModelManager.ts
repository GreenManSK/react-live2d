import {CubismModelSettingJson} from '@cubism//cubismmodelsettingjson';
import type {ICubismModelSetting} from '@cubism/icubismmodelsetting';
import type {ACubismMotion} from '@cubism/motion/acubismmotion';
import {CubismEyeBlink} from '@cubism/effect/cubismeyeblink';
import {BreathParameterData, CubismBreath} from '@cubism/effect/cubismbreath';
import {csmVector} from '@cubism/type/csmvector';
import {CubismFramework} from '@cubism/live2dcubismframework';
import {CubismDefaultParameterId} from '@cubism/cubismdefaultparameterid';
import type {CubismIdHandle} from '@cubism/id/cubismid';
import {csmMap} from '@cubism/type/csmmap';
import {CubismMatrix44} from '@cubism/math/cubismmatrix44';
import type {CubismViewMatrix} from '@cubism/math/cubismviewmatrix';

import {Live2DCubismUserModel} from '../cubism/Live2DCubismUserModel';
import type {Live2DTextureManager} from './Live2DTextureManager';

type Orientation = {
    x: number;
    y: number;
    isRelative?: boolean;
};

export class Live2DModelManager {
    private model: Live2DCubismUserModel;
    private expressions = new Map<string, ACubismMotion>();
    private motions = new Map<string, ACubismMotion>();
    private motionGroups = new Map<string, number>();

    private eyeBlinkIds = new csmVector<CubismIdHandle>();
    private lipSyncIds = new csmVector<CubismIdHandle>();

    private idParamAngleX: CubismIdHandle;
    private idParamAngleY: CubismIdHandle;
    private idParamAngleZ: CubismIdHandle;
    private idParamEyeBallX: CubismIdHandle;
    private idParamEyeBallY: CubismIdHandle;
    private idParamBodyAngleX: CubismIdHandle;

    private lookSpeed = 0.0;
    private currentLookTarget: Orientation = {
        x: 0.0,
        y: 0.0,
    };
    private lookTarget: Orientation = {
        x: 0.0,
        y: 0.0,
        isRelative: false,
    };

    private bodyOrientationSpeed = 0.0;
    private currentBodyOrientationTarget: Orientation = {
        x: 0.0,
        y: 0.0,
    };
    private bodyOrientationTarget: Orientation = {
        x: 0.0,
        y: 0.0,
        isRelative: false,
    };

    private currentLipValue = 0.0;
    private lipValue = 0.0;
    private lipSpeed = 0.0;

    private userScale = 1.0;
    private userPositionX = 0.0;
    private userPositionY = 0.0;

    // Stored from the last render call for use in hit testing
    private lastViewMatrix: CubismViewMatrix | null = null;
    private lastDeviceToCanvas: CubismMatrix44 | null = null;
    private lastCanvasOffsetLeft = 0;
    private lastCanvasOffsetTop = 0;
    private lastCanvasWidth = 0;
    private lastCanvasHeight = 0;

    private showHitAreas = false;
    private hitAreaShader: WebGLProgram | null = null;
    private hitAreaBuffer: WebGLBuffer | null = null;

    public constructor(
        public readonly modelJsonPath: string,
        public readonly settings: ICubismModelSetting,
        private readonly gl: WebGLRenderingContext,
        private readonly textureManager: Live2DTextureManager
    ) {
        this.model = new Live2DCubismUserModel();

        this.idParamAngleX = CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamAngleX);
        this.idParamAngleY = CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamAngleY);
        this.idParamAngleZ = CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamAngleZ);
        this.idParamEyeBallX = CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamEyeBallX);
        this.idParamEyeBallY = CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamEyeBallY);
        this.idParamBodyAngleX = CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamBodyAngleX);
    }

    public loadModel(): Promise<Live2DModelManager> {
        return this.loadModelFile().then(() => {
            return this.loadExpressions()
                .then(() => this.loadPhysics())
                .then(() => this.loadPose())
                .then(() => this.loadUserData())
                .then(() => this.setupEyeBlinks())
                .then(() => this.setupBreath())
                .then(() => this.setupLipSync())
                .then(() => this.setupLayout())
                .then(() => this.loadMotions())
                .then(() => this.setupTextures())
                .then(() => this);
        });
    }

    public render(
        deltaTime: number,
        viewport: number[],
        viewMatrix: CubismViewMatrix,
        deviceToCanvas: CubismMatrix44,
        frameBuffer: WebGLFramebuffer,
        canvasWidth: number,
        canvasHeight: number,
        canvasX: number,
        canvasY: number
    ) {
        this.lastViewMatrix = viewMatrix;
        this.lastDeviceToCanvas = deviceToCanvas;
        this.lastCanvasOffsetLeft = canvasX;
        this.lastCanvasOffsetTop = canvasY;
        this.lastCanvasWidth = canvasWidth;
        this.lastCanvasHeight = canvasHeight;

        const deltaTimeSeconds = deltaTime / 1000.0;

        const projection = new CubismMatrix44();
        if (this.model.model.getCanvasWidth() > 1.0 && canvasWidth < canvasHeight) {
            // When displaying a horizontally long model in a vertically long window, calculate the scale based on the horizontal size of the model.
            this.model.getModelMatrix().setWidth(2.0);
            projection.scale(1.0, canvasWidth / canvasHeight);
        } else {
            projection.scale(canvasHeight / canvasWidth, 1.0);
        }

        if (viewMatrix != null) {
            projection.multiplyByMatrix(viewMatrix);
        }

        this.model.model.loadParameters();
        let motionUpdated = false;
        if (!this.model.motionManager.isFinished()) {
            motionUpdated = this.model.motionManager.updateMotion(this.model.model, deltaTimeSeconds);
        }
        this.model.model.saveParameters();

        if (!motionUpdated && this.model.eyeBlink) {
            this.model.eyeBlink.updateParameters(this.model.model, deltaTimeSeconds);
        }

        if (this.model.expressionManager) {
            this.model.expressionManager.updateMotion(this.model.model, deltaTimeSeconds);
        }

        const {transformedX: transformedBodyX, transformedY: transformedBodyY} = this.getTransformedOrientation(
            deltaTimeSeconds,
            viewMatrix,
            deviceToCanvas,
            canvasX,
            canvasY,
            canvasWidth,
            canvasHeight,
            this.currentBodyOrientationTarget,
            this.bodyOrientationTarget,
            this.bodyOrientationSpeed
        );

        this.model.model.addParameterValueById(this.idParamAngleX, transformedBodyX * 30);
        this.model.model.addParameterValueById(this.idParamAngleY, transformedBodyY * 30);
        this.model.model.addParameterValueById(this.idParamAngleZ, transformedBodyX * transformedBodyY * -30);
        this.model.model.addParameterValueById(this.idParamBodyAngleX, transformedBodyX * 10);

        const {transformedX: transformedLookX, transformedY: transformedLookY} = this.getTransformedOrientation(
            deltaTimeSeconds,
            viewMatrix,
            deviceToCanvas,
            canvasX,
            canvasY,
            canvasWidth,
            canvasHeight,
            this.currentLookTarget,
            this.lookTarget,
            this.lookSpeed
        );

        this.model.model.addParameterValueById(this.idParamEyeBallX, transformedLookX);
        this.model.model.addParameterValueById(this.idParamEyeBallY, transformedLookY);

        if (this.model.breath) {
            this.model.breath.updateParameters(this.model.model, deltaTimeSeconds);
        }

        if (this.model.physics) {
            this.model.physics.evaluate(this.model.model, deltaTimeSeconds);
        }

        if (this.model.lipsync) {
            // TODO: LipSync manager .getLipValue(deltaTimeSeconds)
            this.currentLipValue =
                this.lipSpeed !== 0
                    ? this.currentLipValue + (this.lipValue - this.currentLipValue) * this.lipSpeed * deltaTimeSeconds
                    : this.lipValue;
            for (let i = 0; i < this.lipSyncIds.getSize(); ++i) {
                this.model.model.addParameterValueById(this.lipSyncIds.at(i), this.currentLipValue, 0.8);
            }
        }

        if (this.model.pose != null) {
            this.model.pose.updateParameters(this.model.model, deltaTimeSeconds);
        }

        this.model.model.update();

        projection.multiplyByMatrix(this.model.modelMatrix);
        if (this.userScale !== 1.0) {
            projection.scaleRelative(this.userScale, this.userScale);
        }
        if (this.userPositionX !== 0.0 || this.userPositionY !== 0.0) {
            projection.translateRelative(this.userPositionX, this.userPositionY);
        }
        this.model.getRenderer().setMvpMatrix(projection);
        this.model.getRenderer().setRenderState(frameBuffer, viewport);
        this.model.getRenderer().drawModel();

        if (this.showHitAreas) {
            this.renderHitAreas(projection);
        }
    }

    public getExpressionsList(): string[] {
        return Array.from(this.expressions.keys());
    }

    public getExpression(name: string) {
        return this.expressions.get(name);
    }

    public getMotionGroups(): ReadonlyMap<string, number> {
        return this.motionGroups;
    }

    public getMotion(groupName: string, id: number) {
        return this.motions.get(`${groupName}_${id}`);
    }

    public getModel() {
        return this.model;
    }

    public setLookTarget(x: number, y: number, speed: number) {
        this.lookTarget = {
            x,
            y,
            isRelative: false,
        };
        this.lookSpeed = speed;
    }

    public setLookTargetRelative(x: number, y: number, speed: number) {
        this.lookTarget = {
            x,
            y,
            isRelative: true,
        };
        this.lookSpeed = speed;
    }

    public setBodyOrientationTarget(x: number, y: number, speed: number) {
        this.bodyOrientationTarget = {
            x,
            y,
            isRelative: false,
        };
        this.bodyOrientationSpeed = speed;
    }

    public setBodyOrientationTargetRelative(x: number, y: number, speed: number) {
        this.bodyOrientationTarget = {
            x,
            y,
            isRelative: true,
        };
        this.bodyOrientationSpeed = speed;
    }

    public setLipValue(value: number, speed: number) {
        this.lipValue = value;
        this.lipSpeed = speed;
    }

    public setScale(scale: number) {
        this.userScale = scale;
    }

    public setPosition(x: number, y: number) {
        this.userPositionX = x;
        this.userPositionY = y;
    }

    public getHitAreaNames(): string[] {
        const count = this.settings.getHitAreasCount();
        const names: string[] = [];
        for (let i = 0; i < count; i++) {
            names.push(this.settings.getHitAreaName(i));
        }
        return names;
    }

    /**
     * Hit-test the model at the given page coordinates.
     * pageX/pageY should be absolute page coordinates (event.clientX + window.scrollX).
     * Returns the names of all hit areas that contain the point.
     */
    public hitTest(pageX: number, pageY: number): string[] {
        if (!this.lastViewMatrix || !this.lastDeviceToCanvas) {
            return [];
        }

        // Convert page coordinates to canvas-relative pixel coordinates,
        // then adjust for user position offset (same correction as look target tracking).
        let cx = pageX - this.lastCanvasOffsetLeft;
        let cy = pageY - this.lastCanvasOffsetTop;
        cx -= this.userPositionX * this.lastCanvasWidth * 0.5;
        cy += this.userPositionY * this.lastCanvasHeight * 0.5;

        // Convert to logical/view space (same as CubismWebSamples transformViewX/Y).
        let viewX = this.lastViewMatrix.invertTransformX(this.lastDeviceToCanvas.transformX(cx));
        let viewY = this.lastViewMatrix.invertTransformY(this.lastDeviceToCanvas.transformY(cy));

        // Undo user scale so the hit test is in the model's natural coordinate space.
        if (this.userScale !== 1.0) {
            viewX /= this.userScale;
            viewY /= this.userScale;
        }

        const hitAreas: string[] = [];
        const count = this.settings.getHitAreasCount();
        for (let i = 0; i < count; i++) {
            const drawId = this.settings.getHitAreaId(i);
            if (this.model.isHit(drawId, viewX, viewY)) {
                hitAreas.push(this.settings.getHitAreaName(i));
            }
        }
        return hitAreas;
    }

    public setShowHitAreas(show: boolean): void {
        this.showHitAreas = show;
    }

    private createHitAreaShader(): WebGLProgram | null {
        const gl = this.gl;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        if (!vs) return null;
        gl.shaderSource(
            vs,
            'precision mediump float;' +
                'attribute vec2 a_position;' +
                'void main() { gl_Position = vec4(a_position, 0.0, 1.0); }'
        );
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fs) {
            gl.deleteShader(vs);
            return null;
        }
        gl.shaderSource(
            fs,
            'precision mediump float;' + 'uniform vec4 u_color;' + 'void main() { gl_FragColor = u_color; }'
        );
        gl.compileShader(fs);

        const program = gl.createProgram();
        if (!program) {
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            return null;
        }
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return program;
    }

    /**
     * Draws bounding-box outlines for each defined hit area on top of the model.
     * @param projection The full MVP matrix already assembled for this frame.
     */
    private renderHitAreas(projection: CubismMatrix44): void {
        const count = this.settings.getHitAreasCount();
        if (count === 0) return;

        const gl = this.gl;

        if (!this.hitAreaShader) {
            this.hitAreaShader = this.createHitAreaShader();
            if (!this.hitAreaShader) return;
        }
        if (!this.hitAreaBuffer) {
            this.hitAreaBuffer = gl.createBuffer();
            if (!this.hitAreaBuffer) return;
        }

        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(this.hitAreaShader);

        const posLoc = gl.getAttribLocation(this.hitAreaShader, 'a_position');
        const colorLoc = gl.getUniformLocation(this.hitAreaShader, 'u_color');

        // Cyan outline colour
        gl.uniform4f(colorLoc, 0.0, 0.9, 1.0, 0.9);

        for (let i = 0; i < count; i++) {
            const drawId = this.settings.getHitAreaId(i);
            const drawIndex = this.model.model.getDrawableIndex(drawId);
            if (drawIndex < 0) continue;

            const vertexCount = this.model.model.getDrawableVertexCount(drawIndex);
            const vertices = this.model.model.getDrawableVertices(drawIndex);
            if (vertexCount === 0) continue;

            // Compute AABB in model-local space
            let left = vertices[0],
                right = vertices[0];
            let top = vertices[1],
                bottom = vertices[1];
            for (let j = 1; j < vertexCount; j++) {
                const x = vertices[j * 2];
                const y = vertices[j * 2 + 1];
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }

            // Transform the 4 corners to NDC using the assembled projection matrix.
            // transformX/Y work for axis-aligned (scale+translate) matrices.
            const nx0 = projection.transformX(left);
            const nx1 = projection.transformX(right);
            const ny0 = projection.transformY(top);
            const ny1 = projection.transformY(bottom);

            const rect = new Float32Array([nx0, ny0, nx1, ny0, nx1, ny1, nx0, ny1]);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.hitAreaBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, rect, gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.LINE_LOOP, 0, 4);
        }

        gl.disableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);
        gl.enable(gl.DEPTH_TEST);
    }

    private getTransformedOrientation(
        deltaTimeSeconds: number,
        viewMatrix: CubismViewMatrix,
        deviceToCanvas: CubismMatrix44,
        canvasX: number,
        canvasY: number,
        canvasWidth: number,
        canvasHeight: number,
        currentOrientation: Orientation,
        targetOrientation: Orientation,
        speed: number
    ) {
        let goalX = 0;
        let goalY = 0;
        if (targetOrientation.isRelative) {
            const absoluteX = deviceToCanvas.invertTransformX(viewMatrix.transformX(targetOrientation.x));
            const absoluteY = deviceToCanvas.invertTransformY(viewMatrix.transformY(targetOrientation.y));
            goalX = absoluteX;
            goalY = absoluteY;
        } else {
            goalX = targetOrientation.x - canvasX;
            goalY = targetOrientation.y - canvasY;
            // Adjust goal so the model's visual center (accounting for user position) is the reference point.
            // userPositionX/Y are in NDC units where ±1 = half canvas width/height.
            // NDC +X = right (same as canvas), NDC +Y = up (opposite of canvas Y which increases downward).
            goalX -= this.userPositionX * canvasWidth * 0.5;
            goalY += this.userPositionY * canvasHeight * 0.5;
        }

        if (speed !== 0) {
            currentOrientation.x = currentOrientation.x + (goalX - currentOrientation.x) * speed * deltaTimeSeconds;
            currentOrientation.y = currentOrientation.y + (goalY - currentOrientation.y) * speed * deltaTimeSeconds;
        } else {
            currentOrientation.x = goalX;
            currentOrientation.y = goalY;
        }

        const transformedX = viewMatrix.invertTransformX(deviceToCanvas.transformX(currentOrientation.x));
        const transformedY = viewMatrix.invertTransformY(deviceToCanvas.transformY(currentOrientation.y));
        return {transformedX, transformedY};
    }

    private resolveFilePath(fileName: string): string {
        return new URL(fileName, new URL(this.modelJsonPath, document.baseURI).href).href;
    }

    private loadModelFile(): Promise<void> {
        return new Promise((resolve) => {
            if (this.settings?.getModelFileName()) {
                Live2DModelManager.fetchArrayBuffer(this.resolveFilePath(this.settings.getModelFileName())).then(
                    (arrayBuffer) => {
                        this.model.loadModel(arrayBuffer);
                        resolve();
                    }
                );
            } else {
                console.warn('Model file not found');
                resolve();
            }
        });
    }

    private loadExpressions(): Promise<void> {
        if (!this.settings?.getExpressionCount()) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const fetchPromises: Promise<void>[] = [];
            for (let i = 0; i < this.settings.getExpressionCount(); i++) {
                const expressionName = this.settings.getExpressionName(i);
                const expressionFileName = this.settings.getExpressionFileName(i);
                fetchPromises.push(
                    Live2DModelManager.fetchArrayBuffer(this.resolveFilePath(expressionFileName)).then(
                        (arrayBuffer) => {
                            const expression = this.model.loadExpression(
                                arrayBuffer,
                                arrayBuffer.byteLength,
                                expressionName
                            );
                            this.expressions.set(expressionName, expression);
                        }
                    )
                );
            }
            Promise.all(fetchPromises).then(() => resolve());
        });
    }

    private loadPhysics(): Promise<void> {
        return new Promise((resolve) => {
            if (this.settings?.getPhysicsFileName()) {
                Live2DModelManager.fetchArrayBuffer(this.resolveFilePath(this.settings.getPhysicsFileName())).then(
                    (arrayBuffer) => {
                        this.model.loadPhysics(arrayBuffer, arrayBuffer.byteLength);
                        resolve();
                    }
                );
            } else {
                console.warn('Physics file not found');
                resolve();
            }
        });
    }

    private loadPose(): Promise<void> {
        return new Promise((resolve) => {
            if (this.settings?.getPoseFileName()) {
                Live2DModelManager.fetchArrayBuffer(this.resolveFilePath(this.settings.getPoseFileName())).then(
                    (arrayBuffer) => {
                        this.model.loadPose(arrayBuffer, arrayBuffer.byteLength);
                        resolve();
                    }
                );
            } else {
                console.warn('Pose file not found');
                resolve();
            }
        });
    }

    private loadUserData(): Promise<void> {
        return new Promise((resolve) => {
            if (this.settings?.getUserDataFile()) {
                Live2DModelManager.fetchArrayBuffer(this.resolveFilePath(this.settings.getUserDataFile())).then(
                    (arrayBuffer) => {
                        this.model.loadUserData(arrayBuffer, arrayBuffer.byteLength);
                        resolve();
                    }
                );
            } else {
                console.warn('User data file not found');
                resolve();
            }
        });
    }

    private loadMotions(): Promise<void> {
        return new Promise((resolve) => {
            this.model.model.saveParameters();
            const motionGroupCount: number = this.settings.getMotionGroupCount();

            const motionGroupPromises: Promise<void>[] = [];
            for (let i = 0; i < motionGroupCount; i++) {
                motionGroupPromises.push(this.loadMotionGroup(this.settings.getMotionGroupName(i)));
            }

            Promise.all(motionGroupPromises).then(() => {
                this.model.motionManager.stopAllMotions();
                this.model.createRenderer();
                resolve();
            });
        });
    }

    private loadMotionGroup(group: string): Promise<void> {
        const motionPromises: Promise<void>[] = [];
        let loadedCount = 0;
        for (let i = 0; i < this.settings.getMotionCount(group); i++) {
            const motionFileName = this.settings.getMotionFileName(group, i);
            const name = `${group}_${i}`;
            motionPromises.push(
                Live2DModelManager.fetchArrayBuffer(this.resolveFilePath(motionFileName)).then((arrayBuffer) => {
                    const motion = this.model.loadMotion(
                        arrayBuffer,
                        arrayBuffer.byteLength,
                        name,
                        undefined,
                        undefined,
                        this.settings,
                        group,
                        i
                    );
                    if (motion === null) {
                        console.warn(`Failed to load motion: ${motionFileName}`);
                        return;
                    }
                    loadedCount++;
                    motion.setEffectIds(this.eyeBlinkIds, this.lipSyncIds);
                    this.motions.set(name, motion);
                })
            );
        }
        return Promise.all(motionPromises).then(() => {
            this.motionGroups.set(group, loadedCount);
        });
    }

    private setupEyeBlinks(): Promise<void> {
        return new Promise((resolve) => {
            if (this.settings.getEyeBlinkParameterCount() > 0) {
                this.model.eyeBlink = CubismEyeBlink.create(this.settings);

                for (let i = 0; i < this.settings.getEyeBlinkParameterCount(); i++) {
                    this.eyeBlinkIds.pushBack(this.settings.getEyeBlinkParameterId(i));
                }
            }
            resolve();
        });
    }

    private setupBreath(): Promise<void> {
        return new Promise((resolve) => {
            this.model.breath = CubismBreath.create();

            const breathParameters = new csmVector<BreathParameterData>();
            breathParameters.pushBack(new BreathParameterData(this.idParamAngleX, 0.0, 15.0, 6.5345, 0.5));
            breathParameters.pushBack(new BreathParameterData(this.idParamAngleY, 0.0, 8.0, 3.5345, 0.5));
            breathParameters.pushBack(new BreathParameterData(this.idParamAngleZ, 0.0, 10.0, 5.5345, 0.5));
            breathParameters.pushBack(new BreathParameterData(this.idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5));
            breathParameters.pushBack(
                new BreathParameterData(
                    CubismFramework.getIdManager().getId(CubismDefaultParameterId.ParamBreath),
                    0.5,
                    0.5,
                    3.2345,
                    1
                )
            );

            this.model.breath.setParameters(breathParameters);

            resolve();
        });
    }

    private setupLipSync(): Promise<void> {
        return new Promise((resolve) => {
            const lipSyncIdCount = this.settings.getLipSyncParameterCount();
            for (let i = 0; i < lipSyncIdCount; ++i) {
                this.lipSyncIds.pushBack(this.settings.getLipSyncParameterId(i));
            }
            resolve();
        });
    }

    private setupLayout(): Promise<void> {
        return new Promise((resolve) => {
            const layout = new csmMap<string, number>();
            this.settings.getLayoutMap(layout);
            this.model.modelMatrix.setupFromLayout(layout);
            resolve();
        });
    }

    private setupTextures(): Promise<void> {
        this.model.createRenderer();
        const texturePromises: Promise<void>[] = [];
        const textureCount = this.settings.getTextureCount();
        for (let i = 0; i < textureCount; i++) {
            const textureFileName = this.settings.getTextureFileName(i);
            if (textureFileName == '') {
                console.warn(`Issue getting texture ${i}`);
                continue;
            }
            const texturePath = this.resolveFilePath(textureFileName);
            texturePromises.push(
                this.textureManager.loadTextureFromFile(texturePath, true).then((texture) => {
                    this.model.getRenderer().bindTexture(i, texture.texture);
                })
            );
            this.model.getRenderer().setIsPremultipliedAlpha(true);
        }
        return Promise.all(texturePromises).then(() => {
            this.model.getRenderer().startUp(this.gl);
        });
    }

    public static getModelManager(
        modelJsonPath: string,
        gl: WebGLRenderingContext,
        textureManager: Live2DTextureManager
    ): Promise<Live2DModelManager> {
        return Live2DModelManager.fetchArrayBuffer(modelJsonPath).then((arrayBuffer) => {
            const settings = new CubismModelSettingJson(arrayBuffer, arrayBuffer.byteLength);
            return new Live2DModelManager(modelJsonPath, settings, gl, textureManager);
        });
    }

    private static fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
        return fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .catch((error) => {
                console.error(`Error fetching ${url}:`, error);
                throw error;
            });
    }
}
