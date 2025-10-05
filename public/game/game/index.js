// ...existing code...
const keys = {};

const spaceShip = document.getElementById("spaceShip");
const vx = document.getElementById("vxText");
const vy = document.getElementById("vyText");
const angleText = document.getElementById("angleText");
const spaceShipBody = document.getElementById("spaceShipBody");
const _spaceShipTail = document.getElementById("spaceShipTail");
const cometAsteroid = document.getElementById("cometAsteroid");
const positionXText = document.getElementById("positionX");
const positionYText = document.getElementById("positionY");

if (!spaceShip) {
    console.error('spaceShip element not found');
}
if (!spaceShipBody) {
    console.error('spaceShipBody element not found');
}
if (!cometAsteroid) {
    console.error('cometAsteroid element not found');
}

let xSpeed = 0;
let ySpeed = 0;
let angle = 0;
let displayAngle = 0;
let braking = false;



let posX = (() => {
    const v = parseFloat(getComputedStyle(spaceShip).left);
    return Number.isFinite(v) ? v : spaceShip.offsetLeft || 0;
})();

let posY = (() => {
    const v = parseFloat(getComputedStyle(spaceShip).top);
    return Number.isFinite(v) ? v : spaceShip.offsetTop || 0;
})();

// save start state after initial positions have been read
const _startState = { xSpeed, ySpeed, angle, displayAngle, braking, posX, posY };
let _collisionHandled = false;

