import {unzipSync} from 'fflate';

import type {ModelFileSystem} from './ModelFileSystem';

export class ZipModelFileSystem implements ModelFileSystem {
    private readonly files: Record<string, Uint8Array>;
    private readonly modelRoot: string;
    private readonly blobUrls = new Map<string, string>();

    private constructor(files: Record<string, Uint8Array>, modelRoot: string) {
        this.files = files;
        this.modelRoot = modelRoot;
    }

    static async fromUrl(url: string): Promise<{fs: ZipModelFileSystem; modelJsonBuffer: ArrayBuffer}> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ZIP from ${url}: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return ZipModelFileSystem.fromBuffer(buffer);
    }

    static async fromFile(file: File): Promise<{fs: ZipModelFileSystem; modelJsonBuffer: ArrayBuffer}> {
        const buffer = await file.arrayBuffer();
        return ZipModelFileSystem.fromBuffer(buffer);
    }

    static fromBuffer(buffer: ArrayBuffer): {fs: ZipModelFileSystem; modelJsonBuffer: ArrayBuffer} {
        const uint8 = new Uint8Array(buffer);
        const files = unzipSync(uint8);

        // Find .model3.json — prefer the shallowest path to handle nested directories
        const modelJsonPath = Object.keys(files)
            .filter((p) => p.endsWith('.model3.json'))
            .sort((a, b) => a.split('/').length - b.split('/').length)[0];

        if (!modelJsonPath) {
            throw new Error('No .model3.json found in ZIP archive');
        }

        const lastSlash = modelJsonPath.lastIndexOf('/');
        const modelRoot = lastSlash >= 0 ? modelJsonPath.substring(0, lastSlash + 1) : '';

        const fs = new ZipModelFileSystem(files, modelRoot);
        const modelJsonData = files[modelJsonPath];
        const modelJsonBuffer = modelJsonData.buffer.slice(
            modelJsonData.byteOffset,
            modelJsonData.byteOffset + modelJsonData.byteLength
        );

        return {fs, modelJsonBuffer};
    }

    fetchFile(relativePath: string): Promise<ArrayBuffer> {
        const fullPath = this.modelRoot + relativePath;
        const data = this.files[fullPath];
        if (!data) {
            return Promise.reject(new Error(`File not found in ZIP: ${relativePath} (looked for ${fullPath})`));
        }
        return Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    }

    getFileUrl(relativePath: string): string {
        const fullPath = this.modelRoot + relativePath;
        const cached = this.blobUrls.get(fullPath);
        if (cached) return cached;

        const data = this.files[fullPath];
        if (!data) {
            throw new Error(`File not found in ZIP: ${relativePath} (looked for ${fullPath})`);
        }

        const mime = ZipModelFileSystem.getMimeType(relativePath);
        const blob = new Blob([data], {type: mime});
        const url = URL.createObjectURL(blob);
        this.blobUrls.set(fullPath, url);
        return url;
    }

    dispose(): void {
        this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
        this.blobUrls.clear();
    }

    private static getMimeType(path: string): string {
        const ext = path.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'png':
                return 'image/png';
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'wav':
                return 'audio/wav';
            case 'mp3':
                return 'audio/mpeg';
            case 'json':
                return 'application/json';
            default:
                return 'application/octet-stream';
        }
    }
}
