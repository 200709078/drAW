export class DirtyFlag {

    private dirty: boolean;
    private revision: number;

    constructor() {

        this.dirty = false;
        this.revision = 0;

    }

    public markDirty(): void {

        this.revision++;
        this.dirty = true;

    }

    public getRevision(): number {

        return this.revision;

    }

    public markClean(savedRevision: number = this.revision): void {

        // Kayıt sürerken yapılan daha yeni değişiklikler kaydedilmiş sayılmamalı.
        if (savedRevision === this.revision) {
            this.dirty = false;
        }

    }

    public isDirty(): boolean {

        return this.dirty;

    }

}
