export class Point {

    private readonly x: number;
    private readonly y: number;
    private readonly pressure: number;
    private readonly timestamp: number;

    constructor(
        x: number,
        y: number,
        pressure: number = 1,
        timestamp: number = Date.now()
    ) {

        this.x = x;
        this.y = y;
        this.pressure = pressure;
        this.timestamp = timestamp;

    }

    public getX(): number {

        return this.x;

    }

    public getY(): number {

        return this.y;

    }

    public getPressure(): number {

        return this.pressure;

    }

    public getTimestamp(): number {

        return this.timestamp;

    }

}