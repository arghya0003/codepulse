"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";

export type HeatmapDay = {
  date: string;   // "YYYY-MM-DD"
  count: number;
  platform?: string;
};

type Props = {
  data: HeatmapDay[];
  colorScale?: string[];
  title?: string;
  showLegend?: boolean;
  className?: string;
};

const CELL_SIZE = 11;
const CELL_GAP = 3;
const WEEK_WIDTH = CELL_SIZE + CELL_GAP;
const MONTH_GAP = 16;
const MONTH_LABEL_HEIGHT = 24;
const DAY_LABEL_WIDTH = 30;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BLUE_COLORS = [
  "#2c2c2c", // 0
  "#0a3069", // 1-2
  "#0969da", // 3-6
  "#54aeff", // 7-12
  "#b6e3ff", // 13+
];

export function HeatmapCalendar({
  data,
  colorScale = BLUE_COLORS,
  title,
  showLegend = true,
  className = "",
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Build a date→count lookup
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) {
      map.set(d.date, (map.get(d.date) ?? 0) + d.count);
    }
    return map;
  }, [data]);

  // Build the Leetcode-style grid (grouped exactly by month)
  const { cells, monthLabels, totalWidth, totalHeight } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);

    const cellsArr: Array<{
      dateStr: string;
      count: number;
      x: number;
      y: number;
      delayIdx: number;
    }> = [];
    const monthLabelsArr: Array<{ label: string; x: number }> = [];

    const monthGroups = new Map<
      string,
      { label: string; year: number; month: number; days: any[] }
    >();

    const cursor = new Date(startDate);
    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0];
      const mKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;

      if (!monthGroups.has(mKey)) {
        monthGroups.set(mKey, {
          label: cursor.toLocaleString("default", { month: "short" }),
          year: cursor.getFullYear(),
          month: cursor.getMonth(),
          days: [],
        });
      }

      monthGroups.get(mKey)!.days.push({
        date: new Date(cursor),
        dateStr,
        count: countByDate.get(dateStr) ?? 0,
        dateNum: cursor.getDate(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    let currentX = 0;
    for (const group of Array.from(monthGroups.values())) {
      const firstDayOfWeek = new Date(group.year, group.month, 1).getDay();
      let maxCol = 0;

      for (const day of group.days) {
        const col = Math.floor((firstDayOfWeek + day.dateNum - 1) / 7);
        const row = (firstDayOfWeek + day.dateNum - 1) % 7;
        maxCol = Math.max(maxCol, col);

        cellsArr.push({
          dateStr: day.dateStr,
          count: day.count,
          x: currentX + col * WEEK_WIDTH,
          y: row * WEEK_WIDTH,
          delayIdx: cellsArr.length,
        });
      }

      const groupWidth = (maxCol + 1) * WEEK_WIDTH;

      monthLabelsArr.push({
        label: group.label,
        x: currentX + groupWidth / 2 - WEEK_WIDTH / 2, // Centered physically under the block
      });

      currentX += groupWidth + MONTH_GAP;
    }

    return {
      cells: cellsArr,
      monthLabels: monthLabelsArr,
      totalWidth: currentX - MONTH_GAP,
      totalHeight: 7 * WEEK_WIDTH + MONTH_LABEL_HEIGHT,
    };
  }, [countByDate]);

  // D3 color scale
  const color = useMemo(
    () =>
      d3
        .scaleThreshold<number, string>()
        .domain([1, 3, 7, 13])
        .range(colorScale as unknown as string[]),
    [colorScale]
  );

  // Draw tooltip imperatively via D3
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Remove any existing tooltip
    d3.select("#heatmap-tooltip").remove();
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("id", "heatmap-tooltip")
      .style("position", "fixed")
      .style("pointer-events", "none")
      .style("padding", "6px 10px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("background", "hsl(240 5% 10%)")
      .style("color", "hsl(0 0% 90%)")
      .style("border", "1px solid hsl(240 5% 25%)")
      .style("opacity", "0")
      .style("z-index", "9999")
      .style("white-space", "nowrap");

    svg
      .selectAll<SVGRectElement, unknown>("rect.day")
      .on("mouseenter", function (event) {
        const node = this as SVGRectElement;
        const dateStr = node.getAttribute("data-date");
        const countStr = node.getAttribute("data-count");
        if (!dateStr || !countStr) return;

        const count = parseInt(countStr, 10);
        const date = new Date(dateStr + "T00:00:00");
        const formatted = date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        tooltip
          .style("opacity", "1")
          .html(
            `<strong>${count} submission${count !== 1 ? "s" : ""}</strong><br/>${formatted}`
          );
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.clientX + 12 + "px")
          .style("top", event.clientY - 36 + "px");
      })
      .on("mouseleave", function () {
        tooltip.style("opacity", "0");
      });

    return () => {
      d3.select("#heatmap-tooltip").remove();
    };
  }, [cells]); // re-bind when cells change

  return (
    <div className={`select-none ${className}`}>
      {title && (
        <p className="text-sm font-medium text-muted-foreground mb-3">{title}</p>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${DAY_LABEL_WIDTH + totalWidth} ${totalHeight}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        className="overflow-visible"
      >
        {/* Day of week labels on the left */}
        {DAY_LABELS.map((day, idx) => (
          <text
            key={`day-${idx}`}
            x={DAY_LABEL_WIDTH - 8}
            y={idx * WEEK_WIDTH + CELL_SIZE / 2 + 4}
            textAnchor="end"
            fill="currentColor"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {day}
          </text>
        ))}

        {/* Cells */}
        {cells.map((cell) => (
          <motion.rect
            key={cell.dateStr}
            className="day"
            x={DAY_LABEL_WIDTH + cell.x}
            y={cell.y}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={2}
            ry={2}
            fill={color(cell.count)}
            data-date={cell.dateStr}
            data-count={cell.count}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: cell.delayIdx * 0.001,
              duration: 0.2,
            }}
          />
        ))}

        {/* Month labels at bottom */}
        {monthLabels.map((m, i) => (
          <text
            key={`${m.label}-${i}`}
            x={DAY_LABEL_WIDTH + m.x + CELL_SIZE / 2}
            y={7 * WEEK_WIDTH + 14}
            textAnchor="middle"
            fill="currentColor"
            className="fill-muted-foreground"
            fontSize={11}
          >
            {m.label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-1.5 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          {colorScale.map((c, i) => (
            <div
              key={i}
              className="w-[11px] h-[11px] rounded-[2px]"
              style={{ background: c }}
            />
          ))}
          <span>More</span>
        </div>
      )}
    </div>
  );
}
