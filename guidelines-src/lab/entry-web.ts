import { mount, live } from "./lab";
import { wireAdmin } from "./admin";
/* website build: the same lab, plus the live composition and admin publishing */
(window as any).DTLab = { mount: (root: HTMLElement, logo: string, opts: { api?: string } = {}) => mount(root, logo, { ...opts, wire: wireAdmin }), live };
