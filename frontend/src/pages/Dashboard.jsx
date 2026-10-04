import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  User, 
  LogOut, 
  Key, 
  Bot, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Loader2, 
  Lock, 
  RefreshCw,
  Users,
  Ticket as TicketIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  Terminal,
  BookOpen,
  BarChart3
} from 'lucide-react';
import api from '../config/api';
import ProfileModal from '../components/ProfileModal';
import NotificationBell from '../components/NotificationBell';
import CustomerPortal from '../components/portals/CustomerPortal';
import AgentPortal from '../components/portals/AgentPortal';
import AdminPortal from '../components/portals/AdminPortal';

export default function Dashboard() {
  const { user, logout, quickLogin } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [loadingTest, setLoadingTest] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  const runRbacTest = async (testKey, endpoint) => {
    setLoadingTest(testKey);
    try {
      const res = await api.get(endpoint);
      setTestResults((prev) => ({
        ...prev,
        [testKey]: {
          status: 200,
          success: true,
          message: res.message || res.data?.message || 'Access Allowed',
        },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [testKey]: {
          status: err.code === 'FORBIDDEN_ROLE' ? 403 : 401,
          success: false,
          message: err.message || 'Access Forbidden',
        },
      }));
    } finally {
      setLoadingTest(null);
    }
  };

  const testEndpoints = [
    {
      key: 'public',
      name: 'Public Endpoint',
      path: '/test/public',
      requiredRole: 'Any (Unauthenticated/Public)',
      description: 'Open to everyone without token.',
    },
    {
      key: 'protected',
      name: 'Protected Endpoint',
      path: '/test/protected',
      requiredRole: 'customer, agent, admin',
      description: 'Requires any valid JWT bearer token.',
    },
    {
      key: 'agentOnly',
      name: 'Agent Workspace Endpoint',
      path: '/test/agent-only',
      requiredRole: 'agent, admin',
      description: 'Restricted to Support Agents and Administrators.',
    },
    {
      key: 'adminOnly',
      name: 'Admin Command Endpoint',
      path: '/test/admin-only',
      requiredRole: 'admin',
      description: 'Strictly restricted to System Administrators.',
    },
  ];

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'agent':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">AI Support & Ops</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Phase 6 Messaging & Notifications
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />

            <Link
              to="/tickets"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <TicketIcon className="h-3.5 w-3.5 text-brand-400" />
              <span>Tickets</span>
            </Link>

            <Link
              to="/knowledge"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span>Knowledge Base</span>
            </Link>

            {user?.role === 'admin' && (
              <>
                <Link
                  to="/admin/analytics"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-sm transition"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Analytics</span>
                </Link>
                <Link
                  to="/admin/users"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Users & Agents</span>
                </Link>
              </>
            )}

            <button
              onClick={() => setProfileOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <User className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Profile</span>
            </button>

            <div className="flex items-center space-x-2 pl-1 pr-1">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${getRoleBadgeClass(user?.role)}`}>
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 transition"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* User Identity Banner with Role Switcher */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700/80 p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center space-x-5">
            <div className="h-14 w-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 text-2xl font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-extrabold text-white">{user?.name}</h1>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border uppercase ${getRoleBadgeClass(user?.role)}`}>
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {user?.email} &bull; Department: <span className="text-slate-300 font-medium">{user?.department}</span>
              </p>
            </div>
          </div>

          {/* Quick Role Switcher Bar */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-700/60 self-stretch md:self-auto justify-center">
            <span className="text-xs text-slate-400 font-medium px-2">Role Switcher:</span>
            <button
              onClick={() => quickLogin('admin')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${user?.role === 'admin' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Switch to Admin (admin@platform.com)"
            >
              Admin
            </button>
            <button
              onClick={() => quickLogin('agent')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${user?.role === 'agent' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Switch to Agent (agent@platform.com)"
            >
              Agent
            </button>
            <button
              onClick={() => quickLogin('customer')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${user?.role === 'customer' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title="Return to customer account"
            >
              {(() => {
                try {
                  const saved = localStorage.getItem('savedCustomerSession');
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    return `Customer (${parsed.user.name.split(' ')[0]})`;
                  }
                } catch {
                  // Fallback
                }
                return 'Customer';
              })()}
            </button>
          </div>
        </div>

        {/* Dedicated Role-Driven Portal View */}
        {user?.role === 'customer' && <CustomerPortal />}
        {user?.role === 'agent' && <AgentPortal />}
        {user?.role === 'admin' && <AdminPortal />}

        {/* Developer Diagnostics & RBAC Matrix Accordion */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShowDevPanel(!showDevPanel)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center space-x-3">
              <Terminal className="h-4 w-4 text-brand-400" />
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Developer Diagnostics: Live RBAC Matrix & Token Inspection
                </span>
                <span className="ml-2 text-[11px] text-slate-400">
                  {showDevPanel ? 'Click to hide verification panel' : 'Click to run real-time endpoint RBAC tests'}
                </span>
              </div>
            </div>
            {showDevPanel ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showDevPanel && (
            <div className="p-6 border-t border-slate-700/60 space-y-6">
              {/* Live RBAC Permission Verification Matrix */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center space-x-2">
                      <ShieldCheck className="h-4 w-4 text-brand-400" />
                      <span>Live RBAC Authorization Matrix</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Test the backend role authorization middleware in real time for session: <span className="text-brand-300 font-semibold uppercase">{user?.role}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      testEndpoints.forEach(e => runRbacTest(e.key, e.path));
                    }}
                    className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-brand-600 hover:bg-brand-500 transition shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Run All RBAC Tests</span>
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {testEndpoints.map((test) => {
                    const result = testResults[test.key];
                    const isLoading = loadingTest === test.key;

                    return (
                      <div
                        key={test.key}
                        className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-white">{test.name}</h3>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {test.path}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{test.description}</p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Allowed: <span className="text-slate-300 font-semibold">{test.requiredRole}</span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <button
                            onClick={() => runRbacTest(test.key, test.path)}
                            disabled={isLoading}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3 text-brand-400" />
                            )}
                            <span>Test</span>
                          </button>

                          {result && (
                            <div className="flex items-center space-x-2 text-xs">
                              {result.success ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>200 Allowed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold text-[11px]">
                                  <XCircle className="h-3 w-3" />
                                  <span>{result.status} Forbidden</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security & JWT Session Ledger */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Key className="h-4 w-4 text-indigo-400" />
                  <span className="font-bold text-white text-xs">Active Cryptographic Session Token</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between pb-1 border-b border-slate-800 text-[11px]">
                  <span className="text-slate-500">Subject ID:</span>
                  <span className="text-brand-300">{user?.id || user?._id || 'n/a'}</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between pb-1 border-b border-slate-800 text-[11px]">
                  <span className="text-slate-500">Claimed Role:</span>
                  <span className="text-emerald-400 uppercase font-bold">{user?.role}</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between text-[11px]">
                  <span className="text-slate-500">Bearer Token Header:</span>
                  <span className="text-slate-400 truncate max-w-xs sm:max-w-md">
                    Bearer {localStorage.getItem('token')?.substring(0, 32)}...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Self-Service Modal */}
        <ProfileModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      </main>
    </div>
  );
}
