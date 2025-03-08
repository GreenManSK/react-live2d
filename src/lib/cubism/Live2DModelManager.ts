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

    private lookTargetX = 0.0;
    private lookTargetY = 0.0;

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
        const deltaTimeSeconds = deltaTime / 1000.0;

        const projection = new CubismMatrix44();
        if (this.model.model.getCanvasWidth() > 1.0 && canvasWidth < canvasHeight) {
            // When displaying a horizontally long model in a vertically long window, calculate the scale based on the horizontal size of the model.
            this.model.getModelMatrix().setWidth(2.0);
            projection.scale(1.0, canvasWidth / canvasHeight);
        } else {
            projection.scale(canvasHeight / canvasWidth, 1.0);
        }

        // 必要があればここで乗算
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

        const lookX = this.lookTargetX - canvasX;
        const lookY = this.lookTargetY - canvasY;
        const transformedLookX = viewMatrix.invertTransformX(deviceToCanvas.transformX(lookX));
        const transformedLookY = viewMatrix.invertTransformY(deviceToCanvas.transformY(lookY));

        this.model.model.addParameterValueById(this.idParamAngleX, transformedLookX * 30);
        this.model.model.addParameterValueById(this.idParamAngleY, transformedLookY * 30);
        this.model.model.addParameterValueById(this.idParamAngleZ, transformedLookX * transformedLookY * -30);
        this.model.model.addParameterValueById(this.idParamBodyAngleX, transformedLookX * 10);

        this.model.model.addParameterValueById(this.idParamEyeBallX, transformedLookX); // -1から1の値を加える
        this.model.model.addParameterValueById(this.idParamEyeBallY, transformedLookY);

        if (this.model.breath) {
            this.model.breath.updateParameters(this.model.model, deltaTimeSeconds);
        }

        if (this.model.physics) {
            this.model.physics.evaluate(this.model.model, deltaTimeSeconds);
        }

        if (this.model.lipsync) {
            // TODO: LipSync
            // let value = 0.0; // リアルタイムでリップシンクを行う場合、システムから音量を取得して、0~1の範囲で値を入力します。
            // this._wavFileHandler.update(deltaTimeSecondsSeconds);
            // value = this._wavFileHandler.getRms();
            // for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
            //     this._model.addParameterValueById(this._lipSyncIds.at(i), value, 0.8);
            // }
        }

        if (this.model.pose != null) {
            this.model.pose.updateParameters(this.model.model, deltaTimeSeconds);
        }

        this.model.model.update();

        projection.multiplyByMatrix(this.model.modelMatrix);
        this.model.getRenderer().setMvpMatrix(projection);
        this.model.getRenderer().setRenderState(frameBuffer, viewport);
        this.model.getRenderer().drawModel();
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

    public setLookTarget(x: number, y: number) {
        this.lookTargetX = x;
        this.lookTargetY = y;
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
                const expressionName = this.settings.getExpressionFileName(i);
                fetchPromises.push(
                    Live2DModelManager.fetchArrayBuffer(this.resolveFilePath(expressionName)).then((arrayBuffer) => {
                        const expression = this.model.loadExpression(
                            arrayBuffer,
                            arrayBuffer.byteLength,
                            expressionName
                        );
                        this.expressions.set(expressionName, expression);
                    })
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
