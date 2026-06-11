import { Router, type Router as ExpressRouter } from "express";

import { buildDataResponse, buildPaginatedResponse } from "../lib/api-response.js";
import { requireAuthenticated } from "../lib/authorization.js";
import {
  createCrewAssignment,
  getCrewAssignment,
  listCrewAssignments,
  updateCrewAssignment,
} from "../services/crew-assignments.js";

export const crewAssignmentsRouter: ExpressRouter = Router();

crewAssignmentsRouter.get("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view crew assignments");
    const result = await listCrewAssignments(actor, req.query);
    res
      .status(200)
      .json(buildPaginatedResponse(result.data, result.page, result.limit, result.total));
  } catch (error) {
    next(error);
  }
});

crewAssignmentsRouter.get("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "view this crew assignment");
    const result = await getCrewAssignment(actor, req.params.id);
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

crewAssignmentsRouter.post("/", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "create crew assignments");
    const result = await createCrewAssignment(actor, req.body ?? {});
    res.status(201).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});

crewAssignmentsRouter.patch("/:id", async (req, res, next) => {
  try {
    const actor = requireAuthenticated(req, "update this crew assignment");
    const result = await updateCrewAssignment(actor, req.params.id, req.body ?? {});
    res.status(200).json(buildDataResponse(result));
  } catch (error) {
    next(error);
  }
});
