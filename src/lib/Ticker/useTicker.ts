import {useMemo, useRef} from 'react';

import type {ITicker} from './ticker.interface';

export const useTicker = (): ITicker => {
    const lastUpdate = useRef(Date.now());
    const deltaTime = useRef(0);

    const ticker = useMemo(
        () => ({
            getDeltaTime: () => deltaTime.current,
            updateTime: () => {
                const now = Date.now();
                deltaTime.current = now - lastUpdate.current;
                lastUpdate.current = now;
            },
        }),
        []
    );

    return ticker;
};
