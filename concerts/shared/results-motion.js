// Animate only visible results; maps keep their scale and controls update immediately.
let running = [];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
function stop() {
  for (const { animation, ghost } of running) {
    animation.cancel();
    ghost?.remove();
  }
  running = [];
}
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) stop();
});
const visible = (r) => r.height > 0 && r.bottom > 0 && r.top < innerHeight;
export function captureResults(root, nextIds) {
  const rows = new Map();
  const ghosts = [];
  if (!root || reducedMotion.matches) {
    stop();
    return null;
  }
  for (const row of root.querySelectorAll(".event-row")) {
    const rect = row.getBoundingClientRect();
    if (!visible(rect)) continue;
    rows.set(row.dataset.eventId, rect);
    if (!nextIds.has(row.dataset.eventId)) {
      const ghost = row.cloneNode(true);
      ghost.removeAttribute("id");
      ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      ghost.inert = true;
      ghost.setAttribute("aria-hidden", "true");
      ghost.classList.add("results-ghost");
      Object.assign(ghost.style, {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: "0",
      });
      ghosts.push(ghost);
    }
  }
  const hadContent = !!root.firstElementChild;
  stop();
  return { rows, ghosts, hadContent };
}
export function animateResults(root, before) {
  if (!before?.hadContent || reducedMotion.matches) return;
  const play = (el, frames, duration, ghost) => {
    const animation = el.animate(frames, {
      duration,
      easing: "cubic-bezier(.2,.7,.2,1)",
    });
    const entry = { animation, ghost };
    running.push(entry);
    const done = () => {
      ghost?.remove();
      running = running.filter((item) => item !== entry);
    };
    animation.finished.then(done, done);
  };
  for (const ghost of before.ghosts) {
    document.body.append(ghost);
    play(ghost, [{ opacity: 0.65 }, { opacity: 0 }], 150, ghost);
  }
  const rows = root.querySelectorAll(".event-row");
  if (!rows.length) {
    play(root, [{ opacity: 0.35 }, { opacity: 1 }], 220);
    return;
  }
  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    if (!visible(rect)) continue;
    const old = before.rows.get(row.dataset.eventId);
    const dy = old ? old.top - rect.top : 0;
    if (old && Math.abs(dy) < innerHeight) {
      if (Math.abs(dy) > 1)
        play(
          row,
          [
            { transform: `translateY(${dy}px)` },
            { transform: "translateY(0)" },
          ],
          280,
        );
    } else {
      play(
        row,
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        230,
      );
    }
  }
}
