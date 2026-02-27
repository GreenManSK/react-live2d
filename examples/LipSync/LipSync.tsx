import {
    Live2DCanvas,
    Live2DCanvasContext,
    Live2DModel,
    Live2DRunner,
    useLive2DModelContext,
    useTicker,
} from '@react-live2d';
import {useCallback, useEffect, useRef, useState} from 'react';

const PRESET_MODELS = ['Haru', 'Hiyori', 'Mao', 'Mark', 'Natori', 'Rice', 'Wanko', 'fern', 'mikumiku', 'L2DZeroVS'];

type LoadMode = 'json' | 'zip';
type LoadStatus = 'idle' | 'loading' | 'error';

const LipSyncControls = () => {
    const {motionManager} = useLive2DModelContext();

    const [manualValue, setManualValue] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Poll speaking state each second
    useEffect(() => {
        if (!motionManager) return;
        const id = setInterval(() => {
            setIsSpeaking(motionManager.isSpeaking());
        }, 200);
        return () => clearInterval(id);
    }, [motionManager]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!motionManager) return;
        const file = event.target.files?.[0];
        if (!file) return;

        setStatusMessage(`Loading "${file.name}"…`);
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            motionManager
                .startLipSyncFromBuffer(buffer)
                .then(() => {
                    setStatusMessage(`Playing "${file.name}"`);
                })
                .catch((err) => {
                    setStatusMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
                });
        };
        reader.readAsArrayBuffer(file);
        // Reset so the same file can be picked again
        event.target.value = '';
    };

    const handleStop = () => {
        motionManager?.stopLipSync();
        setStatusMessage('Stopped.');
    };

    const handleManualChange = (value: number) => {
        setManualValue(value);
        motionManager?.setLipValue(value, 0);
    };

    if (!motionManager) return null;

    const motionGroups = [...motionManager.getMotionGroups().entries()];

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Lip Sync Controls</h2>

            {/* Status */}
            <div className="rounded bg-gray-700 px-3 py-2 text-sm">
                <span className="font-semibold">Status: </span>
                {isSpeaking ? (
                    <span className="text-green-400">Speaking (audio active)</span>
                ) : (
                    <span className="text-gray-400">Idle (manual mode)</span>
                )}
                {statusMessage && <span className="ml-2 text-yellow-300">{statusMessage}</span>}
            </div>

            {/* WAV / MP3 file upload */}
            <div>
                <h3 className="mb-1 text-lg font-bold">From file (WAV / MP3)</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600"
                        onClick={() => fileInputRef.current?.click()}>
                        Upload audio file
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".wav,.mp3,audio/wav,audio/mpeg"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <button
                        className="cursor-pointer rounded bg-red-500 px-4 py-2 text-white transition hover:bg-red-600"
                        onClick={handleStop}>
                        Stop
                    </button>
                </div>
            </div>

            {/* Motion sounds */}
            <div>
                <h3 className="mb-1 text-lg font-bold">Motion sounds</h3>
                <p className="mb-2 text-xs text-gray-400">
                    These buttons play a motion and its bundled sound file (if the model has any). The sound drives lip
                    sync automatically.
                </p>
                {motionGroups.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No motions available for this model.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {motionGroups.map(([groupName, count]) => (
                            <div key={groupName}>
                                <h4 className="text-sm font-semibold">{groupName}</h4>
                                <div className="flex flex-wrap gap-1">
                                    {Array.from({length: count}, (_, i) => i).map((id) => (
                                        <button
                                            key={id}
                                            className="cursor-pointer rounded bg-green-600 px-3 py-1 text-sm text-white transition hover:bg-green-700"
                                            onClick={() => motionManager.setMotionWithSound(groupName, id)}>
                                            {groupName} {id}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Manual control */}
            <div>
                <h3 className="mb-1 text-lg font-bold">Manual mouth control</h3>
                <p className="mb-2 text-xs text-gray-400">
                    Used when no audio is playing. Slide to open/close mouth directly.
                </p>
                <label className="flex items-center gap-2">
                    Mouth openness:
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={manualValue}
                        onChange={(e) => handleManualChange(parseFloat(e.target.value))}
                    />
                    <span className="w-10 text-right">{manualValue.toFixed(2)}</span>
                </label>
            </div>
        </div>
    );
};

const LipSync = () => {
    const ticker = useTicker();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [loadMode, setLoadMode] = useState<LoadMode>('json');
    const [modelJson, setModelJson] = useState('./models/Haru/Haru.model3.json');
    const [modelZip, setModelZip] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [zipUrlInput, setZipUrlInput] = useState('');
    const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
    const [loadError, setLoadError] = useState<string | null>(null);
    const fileBlobUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (fileBlobUrlRef.current) URL.revokeObjectURL(fileBlobUrlRef.current);
        };
    }, []);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.offsetWidth;
                canvasRef.current.height = containerRef.current.offsetHeight;
            }
        };
        const observer = new ResizeObserver(updateSize);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
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
        if (trimmed) selectJsonModel(trimmed);
    };

    const handleZipUrlLoad = () => {
        const trimmed = zipUrlInput.trim();
        if (trimmed) selectZipModel(trimmed);
    };

    const handleZipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (fileBlobUrlRef.current) URL.revokeObjectURL(fileBlobUrlRef.current);
        const blobUrl = URL.createObjectURL(file);
        fileBlobUrlRef.current = blobUrl;
        selectZipModel(blobUrl);
        e.target.value = '';
    };

    const handleLoad = useCallback(() => setLoadStatus('idle'), []);
    const handleError = useCallback((error: Error) => {
        setLoadStatus('error');
        setLoadError(error.message);
    }, []);

    return (
        <Live2DRunner ticker={ticker}>
            <Live2DCanvas>
                <div className="flex max-h-screen min-h-screen flex-row">
                    {/* Sidebar */}
                    <div className="flex max-h-screen w-96 flex-col gap-4 overflow-y-scroll bg-gray-800 p-4 text-white">
                        <h1 className="text-2xl font-bold">Lip Sync Demo</h1>

                        {/* Model picker */}
                        <div className="flex flex-col gap-3">
                            <h2 className="text-lg font-bold">Model</h2>

                            {/* Presets */}
                            <div className="flex flex-wrap gap-1">
                                {PRESET_MODELS.map((model) => (
                                    <button
                                        key={model}
                                        className="cursor-pointer rounded bg-blue-600 px-2 py-1 text-sm text-white transition hover:bg-blue-700"
                                        onClick={() => selectJsonModel(`./models/${model}/${model}.model3.json`)}>
                                        {model}
                                    </button>
                                ))}
                            </div>

                            {/* URL (.model3.json) */}
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold">Load from URL (.model3.json)</span>
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
                                    className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                                    {loadStatus === 'loading' && loadMode === 'json' ? 'Loading…' : 'Load'}
                                </button>
                            </div>

                            {/* ZIP */}
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold">Load from ZIP</span>
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
                                    className="cursor-pointer rounded bg-blue-500 px-4 py-2 text-sm text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                                    {loadStatus === 'loading' && loadMode === 'zip' ? 'Loading…' : 'Load ZIP from URL'}
                                </button>
                                <label className="cursor-pointer rounded bg-green-600 px-4 py-2 text-center text-sm text-white transition hover:bg-green-700">
                                    Upload ZIP file
                                    <input
                                        type="file"
                                        accept=".zip"
                                        onChange={handleZipFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {loadStatus === 'error' && loadError && (
                                <p className="text-sm text-red-300">
                                    <span className="font-semibold">Error: </span>
                                    {loadError}
                                </p>
                            )}
                        </div>

                        <Live2DModel
                            modelJsonPath={loadMode === 'json' ? modelJson : undefined}
                            modelZipPath={loadMode === 'zip' && modelZip ? modelZip : undefined}
                            onLoad={handleLoad}
                            onError={handleError}>
                            <LipSyncControls />
                        </Live2DModel>
                    </div>

                    {/* Canvas */}
                    <div
                        ref={containerRef}
                        className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-100">
                        <Live2DCanvasContext.Consumer>
                            {({setCanvas}) => (
                                <canvas
                                    className="absolute"
                                    ref={(el) => {
                                        setCanvas(el);
                                        canvasRef.current = el;
                                    }}
                                />
                            )}
                        </Live2DCanvasContext.Consumer>
                    </div>
                </div>
            </Live2DCanvas>
        </Live2DRunner>
    );
};

export default LipSync;
