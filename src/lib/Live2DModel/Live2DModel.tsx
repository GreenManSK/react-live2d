import type {PropsWithChildren} from 'react';
import {useEffect, useMemo, useState} from 'react';

import {Live2DModelManager} from '../cubism/Live2DModelManager';
import {Live2DModelMotionManager} from '../cubism/Live2DModelMotionManager';
import {useLive2DCanvasContext} from '../Live2DCanvas/useLive2DCanvasContext';
import {Live2DModelContext} from './useLive2DModelContext';

export type HitZoneEvent = {
    /** Names of all hit areas that contain the clicked point. */
    hitAreas: string[];
    /** The original DOM mouse event. */
    originalEvent: MouseEvent;
    /** Call to stop the original click event from propagating. */
    preventDefault: () => void;
};

export type Props = {
    modelJsonPath: string;
    scale?: number;
    positionX?: number;
    positionY?: number;
    /** Called when a hit zone is clicked. If omitted, hit zone detection is disabled. */
    onHitZone?: (event: HitZoneEvent) => void;
    /** Draw bounding-box outlines for all defined hit areas on the canvas. Default: false. */
    showHitAreas?: boolean;
};

export const Live2DModel = ({
    modelJsonPath,
    scale,
    positionX,
    positionY,
    onHitZone,
    showHitAreas,
    children,
}: PropsWithChildren<Props>) => {
    const [modelManager, setModelManager] = useState<Live2DModelManager | null>(null);
    const {gl, textureManager, addModel, removeModel, canvas} = useLive2DCanvasContext();
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
            modelManager.dispose();
        };
    }, [modelManager, addModel, removeModel]);
    useEffect(() => {
        if (!modelManager || scale === undefined) {
            return;
        }
        modelManager.setScale(scale);
    }, [modelManager, scale]);
    useEffect(() => {
        if (!modelManager || (positionX === undefined && positionY === undefined)) {
            return;
        }
        modelManager.setPosition(positionX ?? 0.0, positionY ?? 0.0);
    }, [modelManager, positionX, positionY]);

    useEffect(() => {
        if (!modelManager || showHitAreas === undefined) {
            return;
        }
        modelManager.setShowHitAreas(showHitAreas);
    }, [modelManager, showHitAreas]);

    useEffect(() => {
        if (!canvas || !modelManager || !onHitZone) {
            return;
        }
        const handleClick = (e: MouseEvent) => {
            const pageX = e.clientX + window.scrollX;
            const pageY = e.clientY + window.scrollY;
            const hitAreas = modelManager.hitTest(pageX, pageY);
            if (hitAreas.length === 0) {
                return;
            }
            onHitZone({hitAreas, originalEvent: e, preventDefault: () => e.preventDefault()});
        };
        canvas.addEventListener('click', handleClick);
        return () => canvas.removeEventListener('click', handleClick);
    }, [canvas, modelManager, onHitZone]);

    const contextValue = useMemo(
        () => ({
            motionManager: modelManager ? new Live2DModelMotionManager(modelManager) : undefined,
        }),
        [modelManager]
    );
    return <Live2DModelContext.Provider value={contextValue}>{children}</Live2DModelContext.Provider>;
};
