import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/shared/ui/input";

import { categoryLabels } from "./data-health-labels";

export function DataHealthFilters(props: {
  query: string;
  setQuery: (value: string) => void;
  severity: string;
  setSeverity: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  database: string;
  setDatabase: (value: string) => void;
  state: string;
  setState: (value: string) => void;
  databases: string[];
  cleanableOnly: boolean;
  setCleanableOnly: (value: boolean) => void;
}) {
  return (
    <section id="data-health.data-health-filters.section" className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,0.7fr)_auto]">
      <label id="data-health.data-health-filters.label" className="relative">
        <Search id="data-health.data-health-filters.search" className="absolute start-3 top-3 h-4 w-4 text-on-surface-variant" />
        <Input id="data-health.data-health-filters.input.2" ui={{ uid: "data-health.filters.query-2MLMO6", id: "data-health.filters.query", kind: "field", part: "filters" }}
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="بحث بالمالك أو المعرف أو وصف المشكلة"
          className="asol-input-decorated-start"
        />
      </label>
      <FilterSelect id="data-health.data-health-filters.filter-select" value={props.severity} onChange={props.setSeverity}>
        <option value="all">كل الخطورة</option>
        <option value="critical">حرج</option>
        <option value="warning">تحذير</option>
        <option value="info">معلومة</option>
      </FilterSelect>
      <FilterSelect id="data-health.data-health-filters.filter-select.2" value={props.category} onChange={props.setCategory}>
        <option value="all">كل الأنواع</option>
        {Object.entries(categoryLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect id="data-health.data-health-filters.filter-select.3" value={props.database} onChange={props.setDatabase}>
        <option value="all">كل القواعد</option>
        {props.databases.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect id="data-health.data-health-filters.filter-select.4" value={props.state} onChange={props.setState}>
        <option value="all">كل الحالات</option>
        <option value="new">جديدة</option>
        <option value="recurring">متكررة</option>
        <option value="quarantined">في الحجر</option>
      </FilterSelect>
      <label id="data-health.data-health-filters.label.2" className="flex items-center gap-2 px-1 text-sm">
        <input id="data-health.data-health-filters.input"
          type="checkbox"
          checked={props.cleanableOnly}
          onChange={(event) => props.setCleanableOnly(event.target.checked)}
        />
        قابل للتنظيف
      </label>
    </section>
  );
}

function FilterSelect({ id,
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
} & { id?: string }) {
  return (
    <select id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
    >
      {children}
    </select>
  );
}
