export type ModelFileSystem = {
    fetchFile(relativePath: string): Promise<ArrayBuffer>;
    getFileUrl(relativePath: string): string;
    dispose(): void;
};

export class UrlModelFileSystem implements ModelFileSystem {
    constructor(private readonly modelJsonPath: string) {}

    fetchFile(relativePath: string): Promise<ArrayBuffer> {
        const url = this.getFileUrl(relativePath);
        return fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .catch((error) => {
                console.error(`Error fetching ${url}:`, error);
                throw error;
            });
    }

    getFileUrl(relativePath: string): string {
        return new URL(relativePath, new URL(this.modelJsonPath, document.baseURI).href).href;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    dispose(): void {}
}
