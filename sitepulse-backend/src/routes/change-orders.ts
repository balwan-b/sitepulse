import { Router, type Router as ExpressRouter } from "express";

import { buildDataResponse, buildPaginatedResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import {
  approveChangeOrder,
  createChangeOrder,
  getChangeOrder,
  listChangeOrders,
  rejectChangeOrder,
  submitChangeOrder,
  updateChangeOrder,
} from "../services/change-orders.js";

export const changeOrdersRouter: ExpressRouter = Router();

changeOrdersRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view change orders");
    const result = await listChangeOrders(actor, req.query);
    res
      .status(200)
      .json(buildPaginatedResponse(result.data, result.page, result.limit, result.total));
  } catch (error) {
    next(error);
  }
});

changeOrdersRouter.get("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view this change order");
    const result = await getChangeOrder(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

changeOrdersRouter.post("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "create change orders");
    const result = await createChangeOrder(actor, req.body ?? {});
    res.status(201).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

changeOrdersRouter.patch("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "update this change order");
    const result = await updateChangeOrder(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

changeOrdersRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "submit this change order");
    const result = await submitChangeOrder(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

changeOrdersRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "approve this change order");
    const result = await approveChangeOrder(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

changeOrdersRouter.post("/:id/reject", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "reject this change order");
    const result = await rejectChangeOrder(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});
