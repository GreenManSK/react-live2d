import type {FC} from 'react';
import {useState, useEffect} from 'react';

import {Counter} from '@/lib';
import './index.css';
import {Live2DRunner} from '@/lib/Live2DRunner';
import {useTicker} from '@/lib/Ticker/useTicker';
import {Live2DCanvas} from '@/lib/Live2DCanvas';

const Live2D: FC = () => {
    const ticker = useTicker();
    return (
        <Live2DRunner ticker={ticker}>
            <Live2DCanvas width={500} height={500}></Live2DCanvas>
        </Live2DRunner>
    );
};

const App: FC = () => {
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
        script.async = true;
        script.onload = () => {
            setIsScriptLoaded(true);
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div>
            <Counter />
            {isScriptLoaded && <Live2D />}
        </div>
    );
};

export default App;
