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
    <section id='features-data-health-presentation-datahealthfilters-section-1-fjwskf' className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,0.7fr)_auto]">
      <label id='features-data-health-presentation-datahealthfilters-label-2-h1caqx' className="relative">
        <Search id='features-data-health-presentation-datahealthfilters-search-3-6o8p2e' className="absolute start-3 top-3 h-4 w-4 text-on-surface-variant" />
        <Input id='features-data-health-presentation-datahealthfilters-input-4-iynqaa'
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="بحث بالمالك أو المعرف أو وصف المشكلة"
          className="asol-input-decorated-start"
        />
      </label>
      <FilterSelect id='features-data-health-presentation-datahealthfilters-filterselect-5-eumop3' value={props.severity} onChange={props.setSeverity}>
        <option id="features-data-health-presentation-datahealthfilters-option-6-8etbav" value="all">كل الخطورة</option>
        <option id="features-data-health-presentation-datahealthfilters-option-7-ykvxjj" value="critical">حرج</option>
        <option id="features-data-health-presentation-datahealthfilters-option-8-5igb9p" value="warning">تحذير</option>
        <option id="features-data-health-presentation-datahealthfilters-option-9-sopvck" value="info">معلومة</option>
      </FilterSelect>
      <FilterSelect id='features-data-health-presentation-datahealthfilters-filterselect-10-7ldvzn' value={props.category} onChange={props.setCategory}>
        <option id="features-data-health-presentation-datahealthfilters-option-11-djcgsv" value="all">كل الأنواع</option>
        {Object.entries(categoryLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect id='features-data-health-presentation-datahealthfilters-filterselect-12-88zdoe' value={props.database} onChange={props.setDatabase}>
        <option id="features-data-health-presentation-datahealthfilters-option-13-98lis5" value="all">كل القواعد</option>
        {props.databases.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect id='features-data-health-presentation-datahealthfilters-filterselect-14-gzte19' value={props.state} onChange={props.setState}>
        <option id="features-data-health-presentation-datahealthfilters-option-15-0tybaz" value="all">كل الحالات</option>
        <option id="features-data-health-presentation-datahealthfilters-option-16-byb3rd" value="new">جديدة</option>
        <option id="features-data-health-presentation-datahealthfilters-option-17-iycycu" value="recurring">متكررة</option>
        <option id="features-data-health-presentation-datahealthfilters-option-18-lp4l9r" value="quarantined">في الحجر</option>
      </FilterSelect>
      <label id='features-data-health-presentation-datahealthfilters-label-19-2c5ori' className="flex items-center gap-2 px-1 text-sm">
        <input id='features-data-health-presentation-datahealthfilters-input-20-4hejg7'
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
