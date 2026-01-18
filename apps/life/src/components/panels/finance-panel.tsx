// components/dashboard/panels/finance-panel.tsx
"use client"

import { Wallet, TrendingUp, TrendingDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@daily/ui"
import { PanelWrapper, EmptyState } from "./panel-wrapper"
import type { FinanceRecord } from "@daily/database"

interface FinancePanelProps {
  records: FinanceRecord[]
  loading: boolean
  panelColor: string
  onAdd: () => void
  onEdit: (record: FinanceRecord) => void
  onDelete: (id: string) => void
}

export function FinancePanel({
  records,
  loading,
  panelColor,
  onAdd,
  onEdit,
  onDelete,
}: FinancePanelProps) {
  const totalIncome = records
    .filter(r => r.type === "income")
    .reduce((sum, r) => sum + Number(r.amount), 0)
  const totalExpense = records
    .filter(r => r.type === "expense")
    .reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <PanelWrapper
      title="收支記錄"
      icon={Wallet}
      panelColor={panelColor}
      loading={loading}
      onAdd={onAdd}
      addColor="bg-emerald-600 hover:bg-emerald-700"
    >
      {/* 統計摘要 */}
      <div className="flex gap-4 mb-3 text-sm">
        <span className="text-green-600 flex items-center gap-1">
          <TrendingUp className="w-4 h-4" /> 收入: ${totalIncome}
        </span>
        <span className="text-red-600 flex items-center gap-1">
          <TrendingDown className="w-4 h-4" /> 支出: ${totalExpense}
        </span>
        <span className={totalIncome - totalExpense >= 0 ? "text-green-600" : "text-red-600"}>
          結餘: ${totalIncome - totalExpense}
        </span>
      </div>

      {records.length === 0 ? (
        <EmptyState message="這天沒有收支記錄" />
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                record.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              }`}>
                {record.type === "income" ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{record.category}</p>
                {record.description && <p className="text-sm text-gray-500">{record.description}</p>}
              </div>
              <span className={`font-semibold ${
                record.type === "income" ? "text-green-600" : "text-red-600"
              }`}>
                {record.type === "income" ? "+" : "-"}${record.amount}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(record)}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-500" 
                onClick={() => onDelete(record.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </PanelWrapper>
  )
}
