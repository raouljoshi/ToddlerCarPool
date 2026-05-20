import { handleRequest, type WorkerEnv } from "../routes/http";
export { CarpoolInstance } from "./carpool-instance";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return handleRequest(request, env);
  },
};
