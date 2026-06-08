import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

interface EvalRow {
  total_score: number;
  created_at: string;
  recording: { id: string; staff_id: string; store_id: string | null } | null;
}

interface Agg {
  sum: number;
  count: number;
}

function avg(a: Agg): number {
  return a.count === 0 ? 0 : a.sum / a.count;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [evalRes, profilesRes, storesRes] = await Promise.all([
    supabase
      .from("evaluations")
      .select("total_score, created_at, recording:recordings(id, staff_id, store_id)")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("profiles").select("id, display_name, store_id"),
    supabase.from("stores").select("id, name"),
  ]);

  const evals = (evalRes.data ?? []) as unknown as EvalRow[];
  const staffName = new Map<string, string>(
    (profilesRes.data ?? []).map((p) => [p.id, p.display_name]),
  );
  const storeName = new Map<string, string>(
    (storesRes.data ?? []).map((s) => [s.id, s.name]),
  );

  const overall: Agg = { sum: 0, count: 0 };
  const byStore = new Map<string, Agg>();
  const byStaff = new Map<string, Agg>();

  for (const e of evals) {
    overall.sum += e.total_score;
    overall.count += 1;
    const storeKey = e.recording?.store_id ?? "__none__";
    const staffKey = e.recording?.staff_id ?? "__none__";
    const st = byStore.get(storeKey) ?? { sum: 0, count: 0 };
    st.sum += e.total_score;
    st.count += 1;
    byStore.set(storeKey, st);
    const sf = byStaff.get(staffKey) ?? { sum: 0, count: 0 };
    sf.sum += e.total_score;
    sf.count += 1;
    byStaff.set(staffKey, sf);
  }

  const storeRows = [...byStore.entries()]
    .map(([id, a]) => ({
      name: id === "__none__" ? "未割り当て" : (storeName.get(id) ?? "（不明）"),
      ...a,
    }))
    .sort((a, b) => avg(b) - avg(a));

  const staffRows = [...byStaff.entries()]
    .map(([id, a]) => ({
      name: id === "__none__" ? "（不明）" : (staffName.get(id) ?? "（不明）"),
      ...a,
    }))
    .sort((a, b) => avg(b) - avg(a));

  const recent = evals.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">
          店舗・スタッフ別の評価状況を確認できます。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-xs text-slate-400">総評価数</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">
            {overall.count}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400">平均スコア</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">
            {overall.count ? formatScore(avg(overall)) : "—"}
          </div>
        </div>
      </div>

      {evals.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">
          まだ評価データがありません。スタッフが録音・評価を行うとここに集計されます。
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              店舗別
            </h2>
            <Table
              rows={storeRows.map((r) => ({
                label: r.name,
                count: r.count,
                avg: formatScore(avg(r)),
              }))}
            />
          </div>
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              スタッフ別
            </h2>
            <Table
              rows={staffRows.map((r) => ({
                label: r.name,
                count: r.count,
                avg: formatScore(avg(r)),
              }))}
            />
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            直近の評価
          </h2>
          <div className="divide-y divide-slate-100">
            {recent.map((e, i) => (
              <Link
                key={i}
                href={e.recording ? `/history/${e.recording.id}` : "#"}
                className="flex items-center justify-between py-2 text-sm hover:text-brand"
              >
                <span className="text-slate-600">
                  {staffName.get(e.recording?.staff_id ?? "") ?? "（不明）"}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {formatDateTime(e.created_at)}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatScore(e.total_score)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Table({
  rows,
}: {
  rows: { label: string; count: number; avg: string }[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">データなし</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-400">
          <th className="pb-2 font-medium">名前</th>
          <th className="pb-2 text-right font-medium">件数</th>
          <th className="pb-2 text-right font-medium">平均</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="py-2 text-slate-700">{r.label}</td>
            <td className="py-2 text-right tabular-nums text-slate-500">
              {r.count}
            </td>
            <td className="py-2 text-right font-semibold tabular-nums">
              {r.avg}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
