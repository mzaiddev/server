import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export function signToken(payload: object) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as SignOptions);
}
