import type { Storage } from "./Storage";
import { DrawingDocument } from "./DrawingDocument";
import type { ThumbnailGenerator } from "../autosave/ThumbnailGenerator";

export class ThumbnailStorageDecorator implements Storage {

    private readonly delegate: Storage;
    private readonly generator: ThumbnailGenerator;

    constructor(
        delegate: Storage,
        generator: ThumbnailGenerator
    ) {

        this.delegate = delegate;
        this.generator = generator;

    }

    public async save(document: DrawingDocument): Promise<void> {

        let toSave = document;

        try {
            const thumbnail = await this.generator.generate(
                document.getCanvasState().getData()
            );

            toSave = document.withThumbnail(thumbnail);
        } catch (error) {
            console.error("[Thumbnail] Küçük resim üretilemedi:", error);
        }

        await this.delegate.save(toSave);

    }

    public async load(id: string): Promise<DrawingDocument | null> {

        return await this.delegate.load(id);

    }

    public async delete(id: string): Promise<void> {

        await this.delegate.delete(id);

    }

    public async rename(id: string, newName: string): Promise<void> {

        await this.delegate.rename(id, newName);

    }

    public async list(): Promise<DrawingDocument[]> {

        return await this.delegate.list();

    }

}
