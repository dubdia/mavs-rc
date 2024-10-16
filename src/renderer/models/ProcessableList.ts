/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortDescriptor } from "@nextui-org/react";

/** the state of a list in the ui  */
export type ProcessableList<T> = {
  /** the original data */
  original: T[];

  /** the @see original data after filtering */
  filtered: T[];

  /** sorting */
  sortDescriptor: SortDescriptor;

  /** filter by text */
  searchText: string;

  /** filter on column */
  searchColumn: string;

  /** other filters */
  filters: ProcessableListFilter[];
};

/** options to change in the list */
export type ProcessableListParams<T> = {
  /** set this for overwriting the original data */
  original?: T[];
  /** set this for overwriting the search text */
  searchText?: string;
  /** set this for overwriting the sort */
  sortDescriptor?: SortDescriptor;
  /** set this for overwriting the filters */
  filters?: ProcessableListFilter[];
  /** set this to add a new filter */
  addFilter?: ProcessableListFilter;
  /** set this to remove this filter */
  removeFilter?: ProcessableListFilter | string;
};

/** a filter on the list */
export type ProcessableListFilter = {
  /** column to filter (e.G. 'name')*/
  column: string;

  /** operator  (e.G. 'equals')  */
  operator?: "equals" | "notEquals" | undefined;

  /** value to filter  (e.G. 'Harald Günter') */
  value: (string | number | boolean | Date);
};

/** changes given @param list using given @see params */
export const processList = <T>(list: ProcessableList<T>, params: ProcessableListParams<T>) => {
  if (params.original != null) {
    list.original = params.original;
  }
  if (params.searchText != null) {
    list.searchText = params.searchText;
  }
  if (params.sortDescriptor != null) {
    list.sortDescriptor = params.sortDescriptor;
  }
  if (params.filters != null) {
    list.filters = params.filters.filter((x) => x != null);
  }
  if (params.addFilter != null) {
    if (list.filters == null) {
      list.filters = [];
    }
    list.filters = list.filters.filter((x) => x.column !== params.addFilter?.column);

    list.filters.push(params.addFilter);
  }
  if (params.removeFilter != null) {
    if (list.filters != null) {
      if (typeof params.removeFilter === "string" || params.removeFilter instanceof String) {
        list.filters = list.filters.filter((x) => x.column !== params.removeFilter);
      } else {
        list.filters = list.filters.filter((x) => x !== params.removeFilter);
      }
    }
  }

  // apply search on original
  if (list.searchText != null && list.searchText != "") {
    list.filtered = list.original.filter((x) => (x as any)[list.searchColumn as any]?.includes(list.searchText));
  } else {
    list.filtered = list.original;
  }

  // apply filtering on original
  if (list.filters != null && list.filtered.length > 0) {
    for (const filter of list.filters) {
      // check if filter is valid
      if (filter == null || filter.column == null || filter.column == "") {
        continue;
      }

      // apply filtering
      list.filtered = list.filtered.filter((x) => {
        const currentValue = (x as any)[filter.column];
        if (filter.operator == "notEquals") {
          return currentValue !== filter.value;
        } else {
          return currentValue === filter.value;
        }
      });
    }
  }

  // apply sorting on filtered
  list.filtered = list.filtered.sort((a: any, b: any) => {
    let cmp = compare(a[list.sortDescriptor.column as any], b[list.sortDescriptor.column as any]);
    if (list.sortDescriptor.direction === "descending") {
      cmp *= -1;
    }
    return cmp;
  });
};

/** used to compare to nubmers or strings */
const compare = (a: any, b: any) => {
  if (typeof a === "number" && typeof b === "number") {
    return a - b; // for numbers, subtract them and use the sign of the result
  } else {
    // for strings or other types, convert to string and use localeCompare
    return String(a).localeCompare(String(b));
  }
};
