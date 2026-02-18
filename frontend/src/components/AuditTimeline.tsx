"use client";
import React, { useEffect, useState } from "react";
import { History, Brain, FileEdit, AlertTriangle } from "lucide-react";
import { auditApi } from "@/lib/api";

interface AuditTimelineProps {
  limit?: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  financial_record_created: <FileEdit size={14} className="text-emerald-600" />,
  financial_record_updated: <FileEdit size={14} className="text-blue-600" />,
  financial_record_deleted: <AlertTriangle size={14} className="text-red-600" />,
  nlp_query_executed: <Brain size={14} className="text-purple-600" />,
  assumption_changed: <AlertTriangle size={14} className="text-amber-600" />,
  simulation_run: <History size={14} className="text-slate-600" />,
};

export default function AuditTimeline({ limit = 20 }: AuditTimelineProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi
      .getLogs(limit)
      .then((res) => setLogs(res.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        <History size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay actividad registrada aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <History size={18} className="text-slate-600" />
        <h3 className="font-bold text-slate-800 text-sm">
          Registro de Sesión (Audit Log)
        </h3>
      </div>

      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all"
        >
          <div className="mt-0.5">
            {ACTION_ICONS[log.action_type] || (
              <History size={14} className="text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">
              {log.action_description}
            </p>
            {log.nlp_raw_input && (
              <p className="text-xs text-purple-500 mt-1 italic">
                "{log.nlp_raw_input}"
              </p>
            )}
            {log.field_changed && (
              <p className="text-xs text-slate-400 mt-1">
                {log.field_changed}: {log.previous_value} &rarr;{" "}
                {log.new_value}
              </p>
            )}
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            {new Date(log.created_at).toLocaleString("es-PA", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
