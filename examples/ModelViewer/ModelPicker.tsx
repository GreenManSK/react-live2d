import {Live2DModel} from '@react-live2d';
import type {HitZoneEvent} from '@react-live2d';
import {useCallback, useState} from 'react';

import {ModelControls} from './ModelControls';

type LoadStatus = 'idle' | 'loading' | 'error';

export const ModelPicker = () => {
    const models = ['Haru', 'Hiyori', 'Mao', 'Mark', 'Natori', 'Rice', 'Wanko', 'fern', 'mikumiku', 'L2DZeroVS'];
    const [modelJson, setModelJson] = useState('./models/Haru/Haru.model3.json');
    const [hitZonesEnabled, setHitZonesEnabled] = useState(false);
    const [lastHitAreas, setLastHitAreas] = useState<string[]>([]);
    const [urlInput, setUrlInput] = useState('');
    const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
    const [loadError, setLoadError] = useState<string | null>(null);

    const handleHitZone = useCallback((event: HitZoneEvent) => {
        setLastHitAreas(event.hitAreas);
    }, []);

    const selectModel = (path: string) => {
        setModelJson(path);
        setLoadStatus('loading');
        setLoadError(null);
    };

    const handleUrlLoad = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) return;
        selectModel(trimmed);
    };

    const handleLoad = useCallback(() => {
        setLoadStatus('idle');
    }, []);

    const handleError = useCallback((error: Error) => {
        setLoadStatus('error');
        setLoadError(error.message);
    }, []);

    return (
        <div className="flex flex-col gap-4 p-4">
            <Live2DModel
                modelJsonPath={modelJson}
                onHitZone={hitZonesEnabled ? handleHitZone : undefined}
                onLoad={handleLoad}
                onError={handleError}>
                <h2 className="block text-xl font-bold">Model Picker</h2>
                <div className="flex flex-wrap gap-2">
                    {models.map((model) => (
                        <button
                            key={model}
                            onClick={() => selectModel(`./models/${model}/${model}.model3.json`)}
                            className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600">
                            {model}
                        </button>
                    ))}
                </div>
                <h3 className="block text-lg font-bold">Load from URL</h3>
                <div className="flex flex-col gap-2">
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
                        placeholder="https://example.com/model/model.model3.json"
                        className="w-full rounded border border-blue-400 bg-blue-900 px-3 py-2 text-sm text-white placeholder-blue-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                    <button
                        onClick={handleUrlLoad}
                        disabled={!urlInput.trim() || loadStatus === 'loading'}
                        className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                        {loadStatus === 'loading' ? 'Loading…' : 'Load'}
                    </button>
                    {loadStatus === 'error' && loadError && (
                        <p className="text-sm text-red-300">
                            <span className="font-semibold">Error: </span>
                            {loadError}
                        </p>
                    )}
                </div>
                <ModelControls
                    hitZonesEnabled={hitZonesEnabled}
                    onToggleHitZones={setHitZonesEnabled}
                    lastHitAreas={lastHitAreas}
                />
            </Live2DModel>
        </div>
    );
};
