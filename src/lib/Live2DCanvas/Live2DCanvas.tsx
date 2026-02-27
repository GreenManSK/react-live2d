import {useEffect, useMemo, useRef, useState, type PropsWithChildren} from 'react';

import {useLive2DRunnerContext} from '../Live2DRunner/Live2DRunner';
import type {Live2DModelManager} from '../cubism/Live2DModelManager';
import {Live2DCanvasManager} from '../cubism/Live2DCanvasManager';
import {Live2DCanvasContext} from './useLive2DCanvasContext';

export const Live2DCanvas = ({children}: PropsWithChildren<object>) => {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const canvasManager = useRef<Live2DCanvasManager>(undefined);
    const [gl, setGl] = useState<WebGL2RenderingContext | undefined>(undefined);

    const {registerCanvas, unregisterCanvas} = useLive2DRunnerContext();
    useEffect(() => {
        const gl = canvas?.getContext('webgl2');
        if (gl) {
            setGl(gl);
            canvasManager.current = new Live2DCanvasManager(gl);
            if (canvas) {
                canvasManager.current.setup(canvas);
            } else {
                console.error('Live2DCanvas: Canvas is not available');
            }
            registerCanvas(canvasManager.current);
        }

        return () => {
            if (!canvasManager.current) {
                return;
            }
            unregisterCanvas(canvasManager.current);
            canvasManager.current.dispose();
        };
    }, [registerCanvas, unregisterCanvas, canvas]);

    useEffect(() => {
        if (!gl) {
            return;
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }, [gl]);

    const canvasContext = useMemo(() => {
        return {
            gl,
            canvas,
            setCanvas: (canvas: HTMLCanvasElement | null) => setCanvas(canvas),
            textureManager: canvasManager.current?.textureManager,
            addModel: (model: Live2DModelManager) => {
                canvasManager.current?.addModel(model);
            },
            removeModel: (model: Live2DModelManager) => {
                canvasManager.current?.removeModel(model);
            },
        };
    }, [gl, canvas]);
    return <Live2DCanvasContext.Provider value={canvasContext}>{children}</Live2DCanvasContext.Provider>;
};
