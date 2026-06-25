import Cookies from "js-cookie";

export const getSidebarState = () => {
  const v = Cookies.get("sidebar_state");
  return v === "true" || v === "expanded";
};

export const setSidebarState = (open: boolean) => {
  Cookies.set("sidebar_state", String(open), {
    expires: 7,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax" as const,
  });
};
