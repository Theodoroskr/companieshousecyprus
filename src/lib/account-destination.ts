export type AccountDestination = "/admin/orders" | "/account/orders";

export function accountDestination(roles: string[]): AccountDestination {
  return roles.includes("admin") ? "/admin/orders" : "/account/orders";
}