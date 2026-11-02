// POST { action: "add" | "remove", email } -> the team owner gives or takes back a seat.
import { send, readBody, siteOrigin, normEmail, validEmail } from "../lib/http.js";
import { saveTeam, seatsUsed, summary, access } from "../lib/billing.js";
import { redis } from "../lib/redis.js";
import { requireSeat } from "../lib/guard.js";
import { createLoginLink, endSession } from "../lib/session.js";
import { sendSignInEmail } from "../lib/mail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { code: "method_not_allowed" });
  const a = await requireSeat(req);
  if (!a.ok) return send(res, a.status, { code: a.code });
  if (!a.isOwner) return send(res, 403, { code: "owner_only" });

  const body = await readBody(req);
  const email = normEmail(body.email);
  if (!validEmail(email)) return send(res, 400, { code: "bad_email" });
  const { team, customerId } = a;

  if (body.action === "add") {
    if (email === team.owner || team.members.includes(email)) return send(res, 200, summary(a));
    if (seatsUsed(team) >= a.sub.seats) return send(res, 409, { code: "no_free_seats" });
    const otherTeam = await redis("GET", `member:${email}`);
    if (otherTeam && otherTeam !== customerId) {
      const other = await access(email);
      if (other.ok) return send(res, 409, { code: "in_other_team" });
    }
    team.members.push(email);
    await saveTeam(customerId, team);
    await redis("SET", `member:${email}`, customerId);
    let emailed = true;
    try { await sendSignInEmail(email, await createLoginLink(email, siteOrigin(req)), { invitedBy: team.owner }); }
    catch { emailed = false; }
    return send(res, 200, { ...summary({ ...a, team }), emailed });
  }

  if (body.action === "remove") {
    if (email === team.owner) return send(res, 400, { code: "cannot_remove_owner" });
    team.members = team.members.filter((m) => m !== email);
    await saveTeam(customerId, team);
    if ((await redis("GET", `member:${email}`)) === customerId) await redis("DEL", `member:${email}`);
    await endSession(email); // signs them out right away
    return send(res, 200, summary({ ...a, team }));
  }

  return send(res, 400, { code: "bad_action" });
}
