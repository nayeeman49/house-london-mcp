import type { BoroughMapRecord } from "@/lib/map-metrics";

export function BoroughPopupContent({ record }: { record: BoroughMapRecord }) {
  return (
    <div className="text-sm space-y-1 min-w-[220px] text-[#f2f0eb]">
      <p className="font-semibold text-base">{record.borough}</p>
      <p className="text-[10px] uppercase tracking-wider text-[#7a7974] pt-1">Foundations</p>
      <p>{record.total_applications.toLocaleString()} applications</p>
      {record.approval_rate != null && (
        <p>Approval: {(record.approval_rate * 100).toFixed(1)}%</p>
      )}
      {record.avg_decision_delay_days != null && (
        <p>Avg days: {record.avg_decision_delay_days}</p>
      )}
      {record.deadline_day_share != null && (
        <p>Deadline share: {(record.deadline_day_share * 100).toFixed(1)}%</p>
      )}
      {record.repeat_application_share != null && (
        <p>Repeat share: {(record.repeat_application_share * 100).toFixed(1)}%</p>
      )}
      {(record.population != null || record.households != null) && (
        <>
          <p className="text-[10px] uppercase tracking-wider text-[#7a7974] pt-2">Census 2021</p>
          {record.population != null && (
            <p>Population: {record.population.toLocaleString()}</p>
          )}
          {record.households != null && (
            <p>Households: {record.households.toLocaleString()}</p>
          )}
        </>
      )}
      {record.avg_imd_decile != null && (
        <>
          <p className="text-[10px] uppercase tracking-wider text-[#7a7974] pt-2">IMD 2025</p>
          <p>Avg decile: {record.avg_imd_decile}</p>
        </>
      )}
      {record.housing_stock_pct_change != null && (
        <>
          <p className="text-[10px] uppercase tracking-wider text-[#7a7974] pt-2">
            Housing in London
          </p>
          <p>Stock change 2014–24: {record.housing_stock_pct_change}%</p>
        </>
      )}
      {record.avg_housing_gap != null && (
        <>
          <p className="text-[10px] uppercase tracking-wider text-[#7a7974] pt-2">WhereToBuild</p>
          <p>Housing gap: {record.avg_housing_gap}</p>
        </>
      )}
    </div>
  );
}
