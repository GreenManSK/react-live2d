export type TextureData = {
    texture: WebGLTexture;
    width: number;
    height: number;
    premultiply: boolean;
    fileName: string;
};

export class Live2DTextureManager {
    private textureMap = new Map<string, TextureData>();

    public constructor(private readonly gl: WebGLRenderingContext) {
        this.gl = gl;
    }

    public loadTextureFromFile(fileName: string, usePremultiply: boolean, forceReload = false): Promise<TextureData> {
        return new Promise((resolve, reject) => {
            const textureKey = this.getTextureKey(fileName, usePremultiply);
            if (this.textureMap.has(textureKey)) {
                if (!forceReload) {
                    resolve(this.textureMap.get(textureKey)!);
                    return;
                } else {
                    this.unloadTexture(this.textureMap.get(textureKey)!);
                }
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.addEventListener(
                'load',
                () => {
                    const texture = this.gl.createTexture();

                    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
                    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

                    if (usePremultiply) {
                        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
                    }

                    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
                    this.gl.generateMipmap(this.gl.TEXTURE_2D);
                    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

                    const textureData: TextureData = {
                        texture,
                        width: img.width,
                        height: img.height,
                        premultiply: usePremultiply,
                        fileName,
                    };
                    this.textureMap.set(textureKey, textureData);
                    resolve(textureData);
                },
                {passive: true}
            );
            img.addEventListener('error', () => {
                reject(new Error(`Failed to load texture: ${fileName}`));
            });
            img.src = fileName;
        });
    }

    public unloadTexture(texture: TextureData) {
        this.gl.deleteTexture(texture.texture);
        this.textureMap.delete(this.getTextureKey(texture.fileName, texture.premultiply));
    }

    public dispose() {
        this.textureMap.forEach((texture) => {
            this.gl.deleteTexture(texture.texture);
        });
        this.textureMap.clear();
    }

    private getTextureKey(fileName: string, usePremultiply: boolean) {
        return `${fileName}_${usePremultiply}`;
    }
}
