// useSelection(items, keyOf): which of a list's loaded items are ticked, for its checkboxes and
// Select all. It fetches nothing; a ticked item that leaves the list drops out by itself.

"use client";

import { useState } from "react";

export function useSelection(items, keyOf) {
  const [keys, setKeys] = useState(() => new Set());
  const list = items ?? [];

  // Only items still listed count, so a refetch that removes a row also unticks it.
  const selectedItems = list.filter((item) => keys.has(keyOf(item)));
  const allSelected = list.length > 0 && selectedItems.length === list.length;
  const someSelected = selectedItems.length > 0 && !allSelected;

  function isSelected(item) {
    return keys.has(keyOf(item));
  }

  function toggle(item) {
    const key = keyOf(item);
    setKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Ticks every loaded item, or unticks them all when they already are.
  function toggleAll() {
    setKeys(allSelected ? new Set() : new Set(list.map(keyOf)));
  }

  function clear() {
    setKeys(new Set());
  }

  return {
    selectedItems,
    isSelected,
    toggle,
    allSelected,
    someSelected,
    toggleAll,
    clear,
  };
}
