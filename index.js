var RADIUS = 10;
var UNIT = 100;
var PAD = 10;
var Point = /** @class */ (function () {
    function Point(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = x;
        this.y = y;
    }
    Point.subtract = function (a, b) {
        return new Point(b.x - a.x, b.y - a.y);
    };
    return Point;
}());
var Contact;
(function (Contact) {
    Contact[Contact["NONE"] = 0] = "NONE";
    Contact[Contact["TOP_LEFT"] = 1] = "TOP_LEFT";
    Contact[Contact["TOP"] = 2] = "TOP";
    Contact[Contact["TOP_RIGHT"] = 3] = "TOP_RIGHT";
    Contact[Contact["RIGHT"] = 4] = "RIGHT";
    Contact[Contact["BOTTOM_RIGHT"] = 5] = "BOTTOM_RIGHT";
    Contact[Contact["BOTTOM"] = 6] = "BOTTOM";
    Contact[Contact["BOTTOM_LEFT"] = 7] = "BOTTOM_LEFT";
    Contact[Contact["LEFT"] = 8] = "LEFT";
    Contact[Contact["MIDDLE"] = 9] = "MIDDLE";
})(Contact || (Contact = {}));
function contactAsCursor(contact) {
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
var Key = /** @class */ (function () {
    function Key(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.ghost = false;
    }
    Key.prototype.render = function (context) {
        var r = Math.min(Math.min(this.width / 2, this.height / 2), RADIUS);
        var x = this.x - this.width / 2;
        var y = this.y - this.height / 2;
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
    };
    Key.prototype.contact = function (point) {
        if (this.x - this.width / 2 - PAD < point.x && point.x < this.x + this.width / 2 + PAD && this.y - this.height / 2 - PAD < point.y && point.y < this.y + this.height / 2 + PAD) {
            if (point.x < this.x - this.width / 2 + PAD) {
                if (point.y < this.y - this.height / 2 + PAD) {
                    return Contact.TOP_LEFT;
                }
                else if (point.y > this.y + this.height / 2 - PAD) {
                    return Contact.BOTTOM_LEFT;
                }
                else {
                    return Contact.LEFT;
                }
            }
            else if (point.x > this.x + this.width / 2 - PAD) {
                if (point.y < this.y - this.height / 2 + PAD) {
                    return Contact.TOP_RIGHT;
                }
                else if (point.y > this.y + this.height / 2 - PAD) {
                    return Contact.BOTTOM_RIGHT;
                }
                else {
                    return Contact.RIGHT;
                }
            }
            else {
                if (point.y < this.y - this.height / 2 + PAD) {
                    return Contact.TOP;
                }
                else if (point.y > this.y + this.height / 2 - PAD) {
                    return Contact.BOTTOM;
                }
                else {
                    return Contact.MIDDLE;
                }
            }
        }
        else {
            return Contact.NONE;
        }
    };
    return Key;
}());
var KeyGrab = /** @class */ (function () {
    function KeyGrab(key, contact, offset) {
        this.key = key;
        this.contact = contact;
        this.offset = offset;
    }
    KeyGrab.create = function (event) {
        var key = new Key(event.x, event.y, UNIT, UNIT);
        key.ghost = true;
        return new KeyGrab(key, Contact.MIDDLE, new Point());
    };
    return KeyGrab;
}());
var KeyManager = /** @class */ (function () {
    function KeyManager(canvas) {
        this.keys = [];
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
        this.grab = null;
        this.bind(canvas);
    }
    KeyManager.prototype.bind = function (canvas) {
        canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
        canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    };
    KeyManager.prototype.onMouseDown = function (event) {
        if (event.button === 0) {
            var result = this.keyAtPoint(event);
            if (result !== null) {
                var key = result[0], contact = result[1];
                if (contact === Contact.MIDDLE) {
                    this.grab = new KeyGrab(key, contact, Point.subtract(key, event));
                    this.render();
                }
            }
            else {
                this.grab = KeyGrab.create(event);
                this.keys.push(this.grab.key);
                this.render();
            }
        }
    };
    KeyManager.prototype.onMouseMove = function (event) {
        if (this.grab !== null) {
            this.grab.key.x = event.x - this.grab.offset.x;
            this.grab.key.y = event.y - this.grab.offset.y;
            this.render();
        }
        else {
            var result = this.keyAtPoint(event);
            if (result !== null) {
                this.canvas.style.cursor = contactAsCursor(result[1]);
            }
            else {
                this.canvas.style.cursor = "cell";
            }
        }
    };
    KeyManager.prototype.onMouseUp = function (event) {
        if (event.button === 0) {
            if (this.grab !== null) {
                this.grab.key.ghost = false;
                this.grab = null;
                this.render();
                this.canvas.style.cursor = "grab";
            }
        }
    };
    KeyManager.prototype.render = function () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (var _i = 0, _a = this.keys; _i < _a.length; _i++) {
            var key = _a[_i];
            key.render(this.context);
        }
    };
    KeyManager.prototype.keyAtPoint = function (point) {
        for (var _i = 0, _a = this.keys; _i < _a.length; _i++) {
            var key = _a[_i];
            var contact = key.contact(point);
            if (contact !== Contact.NONE) {
                return [key, contact];
            }
        }
        return null;
    };
    return KeyManager;
}());
var Application = /** @class */ (function () {
    function Application(canvas) {
        this.canvas = canvas;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.keys = new KeyManager(canvas);
    }
    Application.prototype.main = function () {
        this.keys.render();
    };
    return Application;
}());
window.addEventListener("load", function () {
    var canvas = document.getElementById("canvas");
    new Application(canvas).main();
});
