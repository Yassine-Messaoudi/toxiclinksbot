import { GuildMember, PermissionFlagsBits } from "discord.js";
import { ROLES } from "../config";

/** Check if a member is staff (has ROLE_STAFF, ROLE_MOD, ROLE_ADMIN, or Administrator perm) */
export function isStaff(member: GuildMember): boolean {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const staffRoles = [ROLES.STAFF, ROLES.MOD, ROLES.ADMIN].filter(Boolean);
  return staffRoles.some((r) => member.roles.cache.has(r));
}

/** Check if a member is an admin */
export function isAdmin(member: GuildMember): boolean {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return ROLES.ADMIN ? member.roles.cache.has(ROLES.ADMIN) : false;
}

/** Check if a member is a moderator or above */
export function isMod(member: GuildMember): boolean {
  if (isAdmin(member)) return true;
  const modRoles = [ROLES.MOD, ROLES.STAFF].filter(Boolean);
  return modRoles.some((r) => member.roles.cache.has(r));
}

/** Check hierarchy: can the actor moderate the target? */
export function canModerate(actor: GuildMember, target: GuildMember): boolean {
  if (target.id === actor.guild.ownerId) return false;
  if (actor.id === actor.guild.ownerId) return true;
  return actor.roles.highest.position > target.roles.highest.position;
}
