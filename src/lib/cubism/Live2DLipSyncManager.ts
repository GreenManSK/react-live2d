/**
 * Manages lip sync audio analysis and manual mouth control.
 *
 * Supports:
 * - Audio files (WAV/MP3) via Web Audio API — audio is played through speakers
 *   while its RMS amplitude drives the lip sync parameter in real time.
 * - Manual control via setManual() — used when no audio is playing.
 *
 * When audio is active it takes priority over the manual value.
 * When audio finishes the manager automatically reverts to manual mode.
 */
export class Live2DLipSyncManager {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private dataArray: Uint8Array | null = null;

    private manualValue = 0.0;
    private manualSpeed = 0.0;
    private currentValue = 0.0;
    private audioActive = false;

    /**
     * Start lip sync from a URL (WAV or MP3).
     * The audio is decoded, played through speakers, and its RMS amplitude drives
     * the mouth parameter each frame.
     */
    public async startFromUrl(url: string): Promise<void> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio from "${url}": ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return this.startFromBuffer(buffer);
    }

    /**
     * Start lip sync from an ArrayBuffer (e.g. obtained from a FileReader for
     * user-uploaded files). Handles WAV and MP3 formats.
     */
    public async startFromBuffer(buffer: ArrayBuffer): Promise<void> {
        this.stopAudio();

        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        } else if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // decodeAudioData consumes the buffer, so pass a copy.
        const audioBuffer = await this.audioContext.decodeAudioData(buffer.slice(0));

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.connect(this.audioContext.destination);

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = audioBuffer;
        this.sourceNode.connect(this.analyser);
        this.sourceNode.onended = () => {
            this.audioActive = false;
        };
        this.sourceNode.start();
        this.audioActive = true;
    }

    /**
     * Stop the currently playing audio and revert to manual mode.
     */
    public stopAudio(): void {
        this.audioActive = false;
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } catch {
                // Ignore — already stopped.
            }
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }
        this.dataArray = null;
    }

    /**
     * Set the manual lip sync target value.
     * This value is used when no audio is playing.
     * @param value  Target mouth openness: 0 = closed, 1 = fully open.
     * @param speed  Interpolation speed in units/second. 0 = instant.
     */
    public setManual(value: number, speed: number): void {
        this.manualValue = value;
        this.manualSpeed = speed;
    }

    /**
     * Update lip sync each frame. Returns the current mouth openness value (0–1).
     * When audio is playing, returns the RMS-based amplitude.
     * Otherwise returns the interpolated manual value.
     *
     * Should be called once per render frame.
     */
    public update(deltaTimeSeconds: number): number {
        if (this.audioActive && this.analyser && this.dataArray) {
            this.analyser.getByteTimeDomainData(this.dataArray);

            let sum = 0;
            for (const sample of this.dataArray) {
                const normalized = (sample - 128) / 128.0;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / this.dataArray.length);
            // Scale up RMS so the mouth has visible movement; clamp to 0–1.
            this.currentValue = Math.min(1.0, rms * 4.0);
            return this.currentValue;
        }

        // Manual mode — interpolate toward target.
        if (this.manualSpeed !== 0) {
            this.currentValue += (this.manualValue - this.currentValue) * this.manualSpeed * deltaTimeSeconds;
        } else {
            this.currentValue = this.manualValue;
        }
        return this.currentValue;
    }

    /** Returns true while audio is playing and driving lip sync. */
    public isPlaying(): boolean {
        return this.audioActive;
    }

    /** Release all Web Audio API resources. Call when the model is unmounted. */
    public dispose(): void {
        this.stopAudio();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
