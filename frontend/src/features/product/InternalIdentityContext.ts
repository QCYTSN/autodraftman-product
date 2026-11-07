import { createContext } from "react";
import type { CurrentIdentity } from "../../api";

// undefined means the ordinary public/local application; null is an internal guest.
export const InternalIdentityContext = createContext<CurrentIdentity | null | undefined>(undefined);
