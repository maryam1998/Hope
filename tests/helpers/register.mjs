// ثبتِ لودرِ تست — با `node --import ./tests/helpers/register.mjs --test tests/` اجرا می‌شود.
import { register } from "node:module";
register("./stub-loader.mjs", import.meta.url);
