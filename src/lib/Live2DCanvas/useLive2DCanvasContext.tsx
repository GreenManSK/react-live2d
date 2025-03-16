import {createContext, useContext} from 'react';

import type {Live2DTextureManager} from '../cubism/Live2DTextureManager';
import type {Live2DModelManager} from '../cubism/Live2DModelManager';

export type ILive2DCanvasContext = {
    gl?: WebGL2RenderingContext;
    setCanvas: (canvas: HTMLCanvasElement | null) => void;
    textureManager?: Live2DTextureManager;
    addModel: (model: Live2DModelManager) => void;
    removeModel: (model: Live2DModelManager) => void;
};

const defaultCanvasContext: ILive2DCanvasContext = {
    gl: undefined,
    setCanvas: () => {},
    textureManager: undefined,
    addModel: () => {},
    removeModel: () => {},
};

export const Live2DCanvasContext = createContext<ILive2DCanvasContext>(defaultCanvasContext);

export const useLive2DCanvasContext = () => useContext(Live2DCanvasContext);
