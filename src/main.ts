import { bootstrap } from "./bootstrap";

import "./styles/index.css";

void bootstrap().catch((error) => {
  console.error("Failed to bootstrap game:", error);
});
