import { resolve } from "node:path";
import { createLocalApiServer } from "./server.js";

const projectRoot = resolve(
  process.env.BRIDGE_PROJECT_ROOT ?? process.cwd(),
);

const api = await createLocalApiServer({ projectRoot });
const info = await api.listen();
console.log(
  JSON.stringify(
    {
      ok: true,
      service: "context-bridge-local-api",
      url: `http://${info.host}:${info.port}`,
      project_root: projectRoot,
      token_file: `${projectRoot}/.agent-bridge/.bridge-token`,
      hint: "Authorization: Bearer <token>",
    },
    null,
    2,
  ),
);
