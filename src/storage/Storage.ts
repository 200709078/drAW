import type { DrawingDocument } from "./DrawingDocument";

export interface Storage {

    save(document: DrawingDocument): Promise<void>;
    load(id: string): Promise<DrawingDocument | null>;
    delete(id: string): Promise<void>;
    rename(id: string, newName: string): Promise<void>;
    list(): Promise<DrawingDocument[]>;

}
