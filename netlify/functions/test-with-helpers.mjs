import { successResponse } from '../utils/response-helpers.mjs';

export default async function handler(request, context) {
  return successResponse({ test: 'with helpers' });
}
