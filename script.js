const desktop = document.getElementById("desktop");
const canvas = document.getElementById("network-canvas");
const clock = document.getElementById("system-clock");
const ctx = canvas.getContext("2d");
const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);
const coarsePointer = window.matchMedia(
  "(pointer: coarse)"
).matches;

function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    clock.dateTime = now.toISOString();
}

updateClock();
setInterval(updateClock, 1000);

let width = 0;
let height = 0;
let nodes = [];
const pointer = {
    x: -1000,
    y: -1000
};
const NODE_COUNT = 85;
const CONNECTION_DISTANCE = 145;

function createNodes() {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        radius: Math.random() * 1.5 + 0.7,
        phase: Math.random() * Math.PI * 2
    }));
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const oldWidth = width;
    const oldHeight = height;
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRation || 1,2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (nodes.length === 0 || !oldWidth || !oldHeight) {
        createNodes();
        return;
    }
   nodes.forEach(node => {
    node.x = (node.x / oldWidth) * width;
    node.y = (node.y / oldHeight) * height;
});
}

function drawConnections() {
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for(let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.hypot(dx, dy);
            if (distance > CONNECTION_DISTANCE) continue;
            const opacity = (1 - distance / CONNECTION_DISTANCE) * 0.2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(100, 170, 255, ${opacity})';
            ctx.lineWidth = 0.7;
            ctx.stroke();
        }
    }
}

function drawNodes(time) {
  nodes.forEach(node => {
    const pulse = reducedMotion.matches
      ? 0
      : Math.sin(time * 0.001 + node.phase) * 0.5;
    const radius = node.radius + pulse * 0.3;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(112, 234, 255, 0.07)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(133, 208, 255, 0.8)";
    ctx.fill();
    const distance = Math.hypot(
      pointer.x - node.x,
      pointer.y - node.y
    );
    if (distance < 90) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(169, 148, 255, 0.65)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  });
}

function updateNodes() {
  if (reducedMotion.matches) return;
  nodes.forEach(node => {
    node.x += node.vx;
    node.y += node.vy;
    if (node.x < 0 || node.x > width) node.vx *= -1;
    if (node.y < 0 || node.y > height) node.vy *= -1;
    node.x = Math.max(0, Math.min(width, node.x));
    node.y = Math.max(0, Math.min(height, node.y));
  });
}

function animateNetwork(time = 0) {
  ctx.clearRect(0, 0, width, height);
  drawConnections();
  drawNodes(time);
  updateNodes();
  requestAnimationFrame(animateNetwork);
}

document.addEventListener("pointermove", event => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  if (neuronCursor) {
    neuronCursor.style.transform =
      `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  }
});

document.addEventListener("pointerleave", () => {
  pointer.x = -1000;
  pointer.y = -1000;
});

let neuronCursor = null;
if (!coarsePointer) {
  neuronCursor = document.createElement("div");
  neuronCursor.className = "neuron-cursor";
  neuronCursor.setAttribute("aria-hidden", "true");
  neuronCursor.innerHTML = `
    <svg viewBox="0 0 40 40" width="36" height="36">
      <g
        fill="none"
        stroke="#70eaff"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 20 L11 12 L5 12" />
        <path d="M11 12 L12 5" />
        <path d="M20 20 L29 12 L35 12" />
        <path d="M29 12 L28 5" />
        <path d="M20 20 L10 27 L5 27" />
        <path d="M10 27 L10 34" />
        <path d="M20 20 L29 28 L35 28" />
        <path d="M29 28 L30 35" />
        <circle cx="20" cy="20" r="5" fill="#a994ff" />
      </g>
    </svg>
  `;
  document.body.appendChild(neuronCursor);
}

let toastTimer;
function showToast(message) {
  let toast = document.querySelector(".system-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "system-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2200);
}

document.querySelectorAll("[data-app]").forEach(button => {
  button.addEventListener("click", () => {
    const appName = button.dataset.app;
    const labels = {
      neurolab: "NeuroLab",
      notes: "Notes",
      terminal: "Terminal",
      files: "Files",
      settings: "Settings"
    };
    showToast(`${labels[appName] || appName} · Window manager coming next`);
  });
});

resizeCanvas();

window.addEventListener("resize", resizeCanvas);

if ("ResizeObserver" in window) {
  const observer = new ResizeObserver(resizeCanvas);
  observer.observe(canvas);
}

animateNetwork();