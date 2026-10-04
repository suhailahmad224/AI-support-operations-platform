import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  ArrowLeft, 
  RefreshCw, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Star, 
  TrendingUp, 
  Users, 
  Ticket as TicketIcon, 
  Zap, 
  Layers, 
  Activity, 
  Loader2,
  ChevronRight,
  Heart
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

const RANGES = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'all', label: 'All Time' },
];

export default function AdminAnalytics() {
  const { user } = useAuth();

  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [agentWorkload, setAgentWorkload] = useState(null);
  const [csatData, setCsatData] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashRes, agentsRes, csatRes] = await Promise.all([
        analyticsService.getDashboardAnalytics({ range }),
        analyticsService.getAgentWorkload({ range }),
        analyticsService.getCsatAnalytics({ range }),
      ]);

      setDashboardData(dashRes.data);
      setAgentWorkload(agentsRes.data);
      setCsatData(csatRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const overview = dashboardData?.overview;
  const timing = dashboardData?.timing;
  const breakdowns = dashboardData?.breakdowns;
  const csat = csatData?.summary || dashboardData?.csat;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              <h1 className="text-base font-bold text-white tracking-tight">Support Operations Analytics</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Controls Bar: Date Range Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-700/60 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>Reporting Interval:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  range === r.id
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-700/80 border border-slate-700/60'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !dashboardData ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="text-xs text-slate-400">Aggregating support metrics & satisfaction distributions...</p>
          </div>
        ) : (
          <>
            {/* KPI Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Tickets */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Volume
                  </span>
                  <TicketIcon className="h-4 w-4 text-brand-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">{overview?.total || 0}</div>
                <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                  <span className="text-amber-400 font-semibold">{overview?.open || 0} Open</span>
                  <span>&bull;</span>
                  <span className="text-blue-400 font-semibold">{overview?.inProgress || 0} Active</span>
                </div>
              </div>

              {/* Resolution Rate */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Resolution Rate
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {overview?.resolutionRate !== undefined ? `${overview.resolutionRate}%` : '0%'}
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, overview?.resolutionRate || 0)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  {(overview?.resolved || 0) + (overview?.closed || 0)} resolved/closed of {overview?.total || 0}
                </div>
              </div>

              {/* Timing SLAs (FRT & MTTR) */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Mean Resolution (MTTR)
                  </span>
                  <Clock className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {timing?.avgResolutionTime || 'N/A'}
                </div>
                <div className="text-[11px] text-slate-400">
                  First response avg: <span className="text-indigo-300 font-semibold">{timing?.avgFirstResponseTime || 'N/A'}</span>
                </div>
              </div>

              {/* CSAT Score */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Customer Satisfaction
                  </span>
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl font-extrabold text-amber-300">
                    {csat?.averageRating ? csat.averageRating.toFixed(1) : 'N/A'}
                  </span>
                  {csat?.averageRating && <span className="text-xs text-slate-500">/ 5.0</span>}
                </div>
                <div className="text-[11px] text-slate-400">
                  {csat?.satisfactionPercentage !== null && csat?.satisfactionPercentage !== undefined ? (
                    <span className="text-emerald-400 font-semibold">{csat.satisfactionPercentage}% satisfied</span>
                  ) : (
                    <span>No reviews yet</span>
                  )}{' '}
                  ({csat?.totalResponses || csat?.totalReviews || 0} reviews)
                </div>
              </div>
            </div>

            {/* Visual Categorical Breakdown Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Breakdown by Status */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  <span>Tickets by Status</span>
                </h3>
                <div className="space-y-3">
                  {breakdowns?.byStatus?.map((item) => (
                    <div key={item.status} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-300">{item.status.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-slate-400">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown by Priority */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Tickets by Priority</span>
                </h3>
                <div className="space-y-3">
                  {breakdowns?.byPriority?.map((item) => {
                    const color =
                      item.priority === 'URGENT'
                        ? 'bg-rose-500'
                        : item.priority === 'HIGH'
                        ? 'bg-amber-500'
                        : item.priority === 'MEDIUM'
                        ? 'bg-blue-500'
                        : 'bg-emerald-500';
                    return (
                      <div key={item.priority} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-300">{item.priority}</span>
                          <span className="font-mono text-slate-400">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`${color} h-1.5 rounded-full transition-all duration-500`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Breakdown by Category */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-brand-400" />
                  <span>Tickets by Category</span>
                </h3>
                <div className="space-y-3">
                  {breakdowns?.byCategory?.map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-300 uppercase">{item.category}</span>
                        <span className="font-mono text-slate-400">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Customer Satisfaction (CSAT) Deep Dive */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-2">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Customer Satisfaction Score (CSAT) Breakdown
                  </h3>
                </div>
                <div className="text-xs text-slate-400">
                  Total Reviews: <span className="text-white font-bold">{csat?.totalResponses || csat?.totalReviews || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 5-Star Distribution Visual Bars */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase text-slate-400">Rating Distribution</h4>
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = csat?.distribution?.[stars] || 0;
                    const totalReviews = csat?.totalResponses || csat?.totalReviews || 1;
                    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                    return (
                      <div key={stars} className="flex items-center space-x-3 text-xs">
                        <span className="w-12 font-medium text-slate-300 flex items-center space-x-1">
                          <span>{stars}</span>
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        </span>
                        <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              stars >= 4 ? 'bg-amber-400' : stars === 3 ? 'bg-blue-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-14 text-right font-mono text-slate-400">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Recent Customer Reviews Stream */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-slate-400">Recent Customer Reviews</h4>
                  {csatData?.recentReviews && csatData.recentReviews.length > 0 ? (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {csatData.recentReviews.map((rev, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white">{rev.customerName}</span>
                              <span className="font-mono text-slate-500">({rev.ticketId})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < rev.rating
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {rev.comment && (
                            <p className="text-slate-300 italic text-[11px] leading-relaxed">
                              "{rev.comment}"
                            </p>
                          )}
                          <div className="text-[10px] text-slate-500 flex justify-between">
                            <span>Handled by: {rev.agentName}</span>
                            <span>{new Date(rev.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                      No customer satisfaction reviews recorded in this reporting period.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Support Agent Workload & Performance Table */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Support Agent Workload & Performance
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {agentWorkload?.agents?.length || 0} active agents
                </span>
              </div>

              {!agentWorkload?.agents || agentWorkload.agents.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No agent assignment data recorded.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Agent Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Active Queue</th>
                        <th className="py-3 px-4">Resolved Count</th>
                        <th className="py-3 px-4">Total Assigned</th>
                        <th className="py-3 px-4">Avg Resolution (MTTR)</th>
                        <th className="py-3 px-4">CSAT Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {agentWorkload.agents.map((agent) => (
                        <tr key={agent.agentId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-medium text-white">
                            <div>{agent.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{agent.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 uppercase">
                              {agent.department}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-amber-400 font-mono">
                            {agent.activeTickets}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                            {agent.resolvedTickets}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {agent.totalAssigned}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {agent.avgResolutionTime || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4">
                            {agent.csatScore ? (
                              <div className="flex items-center space-x-1 text-amber-300 font-bold font-mono">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span>{agent.csatScore}</span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({agent.csatResponses})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">No ratings</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
