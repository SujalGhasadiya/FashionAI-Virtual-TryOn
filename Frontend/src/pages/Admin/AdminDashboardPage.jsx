import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAdmin, useNotification } from '@/hooks';
import {
  BarChart3,
  Users,
  CreditCard,
  TrendingUp,
  LogOut,
  Wand2,
  IndianRupee,
  ChevronRight,
  Settings,
  Shirt,
} from 'lucide-react';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const {
    fetchOverview,
    overview,
    isLoading,
    adminLogout,
  } = useAdmin();
  const { showSuccess, showError } = useNotification();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [chartFilter, setChartFilter] = useState('monthly'); // 'monthly' as default

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleLogout = () => {
    adminLogout();
    navigate('/login');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const stats = [
    {
      label: 'Total Users',
      value: overview?.total_users || 0,
      icon: Users,
      color: 'text-sage',
      bg: 'bg-sage/10',
    },
    {
      label: 'Try-ons',
      value: overview?.total_tryons || 0,
      icon: Wand2,
      color: 'text-powder-blue',
      bg: 'bg-powder-blue/10',
    },
    {
      label: 'Recommendations',
      value: overview?.total_recommendations || 0,
      icon: TrendingUp,
      color: 'text-rose-dust',
      bg: 'bg-rose-dust/10',
    },
    {
      label: 'Total Revenue',
      value: `₹${(overview?.total_revenue || 0).toLocaleString()}`,
      icon: IndianRupee,
      color: 'text-gold-accent',
      bg: 'bg-gold-accent/10',
    },
    {
      label: 'Wardrobe Items',
      value: overview?.total_wardrobe_items || 0,
      icon: Shirt,
      color: 'text-charcoal',
      bg: 'bg-warm-gray/10',
    },
  ];

  const revenueStats = [
    { label: 'Monthly Revenue', value: overview?.monthly_revenue || 0 },
    { label: 'Yearly Revenue', value: overview?.yearly_revenue || 0 },
  ];

  const chartData = chartFilter === 'monthly' ? overview?.monthly_chart || [] : overview?.yearly_chart || [];

  return (
    <div className="min-h-screen bg-cream pb-12">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream border-b border-warm-gray/20">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-sage flex items-center justify-center">
                <BarChart3 size={20} className="text-cream" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-charcoal">Admin Dashboard</h1>
                <p className="text-xs text-warm-taupe">FashionAI Administration Overview</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/subscriptions')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-warm-gray/30 rounded-lg text-sm font-bold text-charcoal hover:bg-ivory transition-all"
              >
                <Settings size={16} />
                Manage Plans
              </button>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-2 hover:bg-rose-dust/10 rounded-lg transition-colors text-rose-dust"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="card-luxury"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-warm-taupe text-[10px] sm:text-xs font-black uppercase tracking-widest break-words leading-tight">{stat.label}</p>
                      <p className="text-2xl sm:text-3xl font-bold text-charcoal mt-2 truncate">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                      <Icon size={24} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Global Chart Filters */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <h2 className="text-xl font-bold text-charcoal">Analytics Overview</h2>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-warm-gray/20">
              <button 
                onClick={() => setChartFilter('monthly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  chartFilter === 'monthly' ? 'bg-terracotta text-white shadow-md' : 'text-warm-taupe hover:bg-warm-gray/10'
                }`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setChartFilter('yearly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  chartFilter === 'yearly' ? 'bg-terracotta text-white shadow-md' : 'text-warm-taupe hover:bg-warm-gray/10'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Revenue Chart */}
            <motion.div variants={itemVariants} className="card-luxury overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-charcoal">
                    Revenue Growth <span className="text-sm font-normal text-warm-taupe ml-2">({chartFilter === 'monthly' ? 'Last 12 Months' : 'Last 5 Years'})</span>
                  </h2>
                </div>
                <div className="flex gap-4">
                  {revenueStats.map((rs, i) => (
                    <div key={i} className="text-right border-l border-warm-gray/20 pl-4">
                      <p className="text-[10px] text-warm-taupe font-bold uppercase">{rs.label}</p>
                      <p className="text-lg font-bold text-gold-accent">₹{rs.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        padding: '12px'
                      }}
                      formatter={(val) => [`₹${val}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={chartFilter === 'monthly' ? 32 : 60}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === chartData.length - 1 ? '#c65d2c' : '#8A9A5B'} 
                          fillOpacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Subscription Distribution */}
            <motion.div variants={itemVariants} className="card-luxury">
              <h2 className="text-lg font-bold text-charcoal mb-6">Subscription Plans</h2>
              {(() => {
                const distData = overview?.subscription_distribution || [];
                const PLAN_COLORS = ['#c65d2c', '#8A9A5B', '#C5A059', '#7a8ba3', '#947585'];
                const total = distData.reduce((sum, d) => sum + (d.value || 0), 0);
                const isSingle = distData.length <= 1;
                return (
                  <div>
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={105}
                            paddingAngle={isSingle ? 0 : 4}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {distData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                            formatter={(val, name) => [`${val} users (${total > 0 ? Math.round((val/total)*100) : 0}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {distData.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3 px-2">
                        {distData.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PLAN_COLORS[index % PLAN_COLORS.length] }} />
                            <span className="text-xs font-bold text-charcoal uppercase">{entry.name}</span>
                            <span className="text-xs text-warm-taupe">
                              {entry.value} ({total > 0 ? Math.round((entry.value/total)*100) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-warm-taupe mt-4">No subscription data yet</p>
                    )}
                  </div>
                );
              })()}
            </motion.div>

            {/* Usage Trends */}
            <motion.div variants={itemVariants} className="card-luxury">
              <h2 className="text-lg font-bold text-charcoal mb-6">
                Platform Usage <span className="text-sm font-normal text-warm-taupe ml-2">({chartFilter === 'monthly' ? 'Last 12 Months' : 'Last 5 Years'})</span>
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="tryons" name="Try-ons" stroke="#8A9A5B" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="recommendations" name="Recommendations" stroke="#C5A059" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Wardrobe Trends */}
            <motion.div variants={itemVariants} className="card-luxury lg:col-span-2">
              <h2 className="text-lg font-bold text-charcoal mb-6">
                Wardrobe Uploads <span className="text-sm font-normal text-warm-taupe ml-2">({chartFilter === 'monthly' ? 'Last 12 Months' : 'Last 5 Years'})</span>
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="wardrobe" name="Uploads" fill="#6B7280" radius={[4, 4, 0, 0]} barSize={chartFilter === 'monthly' ? 24 : 40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Admin Sign Out"
        message="Are you sure you want to log out from the administration panel?"
        confirmText="Sign Out"
        type="danger"
      />
    </div>
  );
}