spaceShip.style.transformOrigin = '50% 50%';
spaceShip.style.transition = 'none';

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true; // track key state
    if (e.repeat) return;
    const key = e.key.toLowerCase();

    if (key === "w") {
        braking = false;
        const thrust = 5;
        const rad = angle * Math.PI / 180;
        xSpeed += thrust * Math.cos(rad);
        ySpeed += thrust * Math.sin(rad);
    }

    if (key === "s") {
        braking = false;
        const thrust = -5;
        const rad = angle * Math.PI / 180;
        xSpeed += thrust * Math.cos(rad);
        ySpeed += thrust * Math.sin(rad);
    }

    if (key === "a") {
        braking = false;
        angle += 15;
    }

    if (key === "d") {
        braking = false;
        angle -= 15;
    }

    if (key === "r") {
        braking = true;
        requestAnimationFrame(updateFrame);
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function handleContinuousInput() {
    const rad = angle * Math.PI / 180;

    const continuousThrust = 2;   // was 10 → reduced to 2
    const rotateSpeed = 3;        // was 15 → reduced to 3

    if (keys['w']) {
        braking = false;
        xSpeed += continuousThrust * Math.cos(rad);
        ySpeed += continuousThrust * Math.sin(rad);
    }

    if (keys['s']) {
        braking = false;
        const reverseThrust = -2; // gentler reverse
        xSpeed += reverseThrust * Math.cos(rad);
        ySpeed += reverseThrust * Math.sin(rad);
    }

    if (keys['a']) {
        braking = false;
        angle += rotateSpeed;
    }

    if (keys['d']) {
        braking = false;
        angle -= rotateSpeed;
    }
}

// circle-rectangle intersection (circle = comet)
function rectIntersectsCircle(rect, cx, cy, r) {
    // closest point on rect to circle center
    const closestX = Math.max(rect.left, Math.min(cx, rect.right));
    const closestY = Math.max(rect.top,  Math.min(cy, rect.bottom));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (r * r);
}

let lastTime = performance.now();
function updateFrame(time) {
    const dt = Math.max(0, (time - lastTime) / 1000);
    lastTime = time;

    handleContinuousInput();

    if (braking) {
        const brakeAccel = 500;
        const speed = Math.hypot(xSpeed, ySpeed);
        if (speed > 0) {
            const newSpeed = Math.max(0, speed - brakeAccel * dt);
            if (newSpeed <= 0.001) {
                xSpeed = 0;
                ySpeed = 0;
                braking = false;
            } else {
                const scale = newSpeed / speed;
                xSpeed *= scale;
                ySpeed *= scale;
            }
        } else {
            braking = false;
        }
    }

    posX += xSpeed * dt;
    posY -= ySpeed * dt;

    
    spaceShip.style.left = `${posX}px`;
    spaceShip.style.top = `${posY}px`;
    

    const _shipRect = spaceShip.getBoundingClientRect();
    const _screenW = window.innerWidth;
    const _screenH = window.innerHeight;
    

    let diff = angle - displayAngle;
    diff = ((diff + 180) % 360) - 180;
    const rotSmoothSpeed = 8;
    const t = Math.min(1, rotSmoothSpeed * dt);
    displayAngle += diff * t;

    spaceShip.style.transform = `rotate(${-displayAngle}deg)`;


    const _asteroids = document.querySelectorAll('.challengesAsteroids');

    

// move all asteroids every 1 second
        
    

    // circle-vs-rect collision: only first touch, anywhere on the circular surface counts
    if (!_collisionHandled && spaceShipBody && cometAsteroid) {
        try {
            const rShip = spaceShipBody.getBoundingClientRect();
            const rComet = cometAsteroid.getBoundingClientRect();
            const cx = rComet.left + rComet.width / 2;
            const cy = rComet.top  + rComet.height / 2;
            const radius = Math.min(rComet.width, rComet.height) / 2 ;

            if (rectIntersectsCircle(rShip, cx, cy, radius)) {
                _collisionHandled = true;
                window.alert('Collision detected: ship hit comet');
                window.location.reload();

                // revert to original/start values
                
            }

            const _screenW = window.innerWidth;
            const _screenH = window.innerHeight;
        } catch (err) {
            console.error('Collision check failed', err);
        }
    }


    if (!_collisionHandled && spaceShipBody) {
    const rShip = spaceShipBody.getBoundingClientRect();

    _asteroids.forEach(asteroid => {
        try {
            const rAsteroid = asteroid.getBoundingClientRect();
            const cx = rAsteroid.left + rAsteroid.width / 2;
            const cy = rAsteroid.top + rAsteroid.height / 2;
            const radius = Math.min(rAsteroid.width, rAsteroid.height) / 2;

            if (rectIntersectsCircle(rShip, cx, cy, radius)) {
                _collisionHandled = true;
                window.alert('Collision detected: ship hit an asteroid!');
                window.location.reload();
                // optionally revert to start state here
            }
        } catch (err) {
            console.error('Collision check failed for an asteroid', err);
        }
    });
}


    if (!_collisionHandled && spaceShipBody && cometAsteroid) {
    try {
        const rShip = spaceShipBody.getBoundingClientRect();
        const rComet = cometAsteroid.getBoundingClientRect();
        const cx = rComet.left + rComet.width / 2;
        const cy = rComet.top + rComet.height / 2;
        const radius = Math.min(rComet.width, rComet.height) / 2;

        // ✅ Collision detection
        if (rectIntersectsCircle(rShip, cx, cy, radius)) {
            _collisionHandled = true;
            window.alert('Collision detected: ship hit comet');
            window.location.reload();

            // revert to original/start values
        }

        // ✅ Out-of-bounds detection
    const _screenW = window.innerWidth;
    const _screenH = window.innerHeight;
        const margin = 50; // buffer to prevent instant reload at edge

        if (
            rShip.right < -margin ||
            rShip.left > _screenW + margin ||
            rShip.bottom < -margin ||
            rShip.top > _screenH + margin
        ) {
            _collisionHandled = true;
            window.alert('🚀 You flew out of bounds!');
            window.location.reload();
        }

    } catch (err) {
        console.error('Collision check failed', err);
    }
}


    vx.textContent = `Vx: ${xSpeed.toFixed(2)}`;
    vy.textContent = `Vy: ${ySpeed.toFixed(2)}`;
    const rect = cometAsteroid.getBoundingClientRect();
    positionXText.textContent = `PosX: ${rect.x.toFixed(1)} | PosY: ${rect.y.toFixed(1)}`;
    positionYText.textContent = `PosY ${posY}`;

    const shownAngle = ((displayAngle % 360) + 360) % 360;
    angleText.textContent = `Angle: ${shownAngle.toFixed(1)}°`;

    requestAnimationFrame(updateFrame);
}

requestAnimationFrame(updateFrame);
// ...existing code...