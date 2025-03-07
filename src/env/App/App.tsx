import type {FC} from 'react';
import {useState, useEffect} from 'react';

import {Counter} from '@/lib';
import './index.css';
import {Live2DCanvas} from '@/lib/Live2DCanvas';
import {useTicker} from '@/lib/Ticker/useTicker';

const App: FC = () => {
    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    const ticker = useTicker();

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
            {isScriptLoaded && <Live2DCanvas ticker={ticker} />}
        </div>
    );
};

export default App;
