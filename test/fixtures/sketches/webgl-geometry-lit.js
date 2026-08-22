// Ported from p5.js test/manual-test-examples/webgl/geometryLit.
// Adapted for headless: dropped the texture() row (needs an external image), replaced
// windowWidth/mouseX with fixed dimensions/rotation. Keeps the real 3D primitives and
// every light/material combination (ambient/emissive/specular/spot/point/directional,
// shininess, lightFalloff, perPixelLighting) verbatim.
const margins = 24;
const rowHeight = 24;
const numberOfRows = 10;
const uniqueGeometry = 6;
let columnWidth;
let currentX;
let currentY;
let theta = 0;

function setup() {
    createCanvas(200, rowHeight * numberOfRows, WEBGL);
    setAttributes("perPixelLighting", true);
    columnWidth = (width - margins) / uniqueGeometry;
}

function draw() {
    background(150, 150, 150, 255);

    currentY = -rowHeight * (numberOfRows / 2);
    translate(0, currentY, 0);
    push();
    noStroke();
    ambientMaterial(200, 100, 100);
    ambientLight(255);
    drawGeometryRow();
    pop();

    translate(0, rowHeight, 0);
    currentY += rowHeight;
    push();
    noStroke();
    emissiveMaterial(200, 100, 100);
    drawGeometryRow();
    pop();

    translate(0, rowHeight, 0);
    currentY += rowHeight;
    push();
    ambientLight(0, 0, 150);
    pointLight(200, 0, 0, 0, 0, 0);
    directionalLight(0, 200, 0, 0.5, 0, -1);
    noStroke();
    specularMaterial(250);
    shininess(0.1);
    drawGeometryRow();
    pop();

    translate(0, rowHeight, 0);
    currentY += rowHeight;
    push();
    ambientLight(0, 0, 150);
    pointLight(200, 0, 0, 0, 0, 0);
    directionalLight(0, 200, 0, 0.5, 0, -1);
    noStroke();
    specularMaterial(250);
    shininess(10);
    drawGeometryRow();
    pop();

    translate(0, rowHeight, 0);
    currentY += rowHeight;
    push();
    ambientLight(100, 200, 100);
    pointLight(0, 0, 200, 0, 0, 0);
    noStroke();
    lightFalloff(1, 0, 0);
    drawGeometryRow();
    pop();

    translate(0, rowHeight, 0);
    currentY += rowHeight;
    push();
    ambientLight(100, 200, 100);
    pointLight(0, 0, 200, 0, 0, 0);
    noStroke();
    lightFalloff(0.1, 0, 0);
    drawGeometryRow();
    pop();

    translate(0, rowHeight, 0);
    currentY += rowHeight;
    push();
    noStroke();
    shininess(10);
    ambientLight(50);
    specularColor(250, 0, 0);
    pointLight(255, 0, 0, 0, -100, 100);
    specularColor(0, 250, 0);
    pointLight(0, 255, 0, 0, 100, 100);
    specularMaterial(255);
    drawGeometryRow();
    pop();

    translate(0, rowHeight, 0);
    currentY += rowHeight;
    push();
    ambientLight(50);
    spotLight(0, 250, 0, 0, currentY + 100, 200, 0, 0, -1, 10, 3);
    spotLight(0, 0, 250, -width / 2, currentY, 100, 1, 0, 0, 100, 25);
    ambientMaterial(250);
    drawGeometryRow();
    pop();

    translate(0, rowHeight, 0);
    currentY += rowHeight;
    push();
    fill(255);
    ambientLight(150);
    pointLight(200, 200, 200, 0, 0, 0);
    drawGeometryRow(() => {
        noLights();
        fill(255);
    });
    pop();

    theta += 0.05;
}

function drawGeometryRow(callInMiddle) {
    currentX = -columnWidth * (uniqueGeometry / 2);
    translate(currentX, 0, 0);
    drawObject(() => {
        plane(25);
    });

    translate(columnWidth, 0, 0);
    currentX += columnWidth;
    drawObject(() => {
        box(25, 25, 25);
    });

    translate(columnWidth, 0, 0);
    currentX += columnWidth;
    drawObject(() => {
        cylinder(25, 25);
    });

    translate(columnWidth, 0, 0);
    currentX += columnWidth;
    drawObject(() => {
        cone(25, 25);
    });

    if (typeof callInMiddle === "function") {
        callInMiddle();
    }

    translate(columnWidth, 0, 0);
    currentX += columnWidth;
    drawObject(() => {
        torus(25, 10);
    });

    translate(columnWidth, 0, 0);
    currentX += columnWidth;
    drawObject(() => {
        sphere(25);
    });

    translate(columnWidth, 0, 0);
    currentX += columnWidth;
    drawObject(() => {
        rect(0, 0, 25, 25);
    });
}

function drawObject(geom) {
    push();
    _rotate();
    geom();
    pop();
}

function _rotate() {
    rotateZ(theta);
    rotateX(theta);
    rotateY(theta);
}
