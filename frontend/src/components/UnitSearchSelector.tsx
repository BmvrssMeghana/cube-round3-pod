import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { WorkflowState } from '../types';
import { Search, X, ChevronDown, Check } from 'lucide-react';

interface UnitSearchSelectorProps {
  workflows: WorkflowState[];
  selectedUnitId: string;
  onSelectUnit: (unitId: string) => void;
  placeholder?: string;
  className?: string;
  width?: number | string;
}

export const UnitSearchSelector: React.FC<UnitSearchSelectorProps> = ({
  workflows,
  selectedUnitId,
  onSelectUnit,
  placeholder = 'Search unit ID…',
  width = 240,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered unit options
  const filteredUnits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) => {
        const context = w.context || {};
        const searchable = [
          w.subject_id,
          w.workflow_id,
          w.status,
          context.sku,
          context.order_id,
          context.fnsku,
          context.po_number,
          context.asin,
          context.route,
        ];
        return searchable.some((value) => String(value || '').toLowerCase().includes(q));
      }
    );
  }, [workflows, query]);

  const handleSelect = (unitId: string) => {
    onSelectUnit(unitId);
    setQuery(unitId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block" style={{ width }}>
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-text"
        style={{ background: 'var(--bg-surface)', borderColor: isOpen ? 'var(--border-active)' : 'var(--border)' }}
        onClick={() => setIsOpen(true)}
      >
        <Search size={13} className="text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          value={isOpen ? query : selectedUnitId}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
            if (e.key === 'Enter' && filteredUnits[0]) handleSelect(filteredUnits[0].subject_id);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none font-syne"
          role="combobox"
          aria-label={placeholder}
          aria-expanded={isOpen}
          aria-controls="unit-search-results"
          aria-autocomplete="list"
        />
        {query && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              onSelectUnit('');
              setIsOpen(true);
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
            aria-label="Clear unit search"
          >
            <X size={12} />
          </button>
        )}
        <ChevronDown size={12} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div
          id="unit-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto rounded-xl border shadow-2xl py-1 text-xs no-scrollbar fade-in"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="px-3 py-1 text-[10px] uppercase font-poppins font-semibold text-[var(--text-muted)] border-b border-[var(--border)]">
            {filteredUnits.length} units found
          </div>
          {filteredUnits.length === 0 ? (
            <div className="px-3 py-3 text-center text-[var(--text-muted)] font-poppins text-xs">
              No units match "{query}"
            </div>
          ) : (
            filteredUnits.map((w) => {
              const isSelected = w.subject_id === selectedUnitId;
              const isCompleted = w.status === 'COMPLETED';
              const isHalted = w.status === 'HALTED' || w.status === 'DEGRADED';
              return (
                <button
                  key={w.subject_id}
                  type="button"
                  onClick={() => handleSelect(w.subject_id)}
                  role="option"
                  aria-selected={isSelected}
                  className="w-full text-left px-3 py-2 flex items-center justify-between transition-colors hover:bg-[var(--bg-raised)]"
                  style={{
                    color: isSelected ? 'var(--accent-strong)' : 'var(--text-primary)',
                    background: isSelected ? 'var(--accent-soft)' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-syne font-bold">{w.subject_id}</span>
                    {w.context?.sku && (
                      <span className="truncate text-[var(--text-muted)]">{String(w.context.sku)}</span>
                    )}
                    <span
                      className={`badge text-[9px] px-1.5 py-0.2 ${
                        isCompleted ? 'badge-pass' : isHalted ? 'badge-fail' : 'badge-uncertain'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                  {isSelected && <Check size={12} className="text-blue-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
