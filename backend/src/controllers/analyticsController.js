const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Format milliseconds into human-readable duration
 */
function formatDuration(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return 'N/A';
  if (ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = (ms / (1000 * 60 * 60)).toFixed(1);
  if (hours < 24) return `${hours}h`;

  const days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  return `${days}d`;
}

/**
 * Build Date Range Filter from Query Params
 */
function getDateRangeFilter(query) {
  const { range = '30d', startDate, endDate } = query;
  const now = new Date();
  let from = null;
  let to = null;

  if (startDate || endDate) {
    if (startDate) from = new Date(startDate);
    if (endDate) {
      to = new Date(endDate);
      to.setHours(23, 59, 59, 999);
    }
  } else {
    switch (range) {
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        from = null;
        break;
    }
  }

  const match = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = from;
    if (to) match.createdAt.$lte = to;
  }

  return { match, from, to, range: startDate || endDate ? 'custom' : range };
}

/**
 * Analytics Controller
 */
class AnalyticsController {
  /**
   * Main Admin Analytics Overview Dashboard
   * GET /api/analytics/dashboard
   * Access: Admin
   */
  async getDashboardAnalytics(req, res, next) {
    try {
      const { match, from, to, range } = getDateRangeFilter(req.query);

      // Execute facet aggregation pipeline on tickets
      const [analyticsData] = await Ticket.aggregate([
        { $match: match },
        {
          $facet: {
            // 1. Status Breakdown
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } },
            ],

            // 2. Priority Breakdown
            byPriority: [
              { $group: { _id: '$priority', count: { $sum: 1 } } },
            ],

            // 3. Category Breakdown
            byCategory: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
            ],

            // 4. Sentiment Breakdown
            bySentiment: [
              { $group: { _id: '$sentiment', count: { $sum: 1 } } },
            ],

            // 5. Mean Time to Resolution (MTTR)
            resolutionTiming: [
              { $match: { resolvedAt: { $ne: null } } },
              {
                $project: {
                  durationMs: { $subtract: ['$resolvedAt', '$createdAt'] },
                },
              },
              {
                $group: {
                  _id: null,
                  avgMs: { $avg: '$durationMs' },
                  count: { $sum: 1 },
                },
              },
            ],

            // 6. First Response Time (FRT)
            firstResponseTiming: [
              { $match: { firstResponseAt: { $ne: null } } },
              {
                $project: {
                  durationMs: { $subtract: ['$firstResponseAt', '$createdAt'] },
                },
              },
              {
                $group: {
                  _id: null,
                  avgMs: { $avg: '$durationMs' },
                  count: { $sum: 1 },
                },
              },
            ],

            // 7. CSAT Distribution
            csatScores: [
              { $match: { 'feedback.rating': { $ne: null, $gte: 1, $lte: 5 } } },
              { $group: { _id: '$feedback.rating', count: { $sum: 1 } } },
            ],
          },
        },
      ]);

      // Calculate totals and status counters
      const statusMap = {
        OPEN: 0,
        ASSIGNED: 0,
        IN_PROGRESS: 0,
        WAITING_FOR_CUSTOMER: 0,
        RESOLVED: 0,
        CLOSED: 0,
      };

      let totalTickets = 0;
      (analyticsData.byStatus || []).forEach((item) => {
        if (statusMap[item._id] !== undefined) {
          statusMap[item._id] = item.count;
        }
        totalTickets += item.count;
      });

      const openTickets = statusMap.OPEN;
      const inProgressTickets = statusMap.ASSIGNED + statusMap.IN_PROGRESS + statusMap.WAITING_FOR_CUSTOMER;
      const resolvedTickets = statusMap.RESOLVED;
      const closedTickets = statusMap.CLOSED;
      const completedTickets = resolvedTickets + closedTickets;
      const resolutionRate = totalTickets > 0 ? Number(((completedTickets / totalTickets) * 100).toFixed(1)) : 0;

      // Unassigned ticket count in current filter
      const unassignedCount = await Ticket.countDocuments({
        ...match,
        assignedAgent: null,
        status: 'OPEN',
      });

      // Priority formatting
      const priorityMap = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
      (analyticsData.byPriority || []).forEach((item) => {
        if (priorityMap[item._id] !== undefined) {
          priorityMap[item._id] = item.count;
        }
      });

      // Category formatting
      const categoryMap = { general: 0, account: 0, billing: 0, technical: 0, feature_request: 0 };
      (analyticsData.byCategory || []).forEach((item) => {
        if (categoryMap[item._id] !== undefined) {
          categoryMap[item._id] = item.count;
        }
      });

      // Timing calculations
      const resTimingItem = analyticsData.resolutionTiming?.[0];
      const avgResolutionMs = resTimingItem ? Math.round(resTimingItem.avgMs) : null;

      const frtTimingItem = analyticsData.firstResponseTiming?.[0];
      const avgFrtMs = frtTimingItem ? Math.round(frtTimingItem.avgMs) : null;

      // CSAT metrics
      const csatDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let csatSum = 0;
      let csatTotalResponses = 0;
      let csatSatisfiedCount = 0; // 4 or 5 stars

      (analyticsData.csatScores || []).forEach((item) => {
        const rating = item._id;
        const count = item.count;
        if (csatDistribution[rating] !== undefined) {
          csatDistribution[rating] = count;
          csatSum += rating * count;
          csatTotalResponses += count;
          if (rating >= 4) {
            csatSatisfiedCount += count;
          }
        }
      });

      const averageCsat = csatTotalResponses > 0 ? Number((csatSum / csatTotalResponses).toFixed(2)) : null;
      const csatSatisfactionPercentage =
        csatTotalResponses > 0 ? Number(((csatSatisfiedCount / csatTotalResponses) * 100).toFixed(1)) : null;

      // Construct Response Payload
      const response = {
        timeRange: {
          range,
          from: from ? from.toISOString() : null,
          to: to ? to.toISOString() : null,
        },
        overview: {
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          closed: closedTickets,
          unassigned: unassignedCount,
          resolutionRate,
        },
        timing: {
          avgFirstResponseTime: formatDuration(avgFrtMs),
          avgFirstResponseMs: avgFrtMs,
          firstResponseCount: frtTimingItem?.count || 0,
          avgResolutionTime: formatDuration(avgResolutionMs),
          avgResolutionMs: avgResolutionMs,
          resolvedCount: resTimingItem?.count || 0,
        },
        breakdowns: {
          byStatus: Object.entries(statusMap).map(([status, count]) => ({
            status,
            count,
            percentage: totalTickets > 0 ? Number(((count / totalTickets) * 100).toFixed(1)) : 0,
          })),
          byPriority: Object.entries(priorityMap).map(([priority, count]) => ({
            priority,
            count,
            percentage: totalTickets > 0 ? Number(((count / totalTickets) * 100).toFixed(1)) : 0,
          })),
          byCategory: Object.entries(categoryMap).map(([category, count]) => ({
            category,
            count,
            percentage: totalTickets > 0 ? Number(((count / totalTickets) * 100).toFixed(1)) : 0,
          })),
        },
        csat: {
          averageRating: averageCsat,
          satisfactionPercentage: csatSatisfactionPercentage,
          totalResponses: csatTotalResponses,
          distribution: csatDistribution,
        },
      };

      return ApiResponse.success(res, response, 'Analytics dashboard metrics retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Agent Workload Analytics
   * GET /api/analytics/agents
   * Access: Admin
   */
  async getAgentWorkloadAnalytics(req, res, next) {
    try {
      const { match } = getDateRangeFilter(req.query);

      // Aggregate ticket assignments per agent
      const agentAggregation = await Ticket.aggregate([
        { $match: { ...match, assignedAgent: { $ne: null } } },
        {
          $group: {
            _id: '$assignedAgent',
            totalAssigned: { $sum: 1 },
            activeCount: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER']] },
                  1,
                  0,
                ],
              },
            },
            resolvedCount: {
              $sum: {
                $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0],
              },
            },
            avgResolutionMs: {
              $avg: {
                $cond: [
                  { $and: ['$resolvedAt', { $in: ['$status', ['RESOLVED', 'CLOSED']] }] },
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  null,
                ],
              },
            },
            avgCsatRating: {
              $avg: '$feedback.rating',
            },
            csatResponses: {
              $sum: {
                $cond: [{ $ne: ['$feedback.rating', null] }, 1, 0],
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agent',
          },
        },
        { $unwind: '$agent' },
        {
          $project: {
            _id: 1,
            name: '$agent.name',
            email: '$agent.email',
            department: '$agent.department',
            isActive: '$agent.isActive',
            totalAssigned: 1,
            activeCount: 1,
            resolvedCount: 1,
            avgResolutionMs: 1,
            avgCsatRating: 1,
            csatResponses: 1,
          },
        },
        { $sort: { activeCount: -1, totalAssigned: -1 } },
      ]);

      // Unassigned tickets count
      const unassignedCount = await Ticket.countDocuments({
        ...match,
        assignedAgent: null,
        status: 'OPEN',
      });

      const formattedAgents = agentAggregation.map((a) => ({
        agentId: a._id,
        name: a.name,
        email: a.email,
        department: a.department || 'Support',
        isActive: a.isActive,
        activeTickets: a.activeCount,
        resolvedTickets: a.resolvedCount,
        totalAssigned: a.totalAssigned,
        avgResolutionTime: formatDuration(a.avgResolutionMs),
        csatScore: a.csatResponses > 0 ? Number(a.avgCsatRating.toFixed(2)) : null,
        csatResponses: a.csatResponses,
      }));

      return ApiResponse.success(
        res,
        {
          agents: formattedAgents,
          unassignedOpenTickets: unassignedCount,
          totalAssignedTickets: formattedAgents.reduce((acc, curr) => acc + curr.totalAssigned, 0),
        },
        'Agent workload statistics retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Detailed CSAT Reviews & Distribution
   * GET /api/analytics/csat
   * Access: Admin
   */
  async getCsatAnalytics(req, res, next) {
    try {
      const { match } = getDateRangeFilter(req.query);

      // Fetch recent customer feedback reviews
      const recentFeedbacks = await Ticket.find({
        ...match,
        'feedback.rating': { $ne: null },
      })
        .select('ticketId title category customer assignedAgent feedback resolvedAt')
        .populate('customer', 'name email department')
        .populate('assignedAgent', 'name email')
        .sort({ 'feedback.submittedAt': -1 })
        .limit(20)
        .lean();

      // Distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      let total = 0;
      let satisfied = 0;

      const allFeedbackTickets = await Ticket.find({
        ...match,
        'feedback.rating': { $ne: null },
      })
        .select('feedback.rating')
        .lean();

      allFeedbackTickets.forEach((t) => {
        const r = t.feedback?.rating;
        if (distribution[r] !== undefined) {
          distribution[r]++;
          sum += r;
          total++;
          if (r >= 4) satisfied++;
        }
      });

      return ApiResponse.success(
        res,
        {
          summary: {
            averageRating: total > 0 ? Number((sum / total).toFixed(2)) : null,
            satisfactionPercentage: total > 0 ? Number(((satisfied / total) * 100).toFixed(1)) : null,
            totalReviews: total,
            distribution,
          },
          recentReviews: recentFeedbacks.map((t) => ({
            ticketId: t.ticketId,
            title: t.title,
            category: t.category,
            rating: t.feedback.rating,
            comment: t.feedback.comment || '',
            submittedAt: t.feedback.submittedAt,
            customerName: t.customer?.name || 'Customer',
            customerEmail: t.customer?.email,
            agentName: t.assignedAgent?.name || 'Unassigned',
          })),
        },
        'Customer satisfaction analytics retrieved'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
