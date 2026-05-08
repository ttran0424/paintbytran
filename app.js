const canvas = document.querySelector("#paintCanvas");
const ctx = canvas.getContext("2d");

const toolButtons = [...document.querySelectorAll("[data-tool]")];
const swatches = [...document.querySelectorAll("[data-color]")];
const colorInput = document.querySelector("#colorInput");
const sizeInput = document.querySelector("#sizeInput");
const sizeOutput = document.querySelector("#sizeOutput");
const undoBtn = document.querySelector("#undoBtn");
const redoBtn = document.querySelector("#redoBtn");
const saveBtn = document.querySelector("#saveBtn");
const fillBtn = document.querySelector("#fillBtn");
const clearBtn = document.querySelector("#clearBtn");
const toolStatus = document.querySelector("#toolStatus");
const sizeStatus = document.querySelector("#sizeStatus");

let currentTool = "pencil";
let currentColor = colorInput.value;
let brushSize = Number(sizeInput.value);
let drawing = false;
let startPoint = null;
let lastPoint = null;
let snapshot = null;
let undoStack = [];
let redoStack = [];

function initializeCanvas() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach((button) => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  toolStatus.textContent = tool[0].toUpperCase() + tool.slice(1);
}

function setColor(color) {
  currentColor = color;
  colorInput.value = color;
  swatches.forEach((swatch) => swatch.classList.toggle("active", swatch.dataset.color === color));
}

function updateSize(value) {
  brushSize = Number(value);
  sizeOutput.value = `${brushSize} px`;
  sizeOutput.textContent = `${brushSize} px`;
  sizeStatus.textContent = `${brushSize} px`;
}

function saveState() {
  const latestState = canvas.toDataURL("image/png");
  if (undoStack[undoStack.length - 1] === latestState) {
    updateHistoryButtons();
    return;
  }
  undoStack.push(latestState);
  if (undoStack.length > 40) {
    undoStack.shift();
  }
  redoStack = [];
  updateHistoryButtons();
}

function restoreFromDataUrl(dataUrl) {
  const image = new Image();
  image.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
  };
  image.src = dataUrl;
}

function updateHistoryButtons() {
  undoBtn.disabled = undoStack.length <= 1;
  redoBtn.disabled = redoStack.length === 0;
}

function configureStroke() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = brushSize;
  ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : currentColor;
  ctx.fillStyle = currentColor;
}

function drawStroke(point) {
  configureStroke();
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  lastPoint = point;
}

function previewShape(point) {
  if (!snapshot || !startPoint) return;
  ctx.putImageData(snapshot, 0, 0);
  configureStroke();

  const width = point.x - startPoint.x;
  const height = point.y - startPoint.y;

  if (currentTool === "line") {
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  if (currentTool === "rect") {
    ctx.strokeRect(startPoint.x, startPoint.y, width, height);
  }

  if (currentTool === "circle") {
    const radiusX = Math.abs(width) / 2;
    const radiusY = Math.abs(height) / 2;
    const centerX = startPoint.x + width / 2;
    const centerY = startPoint.y + height / 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function beginDrawing(event) {
  drawing = true;
  canvas.setPointerCapture(event.pointerId);
  startPoint = getCanvasPoint(event);
  lastPoint = startPoint;
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (["pencil", "brush", "eraser"].includes(currentTool)) {
    configureStroke();
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = currentTool === "eraser" ? "#ffffff" : currentColor;
    ctx.fill();
  }
}

function continueDrawing(event) {
  if (!drawing) return;
  const point = getCanvasPoint(event);

  if (["pencil", "brush", "eraser"].includes(currentTool)) {
    const originalWidth = brushSize;
    if (currentTool === "pencil") {
      brushSize = Math.max(1, Math.round(originalWidth * 0.45));
    }
    drawStroke(point);
    brushSize = originalWidth;
    return;
  }

  previewShape(point);
}

function endDrawing(event) {
  if (!drawing) return;
  drawing = false;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  startPoint = null;
  lastPoint = null;
  snapshot = null;
  saveState();
}

function undo() {
  if (undoStack.length <= 1) return;
  redoStack.push(undoStack.pop());
  restoreFromDataUrl(undoStack[undoStack.length - 1]);
  updateHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  const next = redoStack.pop();
  undoStack.push(next);
  restoreFromDataUrl(next);
  updateHistoryButtons();
}

function clearCanvas() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
}

function fillCanvas() {
  ctx.fillStyle = currentColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
}

function savePng() {
  const link = document.createElement("a");
  link.download = "simple-paint.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => setColor(swatch.dataset.color));
});

colorInput.addEventListener("input", (event) => setColor(event.target.value));
sizeInput.addEventListener("input", (event) => updateSize(event.target.value));
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
saveBtn.addEventListener("click", savePng);
clearBtn.addEventListener("click", clearCanvas);
fillBtn.addEventListener("click", fillCanvas);

document.addEventListener("keydown", (event) => {
  const modifierPressed = event.metaKey || event.ctrlKey;
  if (!modifierPressed) return;

  const key = event.key.toLowerCase();
  if (key === "z" && event.shiftKey) {
    event.preventDefault();
    redo();
  } else if (key === "z") {
    event.preventDefault();
    undo();
  } else if (key === "y") {
    event.preventDefault();
    redo();
  }
});

canvas.addEventListener("pointerdown", beginDrawing);
canvas.addEventListener("pointermove", continueDrawing);
canvas.addEventListener("pointerup", endDrawing);
canvas.addEventListener("pointercancel", endDrawing);
canvas.addEventListener("pointerleave", (event) => {
  if (drawing) endDrawing(event);
});

initializeCanvas();
