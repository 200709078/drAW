// Silginin kapsadığı alanı imleçte gösteren yarı saydam daire.
// Tuvalde yeniden çizim yapmaz; ucuz bir HTML katmandır.
export class EraserIndicator {

    private readonly element: HTMLDivElement;

    constructor() {

        this.element = document.createElement("div");
        this.element.className = "eraser-indicator";
        this.element.hidden = true;
        document.body.appendChild(this.element);

    }

    public show(clientX: number, clientY: number, screenRadius: number): void {

        this.move(clientX, clientY, screenRadius);

    }

    public move(clientX: number, clientY: number, screenRadius: number): void {

        const radius = Math.max(2, screenRadius);
        this.element.style.width = `${radius * 2}px`;
        this.element.style.height = `${radius * 2}px`;
        this.element.style.left = `${clientX - radius}px`;
        this.element.style.top = `${clientY - radius}px`;
        this.element.hidden = false;

    }

    public hide(): void {

        this.element.hidden = true;

    }

    public destroy(): void {

        this.element.remove();

    }

}
