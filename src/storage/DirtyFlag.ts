export class DirtyFlag {

    private dirty: boolean;

    constructor() {

        this.dirty = false;

    }

    public markDirty(): void {

        this.dirty = true;

    }

    public markClean(): void {

        this.dirty = false;

    }

    public isDirty(): boolean {

        return this.dirty;

    }

}
