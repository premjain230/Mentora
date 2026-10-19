
/**
 * Graph helpers.
 * Only renders data. Never writes mastery data.
 * Styling stays in graphs.css.
 */

// Escape HTML to prevent unsafe content from being inserted.
function esc(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(/[&<>"']/g, char => entities[char]);
}

// Keep numbers within a given range.
function clamp(value, min = 0, max = 1) {
  const number = Number(value) || 0;
  return Math.max(min, Math.min(number, max));
}

// Read a CSS variable with a fallback.
function css(name, fallback) {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim() || fallback
  );
}

// Show an empty state.
function empty(height, title, subtitle = "") {
  return `
    <div class="aq-empty" style="min-height:${height}px">
      ${title}
      ${subtitle ? `<small>${subtitle}</small>` : ""}
    </div>
  `;
}

// 1. Mastery radial graph
export function renderMasteryRadial(container, masteryScore, evidenceStrength) {
  if (!container) return;

  const percentage = Math.round(clamp(masteryScore) * 100);
  const evidence = clamp(evidenceStrength);

  let evidenceLabel = "Strong";

  if (evidence < 0.35) {
    evidenceLabel = "Limited";
  } else if (evidence < 0.7) {
    evidenceLabel = "Adequate";
  }

  const color =
    masteryScore >= 0.75 ? "var(--g-hi)" : "var(--accent)";

  container.innerHTML = `
    <div class="aq-radial-wrap">
      <div
        class="aq-radial"
        style="--p:${percentage};--c:${color}"
        role="img"
        aria-label="Mastery ${percentage} percent"
      >
        <span>${percentage}%</span>
      </div>

      <div>
        <div class="aq-stat-title">Mastery estimate</div>

        <div class="aq-stat-sub">
          Evidence: ${evidenceLabel} (${Math.round(evidence * 100)}%)
        </div>

        <div class="aq-bar-track">
          <div
            class="aq-bar-fill"
            style="width:${percentage}%"
          ></div>
        </div>
      </div>
    </div>
  `;
}

// 2. Upcoming review timeline
export function renderRetentionTimeline(container, reviews) {
  if (!container) return;

  const rows = [...(reviews || [])]
    .sort(
      (a, b) =>
        new Date(a.nextReviewAt) - new Date(b.nextReviewAt)
    )
    .slice(0, 5);

  if (!rows.length) {
    container.innerHTML = empty(72, "Nothing due for review");
    return;
  }

  container.innerHTML = `
    <div class="aq-timeline">
      ${rows.map(review => `
        <div class="aq-tl-row">
          <span class="aq-dot"></span>

          <strong>${esc(review.conceptId)}</strong>
          · ${esc(review.reviewState)}

          <small>
            ${
              review.nextReviewAt
                ? new Date(review.nextReviewAt).toLocaleDateString()
                : ""
            }
          </small>
        </div>
      `).join("")}
    </div>
  `;
}

// 3. Small mastery trend graph
export function renderProgressSparkline(container, points) {
  if (!container) return;

  const width = 300;
  const height = 60;

  if (!points || points.length < 2) {
    container.innerHTML = empty(height, "Not enough data");
    return;
  }

  function getX(index) {
    return (index / (points.length - 1)) * width;
  }

  function getY(point) {
    return height - 4 - clamp(point) * (height - 8);
  }

  const line = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${getX(index)} ${getY(point)}`;
    })
    .join(" ");

  const gradientId =
    "graph-" + Math.random().toString(36).slice(2, 9);

  container.innerHTML = `
    <svg
      class="aq-spark"
      viewBox="0 0 ${width} ${height}"
      preserveAspectRatio="none"
      role="img"
      aria-label="Mastery trend"
    >
      <defs>
        <linearGradient
          id="${gradientId}"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0"
            stop-color="var(--accent)"
            stop-opacity=".18"
          />
          <stop
            offset="1"
            stop-color="var(--accent)"
            stop-opacity="0"
          />
        </linearGradient>
      </defs>

      <path
        d="${line} L ${width} ${height} L 0 ${height} Z"
        fill="url(#${gradientId})"
      />

      <path
        d="${line}"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  `;
}

// 4. Subject progress bars
export function renderSubjectBars(container, subjectStats) {
  if (!container) return;

  if (!subjectStats || !subjectStats.length) {
    container.innerHTML = empty(
      72,
      "No subject data yet",
      "Quiz in any subject to build this"
    );
    return;
  }

  function getColor(percentage) {
    if (percentage >= 75) return "var(--g-hi)";
    if (percentage >= 50) return "var(--g-mid)";
    return "var(--g-low)";
  }

  container.innerHTML = subjectStats
    .slice(0, 6)
    .map(subject => {
      const percentage = Math.round(
        clamp(subject.pct, 0, 100)
      );

      return `
        <div class="aq-bar-row">
          <div class="aq-bar-meta">
            <span class="aq-bar-name">
              ${esc(subject.name)}
            </span>

            <span class="aq-bar-pct">
              ${percentage}%
            </span>
          </div>

          <div class="aq-bar-track">
            <div
              class="aq-bar-fill"
              style="
                width:${percentage}%;
                background:${getColor(percentage)}
              "
            ></div>
          </div>
        </div>
      `;
    })
    .join("");
}

// 5. Quiz score trend chart
export function renderScoreTrend(canvas, values, opts = {}) {
  if (!canvas || !values || !values.length) {
    const container = canvas?.parentElement;

    if (container) {
      container.innerHTML =
        empty(
          140,
          "No data yet",
          "Take a quiz and your score line appears here"
        ) +
        `
          <div class="aq-empty" style="padding:0">
            <a href="quiz.html">Take a quiz →</a>
          </div>
        `;
    }

    return;
  }

  // Avoid division by zero when only one score exists.
  if (values.length === 1) {
    values = [values[0], values[0]];
  }

  const accent = css("--accent", "#4cb8ee");
  const muted = css("--text-muted", "#6f7480");
  const grid = css("--border", "#23262d");
  const card = css("--bg-card", "#0e1013");

  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(
    260,
    Math.round(canvas.getBoundingClientRect().width || 300)
  );
  const height = 120;

  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  const context = canvas.getContext("2d");

  if (!context) return;

  context.scale(pixelRatio, pixelRatio);

  const padding = {
    top: 10,
    right: 10,
    bottom: 18,
    left: 32
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const count = values.length;

  const lowest = Math.max(0, Math.min(...values) - 8);
  const highest = Math.min(100, Math.max(...values) + 8);
  const range = highest - lowest || 1;

  function getX(index) {
    return padding.left + (index / (count - 1)) * chartWidth;
  }

  function getY(value) {
    return (
      padding.top +
      chartHeight -
      ((value - lowest) / range) * chartHeight
    );
  }

  // Draw horizontal grid lines.
  context.lineWidth = 1;
  context.strokeStyle = grid;

  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartHeight * i) / 3;

    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(padding.left + chartWidth, y);
    context.stroke();
  }

  // Create the shaded area beneath the score line.
  const gradient = context.createLinearGradient(
    0,
    padding.top,
    0,
    padding.top + chartHeight
  );

  gradient.addColorStop(0, accent + "2e");
  gradient.addColorStop(1, accent + "00");

  context.beginPath();

  values.forEach((value, index) => {
    if (index === 0) {
      context.moveTo(getX(index), getY(value));
    } else {
      context.lineTo(getX(index), getY(value));
    }
  });

  context.lineTo(getX(count - 1), padding.top + chartHeight);
  context.lineTo(getX(0), padding.top + chartHeight);
  context.closePath();

  context.fillStyle = gradient;
  context.fill();

  // Draw the score line.
  context.beginPath();
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.lineCap = "round";

  values.forEach((value, index) => {
    if (index === 0) {
      context.moveTo(getX(index), getY(value));
    } else {
      context.lineTo(getX(index), getY(value));
    }
  });

  context.stroke();

  // Draw a circle for each score.
  values.forEach((value, index) => {
    context.beginPath();
    context.arc(getX(index), getY(value), 3, 0, Math.PI * 2);

    context.fillStyle = accent;
    context.fill();

    context.strokeStyle = card;
    context.lineWidth = 1.5;
    context.stroke();
  });

  // Draw labels beneath the chart.
  context.fillStyle = muted;
  context.font = "10px 'Space Mono', monospace";
  context.textAlign = "center";

  const labels =
    opts.labels && opts.labels.length === count
      ? opts.labels
      : null;

  values.forEach((value, index) => {
    const label = labels
      ? String(labels[index]).slice(0, 6)
      : `#${index + 1}`;

    context.fillText(label, getX(index), height - 3);
  });

  // Draw the highest and lowest score labels.
  context.textAlign = "right";

  context.fillText(
    Math.round(highest) + "%",
    padding.left - 6,
    padding.top + 8
  );

  context.fillText(
    Math.round(lowest) + "%",
    padding.left - 6,
    padding.top + chartHeight
  );
}

// 6. Daily study volume bars
export function renderVolumeBars(container, dailySeconds) {
  if (!container) return;

  if (!dailySeconds || dailySeconds.every(value => !value)) {
    container.innerHTML = empty(
      56,
      "No volume yet",
      "Study daily to build volume"
    );
    return;
  }

  const maximum = Math.max(1, ...dailySeconds);
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  container.innerHTML = `
    <div class="aq-vol">
      ${dailySeconds.map((seconds, index) => {
        const barHeight = Math.max(
          4,
          Math.round((seconds / maximum) * 46)
        );

        const zeroClass = seconds ? "" : " z";
        const day = days[index] || index + 1;

        return `
          <div class="aq-vol-col">
            <div
              class="aq-vol-bar${zeroClass}"
              style="height:${barHeight}px"
            ></div>

            <span>${day}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// 7. Keep the existing stock chart function compatible.
export function renderStockChart(canvas, values, opts = {}) {
  return renderScoreTrend(canvas, values, opts);
}
