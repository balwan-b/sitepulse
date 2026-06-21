import { Router, type Router as ExpressRouter } from "express";

import { buildDataResponse, buildPaginatedResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import { getUser, listUsers } from "../services/users.js";

export const usersRouter: ExpressRouter = Router();

usersRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view SitePulse users");
    const result = await listUsers(actor, req.query);
    res
      .status(200)
      .json(buildPaginatedResponse(result.data, result.page, result.limit, result.total));
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view this SitePulse user");
    const result = await getUser(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});
