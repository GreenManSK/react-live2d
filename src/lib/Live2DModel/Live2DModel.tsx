import type {PropsWithChildren} from 'react';
import {useEffect, useMemo, useState} from 'react';

import {Live2DModelManager} from '../cubism/Live2DModelManager';
import {Live2DModelMotionManager} from '../cubism/Live2DModelMotionManager';
import {useLive2DCanvasContext} from '../Live2DCanvas/useLive2DCanvasContext';
import {Live2DModelContext} from './useLive2DModelContext';

export type Props = {
    modelJsonPath: string;
};

export const Live2DModel = ({modelJsonPath, children}: PropsWithChildren<Props>) => {
    const [modelManager, setModelManager] = useState<Live2DModelManager | null>(null);
    const {gl, textureManager, addModel, removeModel} = useLive2DCanvasContext();
    useEffect(() => {
        if (!gl || !textureManager) {
            return;
        }
        Live2DModelManager.getModelManager(modelJsonPath, gl, textureManager)
            .then((modelManager) => modelManager.loadModel())
            .then((finishedModelManager) => setModelManager(finishedModelManager));
    }, [modelJsonPath, gl, textureManager]);
    useEffect(() => {
        if (!modelManager) {
            return;
        }
        addModel(modelManager);
        return () => {
            removeModel(modelManager);
        };
    }, [modelManager, addModel, removeModel]);

    const contextValue = useMemo(
        () => ({
            motionManager: modelManager ? new Live2DModelMotionManager(modelManager) : undefined,
        }),
        [modelManager]
    );
    return <Live2DModelContext.Provider value={contextValue}>{children}</Live2DModelContext.Provider>;
};
