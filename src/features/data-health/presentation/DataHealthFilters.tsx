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
    <section className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,0.7fr)_auto]">
      <label className="relative">
        <Search className="absolute start-3 top-3 h-4 w-4 text-on-surface-variant" />
        <Input
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="بحث بالمالك أو المعرف أو وصف المشكلة"
          className="asol-input-decorated-start"
        />
      </label>
      <FilterSelect value={props.severity} onChange={props.setSeverity}>
        <option value="all">كل الخطورة</option>
        <option value="critical">حرج</option>
        <option value="warning">تحذير</option>
        <option value="info">معلومة</option>
      </FilterSelect>
      <FilterSelect value={props.category} onChange={props.setCategory}>
        <option value="all">كل الأنواع</option>
        {Object.entries(categoryLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect value={props.database} onChange={props.setDatabase}>
        <option value="all">كل القواعد</option>
        {props.databases.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect value={props.state} onChange={props.setState}>
        <option value="all">كل الحالات</option>
        <option value="new">جديدة</option>
        <option value="recurring">متكررة</option>
        <option value="quarantined">في الحجر</option>
      </FilterSelect>
      <label className="flex items-center gap-2 px-1 text-sm">
        <input
          type="checkbox"
          checked={props.cleanableOnly}
          onChange={(event) => props.setCleanableOnly(event.target.checked)}
        />
        قابل للتنظيف
      </label>
    </section>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
    >
      {children}
    </select>
  );
}
