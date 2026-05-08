// Controller-ul = stratul subțire dintre HTTP și business logic.
// NU pune logică aici. Doar:
//   1. citește din req
//   2. cheamă serviciul
//   3. trimite răspuns sau next(err)

import * as authService from '../services/auth.service.js';

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result); // 201 Created
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result); // 200 OK implicit
  } catch (err) {
    next(err);
  }
}
