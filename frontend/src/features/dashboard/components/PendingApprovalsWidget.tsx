"use client";

import React, { useState } from "react";
import { Check, X, FileCheck, CheckSquare, Square } from "lucide-react";

interface ApprovalItem {
  id: string;
  requester: string;
  action: string;
  type: string;
}

export const PendingApprovalsWidget: React.FC = () => {
  const [items, setItems] = useState<ApprovalItem[]>([
    { id: "1", requester: "Sarah Jenkins", action: "Deploy sprint v1.2 to Production", type: "Deployment Release" },
    { id: "2", requester: "David Kim", action: "Override DB replication pool limits", type: "DB Schema Config" },
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleResolveSingle = (id: string, approved: boolean) => {
    setItems(items.filter((item) => item.id !== id));
    setSelectedIds(selectedIds.filter((x) => x !== id));
  };

  const handleBulkAction = (approved: boolean) => {
    setItems(items.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Pending Approvals
        </span>
        <FileCheck className="h-4 w-4 text-indigo-400" />
      </div>

      {/* Bulk actions block */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-indigo-950/20 border border-indigo-900/40 p-2.5 rounded-lg text-xs transition duration-75">
          <span className="text-[10px] font-semibold text-indigo-400">
            {selectedIds.length} items selected
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => handleBulkAction(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] px-2.5 py-1 rounded transition"
            >
              Approve All
            </button>
            <button
              onClick={() => handleBulkAction(false)}
              className="bg-card border hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] px-2.5 py-1 rounded transition"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground space-y-0.5">
            <p>No approvals pending.</p>
            <p className="text-[10px] text-muted-foreground/60">Everything has been reviewed.</p>
          </div>
        ) : (
          items.map((item) => {
            const isChecked = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-muted/20 border border-border text-xs flex justify-between gap-3 hover:bg-muted/40 transition"
              >
                <div className="flex items-start gap-2.5 overflow-hidden">
                  {/* Select Checkbox */}
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="mt-0.5 text-muted-foreground hover:text-indigo-400 focus:outline-none shrink-0"
                  >
                    {isChecked ? (
                      <CheckSquare className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  <div className="space-y-1 overflow-hidden leading-tight">
                    <span className="text-[9px] bg-indigo-950/20 text-indigo-400 border border-indigo-900/50 font-semibold px-1.5 py-0.25 rounded">
                      {item.type}
                    </span>
                    <p className="font-medium text-foreground truncate">{item.action}</p>
                    <p className="text-[10px] text-muted-foreground">Req by: {item.requester}</p>
                  </div>
                </div>

                {/* Single actions */}
                <div className="flex gap-1 items-center shrink-0">
                  <button
                    onClick={() => handleResolveSingle(item.id, true)}
                    className="h-6 w-6 rounded bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition focus:outline-none"
                    aria-label="Approve"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleResolveSingle(item.id, false)}
                    className="h-6 w-6 rounded bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition focus:outline-none"
                    aria-label="Reject"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default PendingApprovalsWidget;
