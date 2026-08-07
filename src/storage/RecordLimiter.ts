import type { DrawingDocument } from "./DrawingDocument";
import { MAX_DRAWING_RECORDS } from "./constants";

export class RecordLimiter {

    private readonly maxRecords: number;

    constructor(maxRecords?: number) {

        this.maxRecords = maxRecords ?? MAX_DRAWING_RECORDS;

    }

    public getMaxRecords(): number {

        return this.maxRecords;

    }

    public isAtLimit(recordCount: number): boolean {

        return recordCount >= this.maxRecords;

    }

    public getEvictionCandidates(
        existingRecords: readonly DrawingDocument[],
        incomingCount: number
    ): DrawingDocument[] {

        const capacity = this.maxRecords - (existingRecords.length + incomingCount);

        if (capacity >= 0) {
            return [];
        }

        const sortedByAge = [...existingRecords].sort((first, second) => {
            const timeCompare = first.getUpdatedAt().localeCompare(second.getUpdatedAt());

            if (timeCompare !== 0) {
                return timeCompare;
            }

            return first.getId().localeCompare(second.getId());
        });

        return sortedByAge.slice(0, -capacity);

    }

}
