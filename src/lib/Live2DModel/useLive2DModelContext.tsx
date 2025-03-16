import {createContext, useContext} from 'react';

import type {Live2DModelMotionManager} from '../cubism/Live2DModelMotionManager';

export type Live2DModelContext = {
    motionManager?: Live2DModelMotionManager;
};

export const Live2DModelContext = createContext<Live2DModelContext>({});

export const useLive2DModelContext = () => useContext(Live2DModelContext);
