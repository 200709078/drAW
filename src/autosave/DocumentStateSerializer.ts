import { Stroke } from "../document/Stroke";
import { Point } from "../document/Point";
import { DocumentImage } from "../document/DocumentImage";
import { TextObject } from "../document/TextObject";
import type { DocumentSnapshot } from "../document/Document";
import { StorageError } from "../storage/StorageError";
import { StorageErrorKind } from "../storage/StorageError";

export const DRAWING_STATE_VERSION = 1;

export class DocumentStateSerializer {

    public serialize(snapshot: DocumentSnapshot): Record<string, unknown> {

        return {
            version: DRAWING_STATE_VERSION,
            strokes: snapshot.strokes.map((stroke) => ({
                color: stroke.getColor(),
                lineWidth: stroke.getLineWidth(),
                opacity: stroke.getOpacity(),
                shape: stroke.isShape(),
                points: stroke.getPoints().map((point) => [
                    point.getX(),
                    point.getY(),
                    point.getPressure(),
                    point.getTimestamp()
                ])
            })),
            images: snapshot.images.map((image) => ({
                dataUrl: image.getDataUrl(),
                x: image.getX(),
                y: image.getY(),
                width: image.getWidth(),
                height: image.getHeight()
            })),
            texts: snapshot.texts.map((text) => ({
                text: text.getText(),
                x: text.getX(),
                y: text.getY(),
                color: text.getColor(),
                fontSize: text.getFontSize(),
                scale: text.getScale(),
                rotation: text.getRotation()
            }))
        };

    }

    public deserialize(data: Record<string, unknown>): DocumentSnapshot {

        if (!this.isValidState(data)) {
            throw new StorageError(
                StorageErrorKind.CorruptRecord,
                "Çalışma alanı verisi bozuk."
            );
        }

        const strokes = data.strokes.map((serialized) => this.deserializeStroke(serialized));
        const images = data.images.map((serialized) => this.deserializeImage(serialized));
        const texts = data.texts.map((serialized) => this.deserializeText(serialized));

        return { strokes, images, texts };

    }

    public isEmpty(snapshot: DocumentSnapshot): boolean {

        return snapshot.strokes.length === 0 &&
            snapshot.images.length === 0 &&
            snapshot.texts.length === 0;

    }

    private deserializeStroke(serialized: Record<string, unknown>): Stroke {

        const stroke = new Stroke(
            serialized.color as string,
            serialized.lineWidth as number,
            serialized.opacity as number,
            serialized.shape as boolean
        );

        for (const pointData of serialized.points as Array<[number, number, number, number]>) {
            stroke.addPoint(new Point(
                pointData[0],
                pointData[1],
                pointData[2],
                pointData[3]
            ));
        }

        return stroke;

    }

    private deserializeImage(serialized: Record<string, unknown>): DocumentImage {

        return new DocumentImage(
            serialized.dataUrl as string,
            serialized.x as number,
            serialized.y as number,
            serialized.width as number,
            serialized.height as number
        );

    }

    private deserializeText(serialized: Record<string, unknown>): TextObject {

        return new TextObject(
            serialized.text as string,
            serialized.x as number,
            serialized.y as number,
            serialized.color as string,
            serialized.fontSize as number,
            serialized.scale as number,
            serialized.rotation as number
        );

    }

    private isValidState(
        data: Record<string, unknown>
    ): data is {
        version: number;
        strokes: Record<string, unknown>[];
        images: Record<string, unknown>[];
        texts: Record<string, unknown>[];
    } {

        return typeof data === "object" &&
            data !== null &&
            typeof data.version === "number" &&
            data.version >= 1 &&
            Array.isArray(data.strokes) &&
            Array.isArray(data.images) &&
            Array.isArray(data.texts);

    }

}
