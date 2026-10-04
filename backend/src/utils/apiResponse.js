/**
 * Standardized API Response Envelope
 */
class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
    const payload = {
      success: true,
      message,
      data,
    };

    if (meta) {
      payload.meta = meta;
    }

    return res.status(statusCode).json(payload);
  }

  static error(res, message = 'An error occurred', statusCode = 500, details = null, code = null) {
    const payload = {
      success: false,
      error: {
        message,
        code: code || `HTTP_${statusCode}`,
      }
    };

    if (details) {
      payload.error.details = details;
    }

    return res.status(statusCode).json(payload);
  }

  static paginated(res, items = [], page = 1, limit = 10, total = 0, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data: items,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      }
    });
  }
}

module.exports = ApiResponse;
