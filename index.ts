const RADIUS = 10;
const UNIT = 100;
const PAD = 10;
const MAGNETIZE = 25;

interface IPoint {
  x: number;
  y: number;
}

class Point {
  public x: number;
  public y: number;

  public constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  public static subtract(a: IPoint, b: IPoint): Point {
    return new Point(b.x - a.x, b.y - a.y);
  }
}

enum Contact {
  NONE,
  TOP_LEFT,
  TOP,
  TOP_RIGHT,
  RIGHT,
  BOTTOM_RIGHT,
  BOTTOM,
  BOTTOM_LEFT,
  LEFT,
  MIDDLE,
}

function contactAsCursor(contact: Contact): string {
  switch (contact) {
    case Contact.TOP_LEFT:
      return "nw-resize";
    case Contact.TOP:
      return "n-resize";
    case Contact.TOP_RIGHT:
      return "ne-resize";
    case Contact.RIGHT:
      return "e-resize";
    case Contact.BOTTOM_RIGHT:
      return "se-resize";
    case Contact.BOTTOM:
      return "s-resize";
    case Contact.BOTTOM_LEFT:
      return "sw-resize";
    case Contact.LEFT:
      return "w-resize";
    case Contact.MIDDLE:
      return "grab";
  }
}

class Key {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public ghost: boolean;

  public constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.ghost = false;
  }

  public render(context: CanvasRenderingContext2D) {
    const r = Math.min(Math.min(this.width / 2, this.height / 2), RADIUS);
    const x = this.x - this.width / 2;
    const y = this.y - this.height / 2;
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + this.width, y, x + this.width, y + this.height, r);
    context.arcTo(x + this.width, y + this.height, x, y + this.height, r);
    context.arcTo(x, y + this.height, x, y, r);
    context.arcTo(x, y, x + this.width, y, r);
    context.closePath();

    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    if (this.ghost) {
      context.lineWidth = 1;
    }

    context.stroke();
  }

  public contact(point: IPoint): Contact {
    if (this.x - this.width / 2 - PAD < point.x && point.x < this.x + this.width / 2 + PAD && this.y - this.height / 2 - PAD < point.y && point.y < this.y + this.height / 2 + PAD) {
      if (point.x < this.x - this.width / 2 + PAD) {
        if (point.y < this.y - this.height / 2 + PAD) {
          return Contact.TOP_LEFT;
        } else if (point.y > this.y + this.height / 2 - PAD) {
          return Contact.BOTTOM_LEFT;
        } else {
          return Contact.LEFT;
        }
      } else if (point.x > this.x + this.width / 2 - PAD) {
        if (point.y < this.y - this.height / 2 + PAD) {
          return Contact.TOP_RIGHT;
        } else if (point.y > this.y + this.height / 2 - PAD) {
          return Contact.BOTTOM_RIGHT;
        } else {
          return Contact.RIGHT;
        }
      } else {
        if (point.y < this.y - this.height / 2 + PAD) {
          return Contact.TOP;
        } else if (point.y > this.y + this.height / 2 - PAD) {
          return Contact.BOTTOM;
        } else {
          return Contact.MIDDLE;
        }
      }
    } else {
      return Contact.NONE;
    }
  }
}

class KeyGrab {
  public key: Key;
  public contact: Contact;
  public offset: IPoint;

  public constructor(key: Key, contact: Contact, offset: IPoint) {
    this.key = key;
    this.contact = contact;
    this.offset = offset;
  }

  public static create(event: MouseEvent): KeyGrab {
    const key = new Key(event.x, event.y, UNIT, UNIT);
    key.ghost = true;
    return new KeyGrab(key, Contact.MIDDLE, new Point());
  }
}

enum Orientation {
  HORIZONTAL,
  VERTICAL,
}

enum Aligned {
  SIDE,
  CENTER
}

class Alignment {
  public key: Key;
  public to: Aligned;
  public orientation: Orientation;
  public position: number;
}

class KeyManager {
  public keys: Array<Key>;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  private grab: KeyGrab | null;

  public constructor(canvas: HTMLCanvasElement) {
    this.keys = [];
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.grab = null;
    this.bind(canvas);
  }

  public bind(canvas: HTMLCanvasElement) {
    canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
  }

  public onMouseDown(event: MouseEvent) {
    if (event.button === 0) {
      const result = this.keyAtPoint(event);
      if (result !== null) {
        const [key, contact] = result;
        if (contact === Contact.MIDDLE) {
          this.grab = new KeyGrab(key, contact, Point.subtract(key, event));
          this.render();
        }
      } else {
        this.grab = KeyGrab.create(event);
        this.keys.push(this.grab.key);
        this.render();
      }
    }
  }

  public onMouseMove(event: MouseEvent) {
    if (this.grab !== null) {
      this.grab.key.x = event.x - this.grab.offset.x;
      this.grab.key.y = event.y - this.grab.offset.y;
      this.render();
    } else {
      const result = this.keyAtPoint(event);
      if (result !== null) {
        this.canvas.style.cursor = contactAsCursor(result[1]);
      } else {
        this.canvas.style.cursor = "cell";
      }
    }
  }

  public onMouseUp(event: MouseEvent) {
    if (event.button === 0) {
      if (this.grab !== null) {
        this.grab.key.ghost = false;
        this.grab = null;
        this.render();
        this.canvas.style.cursor = "grab";
      }
    }
  }

  public render() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const key of this.keys) {
      key.render(this.context);
    }
  }

  private keyAtPoint(point: IPoint): [Key, Contact] | null {
    for (const key of this.keys) {
      const contact = key.contact(point);
      if (contact !== Contact.NONE) {
        return [key, contact];
      }
    }
    return null;
  }
}

class Application {
  private canvas: HTMLCanvasElement;
  private keys: KeyManager;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.keys = new KeyManager(canvas);
  }

  public main() {
    this.keys.render();
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  new Application(canvas).main();
});
