import {Live2DModel} from '@react-live2d';
import type {HitZoneEvent} from '@react-live2d';
import {useCallback, useEffect, useRef, useState} from 'react';

import {ModelControls} from './ModelControls';

type LoadStatus = 'idle' | 'loading' | 'error';
type LoadMode = 'json' | 'zip';

export const ModelPicker = () => {
    const models = ['Haru', 'Hiyori', 'Mao', 'Mark', 'Natori', 'Rice', 'Wanko', 'fern', 'mikumiku', 'L2DZeroVS'];
    const [loadMode, setLoadMode] = useState<LoadMode>('json');
    const [modelJson, setModelJson] = useState('./models/Haru/Haru.model3.json');
    const [modelZip, setModelZip] = useState<string | null>(null);
    const [hitZonesEnabled, setHitZonesEnabled] = useState(false);
    const [lastHitAreas, setLastHitAreas] = useState<string[]>([]);
    const [urlInput, setUrlInput] = useState('');
    const [zipUrlInput, setZipUrlInput] = useState('');
    const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
    const [loadError, setLoadError] = useState<string | null>(null);
    const fileBlobUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (fileBlobUrlRef.current) {
                URL.revokeObjectURL(fileBlobUrlRef.current);
            }
        };
    }, []);

    const handleHitZone = useCallback((event: HitZoneEvent) => {
        setLastHitAreas(event.hitAreas);
    }, []);

    const selectJsonModel = (path: string) => {
        setLoadMode('json');
        setModelJson(path);
        setModelZip(null);
        setLoadStatus('loading');
        setLoadError(null);
    };

    const selectZipModel = (zipPath: string) => {
        setLoadMode('zip');
        setModelZip(zipPath);
        setLoadStatus('loading');
        setLoadError(null);
    };

    const handleUrlLoad = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) return;
        selectJsonModel(trimmed);
    };

    const handleZipUrlLoad = () => {
        const trimmed = zipUrlInput.trim();
        if (!trimmed) return;
        selectZipModel(trimmed);
    };

    const handleZipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (fileBlobUrlRef.current) {
            URL.revokeObjectURL(fileBlobUrlRef.current);
        }
        const blobUrl = URL.createObjectURL(file);
        fileBlobUrlRef.current = blobUrl;
        selectZipModel(blobUrl);
        e.target.value = '';
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
                modelJsonPath={loadMode === 'json' ? modelJson : undefined}
                modelZipPath={loadMode === 'zip' && modelZip ? modelZip : undefined}
                onHitZone={hitZonesEnabled ? handleHitZone : undefined}
                onLoad={handleLoad}
                onError={handleError}>
                <h2 className="block text-xl font-bold">Model Picker</h2>
                <div className="flex flex-wrap gap-2">
                    {models.map((model) => (
                        <button
                            key={model}
                            onClick={() => selectJsonModel(`./models/${model}/${model}.model3.json`)}
                            className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600">
                            {model}
                        </button>
                    ))}
                </div>
                <h3 className="block text-lg font-bold">Load from URL (.model3.json)</h3>
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
                        {loadStatus === 'loading' && loadMode === 'json' ? 'Loading…' : 'Load'}
                    </button>
                </div>
                <h3 className="block text-lg font-bold">Load from ZIP</h3>
                <div className="flex flex-col gap-2">
                    <input
                        type="url"
                        value={zipUrlInput}
                        onChange={(e) => setZipUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleZipUrlLoad()}
                        placeholder="https://example.com/model.zip"
                        className="w-full rounded border border-blue-400 bg-blue-900 px-3 py-2 text-sm text-white placeholder-blue-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    />
                    <button
                        onClick={handleZipUrlLoad}
                        disabled={!zipUrlInput.trim() || loadStatus === 'loading'}
                        className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                        {loadStatus === 'loading' && loadMode === 'zip' ? 'Loading…' : 'Load ZIP from URL'}
                    </button>
                    <label className="cursor-pointer rounded bg-green-600 px-4 py-2 text-center text-white transition hover:bg-green-700">
                        Upload ZIP file
                        <input type="file" accept=".zip" onChange={handleZipFileUpload} className="hidden" />
                    </label>
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
