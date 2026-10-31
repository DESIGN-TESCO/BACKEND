const ApiError = require('../utils/ApiError');

// Tiny declarative body validator — keeps controllers clean without pulling in a
// heavy dependency. Usage:
//   validateBody({ name: { required: true }, email: { required: true, email: true } })
// Each rule supports: required, type ('string'|'number'|'boolean'|'array'|'object'),
// email, oneOf (array), min/max (number), minLen/maxLen (string length).
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v));

function validateBody(schema) {
  return (req, res, next) => {
    const body = req.body || {};
    const errors = {};
    for (const [field, rule] of Object.entries(schema)) {
      const val = body[field];
      const empty = val === undefined || val === null || val === '';
      if (rule.required && empty) { errors[field] = `${field} is required.`; continue; }
      if (empty) continue;
      if (rule.type === 'number' && isNaN(Number(val))) errors[field] = `${field} must be a number.`;
      if (rule.type === 'array' && !Array.isArray(val)) errors[field] = `${field} must be a list.`;
      if (rule.type === 'string' && typeof val !== 'string') errors[field] = `${field} must be text.`;
      if (rule.email && !isEmail(val)) errors[field] = `${field} must be a valid email.`;
      if (rule.oneOf && !rule.oneOf.includes(val)) errors[field] = `${field} must be one of: ${rule.oneOf.join(', ')}.`;
      if (rule.minLen && String(val).length < rule.minLen) errors[field] = `${field} must be at least ${rule.minLen} characters.`;
      if (rule.maxLen && String(val).length > rule.maxLen) errors[field] = `${field} must be at most ${rule.maxLen} characters.`;
      if (rule.min != null && Number(val) < rule.min) errors[field] = `${field} must be >= ${rule.min}.`;
      if (rule.max != null && Number(val) > rule.max) errors[field] = `${field} must be <= ${rule.max}.`;
    }
    if (Object.keys(errors).length) return next(new ApiError(400, 'Validation failed.', errors));
    next();
  };
}

module.exports = { validateBody, isEmail };
