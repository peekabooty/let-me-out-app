import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().required(),
  SMTP_SECURE: Joi.boolean().required(),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_FROM: Joi.string().required(),
  CORS_ORIGIN: Joi.string().required(),
  APP_PORT: Joi.number().port().optional(),
  COOKIE_SAMESITE: Joi.string().valid('none', 'strict').required(),
  COOKIE_SECURE: Joi.boolean().required(),
}).unknown(true);
