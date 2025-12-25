import { redisSub } from "../lib/redisPubSub";
import { broadcast } from "./sseHub";

redisSub.on("message", (channel, message) => {
  // channel: chat:session:<id>
  const sessionId = channel.split(":").slice(-1)[0];
  const payload = JSON.parse(message);

  broadcast(sessionId, payload.type, payload.data);
});
