import { getLocale, getTranslations } from "next-intl/server";
import type { DashboardData } from "@/lib/dashboard/data";
import { formatShortDateLabel, formatUzs } from "@/lib/format";
import { resolveLocale } from "@/i18n/config";

function ratio(value: string, maxValue: bigint) {
  if (maxValue === 0n) return 0;
  return Number((BigInt(value) * 1000n) / maxValue) / 1000;
}

export async function SalesChart({
  sales,
  period,
}: {
  sales: DashboardData["sales"];
  period: DashboardData["period"];
}) {
  const t = await getTranslations("Dashboard");
  const locale = resolveLocale(await getLocale());
  const maximum = sales.reduce((max, point) => {
    const gross = BigInt(point.gross_order_value);
    const collected = BigInt(point.collected_revenue);
    return [max, gross, collected].reduce(
      (largest, value) => (value > largest ? value : largest),
      0n,
    );
  }, 0n);
  const plotBottom = 190;
  const plotHeight = 150;
  const plotWidth = 800;
  const step = plotWidth / Math.max(sales.length, 1);
  const barWidth = Math.min(18, step * 0.26);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm bg-admin-orange" />
          {t("grossLegend")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm bg-admin-green" />
          {t("collectedLegend")}
        </span>
        <span className="ml-auto">{t("amountsInUzs")}</span>
      </div>
      <svg
        aria-label={t("salesChartLabel")}
        className="h-auto w-full overflow-visible"
        role="img"
        viewBox="0 0 840 230"
      >
        <title>{t("salesChartTitle")}</title>
        <desc>{t("salesChartDescription")}</desc>
        {[40, 90, 140, plotBottom].map((y) => (
          <line
            className="stroke-slate-100"
            key={y}
            x1="20"
            x2="820"
            y1={y}
            y2={y}
          />
        ))}
        {sales.map((point, index) => {
          const center = 20 + step * index + step / 2;
          const grossHeight = ratio(point.gross_order_value, maximum) * plotHeight;
          const collectedHeight =
            ratio(point.collected_revenue, maximum) * plotHeight;
          const grossY = plotBottom - grossHeight;
          const collectedY = plotBottom - collectedHeight;
          const label = formatShortDateLabel(point.date, period, locale);

          return (
            <g key={point.date}>
              <title>
                {`${label}: ${t("grossLegend")} ${formatUzs(point.gross_order_value, locale)}, ${t("collectedLegend")} ${formatUzs(point.collected_revenue, locale)}`}
              </title>
              <rect
                fill="var(--color-admin-orange)"
                height={Math.max(grossHeight, 1)}
                opacity={point.gross_order_value === "0" ? 0.18 : 0.9}
                rx="3"
                width={barWidth}
                x={center - barWidth - 2}
                y={grossHeight ? grossY : plotBottom - 1}
              />
              <rect
                fill="var(--color-admin-green)"
                height={Math.max(collectedHeight, 1)}
                opacity={point.collected_revenue === "0" ? 0.18 : 0.9}
                rx="3"
                width={barWidth}
                x={center + 2}
                y={collectedHeight ? collectedY : plotBottom - 1}
              />
              <text
                className="fill-slate-400 text-[10px]"
                textAnchor="middle"
                x={center}
                y="215"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{t("salesChartTitle")}</caption>
        <thead>
          <tr>
            <th>{t("tablePeriod")}</th>
            <th>{t("grossLegend")}</th>
            <th>{t("collectedLegend")}</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((point) => (
            <tr key={point.date}>
              <th>{formatShortDateLabel(point.date, period, locale)}</th>
              <td>{formatUzs(point.gross_order_value, locale)}</td>
              <td>{formatUzs(point.collected_revenue, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
