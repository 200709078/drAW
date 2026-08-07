function pad(value: number): string {

    return String(value).padStart(2, "0");

}

export function generateDisplayName(date: Date = new Date()): string {

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;

}
