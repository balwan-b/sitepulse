import { Router, type Router as ExpressRouter } from "express";

import { buildDataResponse, buildPaginatedResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import {
  createPunchItem,
  getPunchItem,
  listPunchItems,
  transitionPunchItem,
  updatePunchItem,
} from "../services/punch-items.js";

export const punchItemsRouter: ExpressRouter = Router();

punchItemsRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view punch items");
    const result = await listPunchItems(actor, req.query);
    res
      .status(200)
      .json(buildPaginatedResponse(result.data, result.page, result.limit, result.total));
  } catch (error) {
    next(error);
  }
});

punchItemsRouter.get("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view this punch item");
    const result = await getPunchItem(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

punchItemsRouter.post("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "create punch items");
    const result = await createPunchItem(actor, req.body ?? {});
    res.status(201).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

punchItemsRouter.patch("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "update this punch item");
    const result = await updatePunchItem(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

punchItemsRouter.post("/:id/transition", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "transition this punch item");
    const result = await transitionPunchItem(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});
